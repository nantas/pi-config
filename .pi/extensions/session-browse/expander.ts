/**
 * Turn expansion — builds a full user turn context from an entry ID.
 *
 * Algorithm:
 * 1. Locate the entry by entry_id
 * 2. Search backward to find the nearest preceding user entry (turn start)
 * 3. Collect all entries from turn start until the next user entry (exclusive)
 * 4. Format output: USER text + ASST text blocks + tool call references
 */

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import type { TurnData, TurnEntry, JsonlEntry } from "./types";
import { parseHtmlExport } from "./html-parser";

interface EntryRow {
  entry_id: string;
  parent_id: string | null;
  line_number: number;
  role: string;
  timestamp: string;
  has_text: number;
  tool_names: string;
}

/**
 * Build a turn context starting from a given entry ID.
 * The algorithm walks backward to find the turn's user entry,
 * then forward to collect the full turn.
 */
export function buildTurnFromEntryId(
  db: Database.Database,
  entryId: string,
  sessionPath: string,
): TurnData | null {
  // Get all entries for this session, ordered by line_number
  const entries = db.prepare(
    "SELECT * FROM entries WHERE session_path = ? ORDER BY line_number ASC",
  ).all(sessionPath) as EntryRow[];

  if (entries.length === 0) return null;

  // Find the index of the target entry
  const targetIdx = entries.findIndex((e) => e.entry_id === entryId);
  if (targetIdx === -1) return null;

  // Walk backward to find the nearest user entry (turn start)
  let turnStartIdx = targetIdx;
  for (let i = targetIdx; i >= 0; i--) {
    if (entries[i].role === "user") {
      turnStartIdx = i;
      break;
    }
  }

  // Collect entries until the next user entry (exclusive)
  const turnEntries: EntryRow[] = [];
  for (let i = turnStartIdx; i < entries.length; i++) {
    if (i > turnStartIdx && entries[i].role === "user") {
      break; // Next turn starts here
    }
    turnEntries.push(entries[i]);
  }

  if (turnEntries.length === 0) return null;

  // Read raw entry content from the file for formatting
  const rawEntries = readRawEntries(sessionPath);

  // Format the turn
  const userEntry = turnEntries[0];
  const userText = getEntryText(rawEntries, userEntry.entry_id, userEntry.role);
  const turnItems: TurnEntry[] = [];

  for (let i = 1; i < turnEntries.length; i++) {
    const entry = turnEntries[i];
    const text = getEntryText(rawEntries, entry.entry_id, entry.role);
    let toolCalls: string[] = [];
    try {
      toolCalls = JSON.parse(entry.tool_names);
    } catch {
      toolCalls = [];
    }

    // Per design D6: expand output does NOT include toolResult content
    if (entry.role !== "toolResult") {
      turnItems.push({
        entry_id: entry.entry_id,
        role: entry.role,
        text,
        tool_calls: toolCalls,
      });
    }
  }

  return {
    session_path: sessionPath,
    user_text: userText,
    entries: turnItems,
  };
}

/**
 * Read raw entries from a session file (JSONL or HTML).
 * Returns a map of entry_id -> raw entry data.
 */
function readRawEntries(sessionPath: string): Map<string, JsonlEntry> {
  const map = new Map<string, JsonlEntry>();

  if (sessionPath.endsWith(".html")) {
    // Parse HTML export
    const data = parseHtmlExport(sessionPath);
    if (data) {
      for (const entry of data.entries) {
        map.set(entry.id, entry);
      }
    }
    return map;
  }

  // JSONL
  try {
    const content = readFileSync(sessionPath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as JsonlEntry;
        map.set(entry.id, entry);
      } catch {
        continue;
      }
    }
  } catch {
    // File not readable
  }

  return map;
}

/**
 * Extract display text from a raw entry.
 */
function getEntryText(
  rawEntries: Map<string, JsonlEntry>,
  entryId: string,
  role: string,
): string {
  const entry = rawEntries.get(entryId);
  if (!entry?.message) return "";

  const textParts: string[] = [];
  for (const block of entry.message.content || []) {
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
    }
  }
  return textParts.join("\n");
}

/**
 * Format a TurnData into a human-readable string.
 * Per spec: USER: <text> followed by ASST entries with tool call references.
 */
export function formatTurn(turn: TurnData): string {
  const lines: string[] = [];

  lines.push(`USER: ${turn.user_text}`);

  for (const entry of turn.entries) {
    if (entry.role === "assistant") {
      if (entry.text) {
        lines.push(`ASST: ${entry.text}`);
      }
      if (entry.tool_calls.length > 0) {
        lines.push(`  → called ${entry.tool_calls.map((t) => `${t}()`).join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}
