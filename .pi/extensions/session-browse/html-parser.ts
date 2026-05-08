/**
 * HTML export parser — extracts session data from HTML export files.
 *
 * HTML exports contain a `<script id="session-data" type="application/json">`
 * element with a base64-encoded JSON payload containing the session entries.
 */

import { readFileSync } from "node:fs";
import type { HtmlSessionData, JsonlEntry, ExtractedEntry } from "./types";

const TOOL_RESULT_MAX_CHARS = 2000;

/**
 * Parse an HTML export file and extract session data.
 * Uses indexOf + slice for large file performance (avoid regex backtracking).
 */
export function parseHtmlExport(filePath: string): HtmlSessionData | null {
  let html: string;
  try {
    html = readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  // Locate <script id="session-data" ...>content</script>
  const marker = '<script id="session-data"';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const contentStart = html.indexOf(">", start) + 1;
  if (contentStart === 0) return null; // ">" not found

  const contentEnd = html.indexOf("</script>", contentStart);
  if (contentEnd === -1) return null;

  const base64 = html.slice(contentStart, contentEnd).trim();
  if (!base64) return null;

  try {
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const data = JSON.parse(json) as HtmlSessionData;
    if (!Array.isArray(data.entries)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Convert HTML-parsed session data to ExtractedEntry[] format,
 * matching the same extraction logic as JSONL entries.
 */
export function extractEntriesFromHtml(
  data: HtmlSessionData,
  sessionPath: string,
): ExtractedEntry[] {
  const results: ExtractedEntry[] = [];
  let lineNumber = 0;

  for (const entry of data.entries) {
    lineNumber++;
    const extracted = extractFromHtmlEntry(entry, lineNumber, sessionPath);
    if (extracted) {
      results.push(extracted);
    }
  }

  return results;
}

/** Extract indexable content from a single HTML entry */
function extractFromHtmlEntry(
  entry: JsonlEntry,
  lineNumber: number,
  sessionPath: string,
): ExtractedEntry | null {
  if (entry.type !== "message" || !entry.message) {
    return null;
  }

  const msg = entry.message;
  const role = msg.role;
  const textParts: string[] = [];
  const toolNames: string[] = [];
  let hasText = false;

  for (const block of msg.content || []) {
    switch (block.type) {
      case "text":
        if (block.text) {
          textParts.push(block.text);
          hasText = true;
        }
        break;
      case "thinking":
        // Skip thinking blocks
        break;
      case "toolCall":
        if (block.name) {
          toolNames.push(block.name);
          const argsStr = typeof block.arguments === "string"
            ? block.arguments
            : JSON.stringify(block.arguments ?? "");
          textParts.push(`${block.name}(${argsStr})`);
          hasText = true;
        }
        break;
      case "toolResult":
        if (block.text) {
          textParts.push(block.text.slice(0, TOOL_RESULT_MAX_CHARS));
          hasText = true;
        }
        break;
    }
  }

  return {
    entry_id: entry.id,
    parent_id: entry.parentId ?? null,
    line_number: lineNumber,
    role,
    timestamp: entry.timestamp,
    content: textParts.join("\n"),
    has_text: hasText,
    tool_names: toolNames,
  };
}

/**
 * Read a specific entry from an HTML export file by entry_id.
 * Used by session-read tool.
 */
export function readHtmlEntry(
  filePath: string,
  entryId: string,
): JsonlEntry | null {
  const data = parseHtmlExport(filePath);
  if (!data) return null;

  return data.entries.find((e) => e.id === entryId) ?? null;
}
