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
import type { TurnData, TurnEntry, JsonlEntry, TurnBoundary, TurnSummary } from "./types";
import { parseHtmlExport } from "./html-parser";

const TOOL_CALL_SUMMARY_MAX_CHARS = 60;

/**
 * Format a tool call as a one-line summary.
 * Example: session-search(query="session browse UI interface")
 * Truncated to 60 visible characters if longer.
 */
export function formatToolCallSummary(
  name: string,
  args: Record<string, unknown>,
): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return `${name}()`;

  const firstKey = keys[0];
  const firstVal = String(args[firstKey]);
  const summary = `${name}(${firstKey}="${firstVal}")`;

  if (summary.length > TOOL_CALL_SUMMARY_MAX_CHARS) {
    return summary.slice(0, TOOL_CALL_SUMMARY_MAX_CHARS - 3) + "...)";
  }
  return summary;
}

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
      const toolCallArgs = extractToolCallArgs(rawEntries, entry.entry_id);
      turnItems.push({
        entry_id: entry.entry_id,
        role: entry.role,
        text,
        tool_calls: toolCalls,
        tool_call_args: toolCallArgs,
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
 * Extract tool call arguments from a raw entry.
 * Returns an array of { name: args } objects for each tool call.
 */
function extractToolCallArgs(
  rawEntries: Map<string, JsonlEntry>,
  entryId: string,
): Record<string, Record<string, unknown>>[] {
  const entry = rawEntries.get(entryId);
  if (!entry?.message) return [];

  const result: Record<string, Record<string, unknown>>[] = [];
  for (const block of entry.message.content || []) {
    if (block.type === "toolCall" && block.name) {
      let args: Record<string, unknown>;
      if (typeof block.arguments === "string") {
        try {
          args = JSON.parse(block.arguments);
        } catch {
          args = {};
        }
      } else {
        args = (block.arguments as Record<string, unknown>) ?? {};
      }
      result.push({ [block.name]: args });
    }
  }
  return result;
}

/**
 * Format a TurnData into a compact, token-efficient string for LLM consumption.
 *
 * Compact format (no decorative prefixes, no blank lines):
 * ```
 * U
 * <full user text>
 * A
 * <full assistant text>
 * → name(param="value")
 * A
 * <full assistant text>
 * ```
 *
 * toolResult entries are skipped.
 * Tool calls are rendered as → name(args_summary), 60 char max.
 */
export function formatTurn(turn: TurnData): string {
  const lines: string[] = [];

  lines.push("U");
  lines.push(turn.user_text);

  for (const entry of turn.entries) {
    if (entry.role === "assistant") {
      // Skip entries with no text AND no tool calls (e.g., pure toolResult wrappers)
      const hasText = !!entry.text;
      const hasToolCalls = entry.tool_call_args.length > 0;
      if (!hasText && !hasToolCalls) continue;

      lines.push("A");
      if (hasText) {
        lines.push(entry.text);
      }
      // Tool calls as one-line summaries
      if (hasToolCalls) {
        for (const tc of entry.tool_call_args) {
          for (const [name, args] of Object.entries(tc)) {
            lines.push(`→ ${formatToolCallSummary(name, args)}`);
          }
        }
      }
    }
    // toolResult entries are skipped
  }

  return lines.join("\n");
}

/**
 * Build a turn boundary index for a session.
 * Scans entries ordered by line_number, identifies each role=user entry as a turn boundary.
 * Returns an array of TurnBoundary objects with entry_id, line_number, and user_text.
 */
export function buildTurnIndex(
  db: Database.Database,
  sessionPath: string,
): TurnBoundary[] {
  const entries = db.prepare(
    "SELECT entry_id, line_number, role FROM entries WHERE session_path = ? ORDER BY line_number ASC",
  ).all(sessionPath) as { entry_id: string; line_number: number; role: string }[];

  const rawEntries = readRawEntries(sessionPath);
  const boundaries: TurnBoundary[] = [];

  for (const e of entries) {
    if (e.role !== "user") continue;
    const text = getEntryText(rawEntries, e.entry_id, "user");
    boundaries.push({
      entry_id: e.entry_id,
      line_number: e.line_number,
      user_text: text.slice(0, 200),
    });
  }

  return boundaries;
}

/**
 * Compress a TurnData into a structured TurnSummary.
 * Used by session-iterate tool in summary mode.
 *
 * - user_text: truncated to 200 chars
 * - Each assistant entry: text_summary (first 200 chars) + tool_calls list
 * - totals: total_text_chars, total_tool_calls
 */
export function formatTurnSummary(turn: TurnData): TurnSummary {
  const userText = turn.user_text.slice(0, 200);
  let totalTextChars = turn.user_text.length;
  let totalToolCalls = 0;

  const entries: TurnSummary["entries"] = [];

  for (const entry of turn.entries) {
    totalTextChars += entry.text.length;
    totalToolCalls += entry.tool_calls.length;

    // Only include non-toolResult entries (matches formatTurn behavior)
    if (entry.role === "toolResult") continue;

    const textSummary = entry.text.slice(0, 200);
    entries.push({
      role: entry.role,
      text_summary: textSummary,
      tool_calls: entry.tool_calls,
    });
  }

  return {
    user_text: userText,
    entries,
    total_text_chars: totalTextChars,
    total_tool_calls: totalToolCalls,
  };
}
