/**
 * /sb command handler — interactive session search and browse.
 *
 * Flow: search → select from numbered results → turn preview → [r]ead / [b]ack / [q]uit
 * Uses ctx.ui.select() for picking results and ctx.ui.editor() for displaying content.
 */

import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { getDb, updateIndex, search } from "./indexer";
import { buildTurnFromEntryId, formatTurn } from "./expander";
import { readHtmlEntry } from "./html-parser";
import type { SearchResult, JsonlEntry } from "./types";
import { readFileSync, existsSync } from "node:fs";

const MAX_RESULTS = 30;
const RAW_ENTRY_MAX_CHARS = 10000;

// ── Index Guard ────────────────────────────────────────────────

let _indexed = false;

function ensureIndexed(): void {
  if (_indexed) return;
  _indexed = true;
  try {
    updateIndex();
  } catch {
    // Index errors are non-fatal; commands will return empty results
  }
}

// ── Main Handler ───────────────────────────────────────────────

export async function handleSbInput(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const query = args.trim();

  // sb-search-no-query: no argument → show usage tip
  if (!query) {
    ctx.ui.notify(
      "Usage: /sb <query> — Search and browse historical Pi sessions.",
      "info",
    );
    return;
  }

  // sb-index-not-ready: auto-trigger indexing
  ensureIndexed();

  const results = search(query);

  // sb-search-no-results
  if (results.length === 0) {
    ctx.ui.notify(
      "No matching entries found. Try different keywords.",
      "info",
    );
    return;
  }

  // Cap at MAX_RESULTS with notification
  const capped = results.slice(0, MAX_RESULTS);
  if (results.length > MAX_RESULTS) {
    ctx.ui.notify(
      `Showing ${MAX_RESULTS} of ${results.length} results. Narrow your query for more specific matches.`,
      "info",
    );
  }

  await promptLoop(capped, ctx);
}

// ── Interaction Loop ───────────────────────────────────────────

async function promptLoop(
  results: SearchResult[],
  ctx: ExtensionCommandContext,
): Promise<void> {
  // Format results as select options: [N] timestamp role | snippet
  const options = results.map((r, i) => {
    const ts = r.timestamp || "?";
    const snippet = (r.snippet || "").slice(0, 80);
    return `[${i + 1}] ${ts} ${r.role} | ${snippet}`;
  });

  while (true) {
    // sb-result-selection: user picks a numbered result
    const choice = await ctx.ui.select(
      `Session Search Results (${results.length} found, Esc to cancel)`,
      options,
    );
    if (!choice) break; // Esc / cancelled

    const idx = options.indexOf(choice);
    if (idx === -1) break;

    const result = results[idx];

    // Show turn preview
    const ok = await showTurnPreview(result.entry_id, result.session_path, ctx);
    if (!ok) continue; // error showing turn, back to results

    // Post-turn action loop: [r]ead / [b]ack / [q]uit
    let backToResults = false;
    while (!backToResults) {
      const action = await ctx.ui.select("Turn Options", [
        "[r] Read raw entry",
        "[b] Back to results",
        "[q] Quit",
      ]);

      if (!action || action === "[q] Quit") return; // quit entirely

      if (action === "[b] Back to results") {
        backToResults = true;
        continue;
      }

      if (action === "[r] Read raw entry") {
        await showRawEntry(result.entry_id, result.session_path, ctx);

        // After reading, offer back/quit
        const postAction = await ctx.ui.select("Options", [
          "[b] Back to results",
          "[q] Quit",
        ]);
        if (!postAction || postAction === "[q] Quit") return;
        backToResults = true;
      }
    }
  }
}

// ── Turn Preview ───────────────────────────────────────────────

async function showTurnPreview(
  entryId: string,
  sessionPath: string,
  ctx: ExtensionCommandContext,
): Promise<boolean> {
  if (!existsSync(sessionPath)) {
    ctx.ui.notify(`Session file not found: ${sessionPath}`, "error");
    return false;
  }

  const db = getDb();
  const turn = buildTurnFromEntryId(db, entryId, sessionPath);

  if (!turn) {
    ctx.ui.notify(`Entry not found: ${entryId}. Try searching again.`, "error");
    return false;
  }

  const text = formatTurn(turn);

  // Display turn content via editor (Esc to close)
  await ctx.ui.editor("Turn Preview (Esc to close)", text);
  return true;
}

// ── Raw Entry Display ──────────────────────────────────────────

async function showRawEntry(
  entryId: string,
  sessionPath: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  let entry: JsonlEntry | null = null;

  if (sessionPath.endsWith(".html")) {
    entry = readHtmlEntry(sessionPath, entryId);
  } else {
    entry = findJsonlEntry(sessionPath, entryId);
  }

  if (!entry) {
    ctx.ui.notify(`Entry not found: ${entryId}`, "error");
    return;
  }

  const rawText = formatRawEntry(entry);
  const truncated = rawText.length > RAW_ENTRY_MAX_CHARS;
  const displayText = truncated
    ? rawText.slice(0, RAW_ENTRY_MAX_CHARS) +
      `\n... (truncated at ${RAW_ENTRY_MAX_CHARS} chars, total ${rawText.length})`
    : rawText;

  await ctx.ui.editor("Raw Entry (Esc to close)", displayText);
}

// ── Helpers ────────────────────────────────────────────────────

/** Find a specific entry in a JSONL file by ID */
function findJsonlEntry(filePath: string, entryId: string): JsonlEntry | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as JsonlEntry;
        if (entry.id === entryId) return entry;
      } catch {
        continue;
      }
    }
  } catch {
    // File not readable
  }
  return null;
}

/** Format a raw entry for display */
function formatRawEntry(entry: JsonlEntry): string {
  if (entry.type !== "message" || !entry.message) {
    return JSON.stringify(entry, null, 2);
  }

  const msg = entry.message;
  const parts: string[] = [];

  parts.push(`Role: ${msg.role}`);

  for (const block of msg.content || []) {
    if (block.type === "text" && block.text) {
      parts.push(`\n[Text]\n${block.text}`);
    } else if (block.type === "toolCall" && block.name) {
      const args = typeof block.arguments === "string"
        ? block.arguments
        : JSON.stringify(block.arguments ?? {}, null, 2);
      parts.push(`\n[ToolCall] ${block.name}\n${args}`);
    } else if (block.type === "toolResult" && block.text) {
      parts.push(
        `\n[ToolResult: ${block.toolCallId ?? msg.toolName ?? "?"}]\n${block.text}`,
      );
    }
    // Skip thinking blocks
  }

  if (msg.errorMessage) {
    parts.push(`\n[Error] ${msg.errorMessage}`);
  }

  return parts.join("\n");
}
