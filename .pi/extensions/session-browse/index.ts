/**
 * session-browse extension
 *
 * Provides LLM-callable tools for searching and browsing historical Pi sessions.
 *
 * Tools:
 * - session-search: FTS5 keyword search across indexed session entries
 * - session-expand: Expand an entry into its full user turn context
 * - session-read: Read the raw content of a specific entry
 *
 * Architecture: SQLite FTS5 per-entry index with incremental updates.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import {
  getDb,
  closeDb,
  updateIndex,
  search,
  rebuildIndex,
  listRecent,
} from "./indexer";
import { buildTurnFromEntryId, formatTurn } from "./expander";
import { parseHtmlExport, readHtmlEntry } from "./html-parser";
import type { JsonlEntry } from "./types";

// ── Global dedup (Design D3) ───────────────────────────────────

const _key = "__pi_ext_session_browse_loaded";

export default function sessionBrowseExtension(pi: ExtensionAPI) {
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi.on("session_shutdown", () => {
    closeDb();
    delete (globalThis as any)[_key];
  });

  // ── Ensure index is built on first tool use ──────────────────

  let _indexed = false;

  function ensureIndexed(): void {
    if (_indexed) return;
    _indexed = true;
    try {
      updateIndex();
    } catch {
      // Index errors are non-fatal; tools will return empty results
    }
  }

  // ── Tool: session-search ─────────────────────────────────────

  pi.registerTool({
    name: "session-search",
    label: "Session Search",
    description:
      "搜索历史 Pi session 中的相关条目。返回匹配的 entry 摘要列表。" +
      "支持搜索所有已索引的 JSONL 和 HTML session 文件。",
    promptSnippet:
      "Search historical Pi session content for relevant entries using FTS5 full-text search.",
    promptGuidelines: [
      "Use session-search first to find relevant entries, then session-expand for turn context, then session-read for full details.",
      "Search queries work best with specific keywords or phrases, not full sentences.",
      "Results are ranked by BM25 relevance across all indexed sessions.",
    ],
    parameters: Type.Object({
      query: Type.String({
        description: "搜索关键词",
        minLength: 1,
      }),
      session_path: Type.Optional(
        Type.String({
          description: "指定 session 文件路径 (JSONL 或 HTML)，限定搜索范围",
        }),
      ),
    }),
    async execute(
      _toolCallId: string,
      params: { query: string; session_path?: string },
    ) {
      try {
        ensureIndexed();
        const db = getDb();
        const results = search(params.query, params.session_path);

        if (results.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No matching entries found. Try different keywords or run session-search without a path filter.",
            }],
            details: { ok: true, count: 0 },
          };
        }

        // Format: [timestamp] role id=entry_id | snippet
        const lines = results.map((r) => {
          const ts = r.timestamp || "?";
          const role = r.role;
          const id = r.entry_id;
          const snippet = (r.snippet || "").slice(0, 200);
          return `[${ts}] ${role} id=${id} | ${snippet}`;
        });

        // Add session path footer for context
        const sessionPaths = [...new Set(results.map((r) => r.session_path))];

        return {
          content: [{
            type: "text" as const,
            text: lines.join("\n") +
              `\n\nSessions: ${sessionPaths.length} file(s)` +
              `\nUse session-expand with an entry_id and session_path to get full turn context.`,
          }],
          details: {
            ok: true,
            count: results.length,
            sessions: sessionPaths,
          },
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Search error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          details: { ok: false, error: String(err) },
        };
      }
    },
  });

  // ── Tool: session-expand ─────────────────────────────────────

  pi.registerTool({
    name: "session-expand",
    label: "Session Expand",
    description:
      "展开指定 entry 所在的完整 user turn。输出: user text + 所有 assistant text + tool name 列表。" +
      "不含 toolResult 内容（如需查看请使用 session-read）。",
    promptSnippet:
      "Expand an entry into its full user turn context (user message + assistant response + tool calls).",
    promptGuidelines: [
      "Use after session-search to get full conversation context around a hit.",
      "The expand output excludes toolResult content; use session-read for that.",
    ],
    parameters: Type.Object({
      entry_id: Type.String({
        description: "从 session-search 获得的 entry ID",
      }),
      session_path: Type.String({
        description: "session 文件路径",
      }),
    }),
    async execute(
      _toolCallId: string,
      params: { entry_id: string; session_path: string },
    ) {
      try {
        ensureIndexed();

        // Validate session_path exists
        if (!existsSync(params.session_path)) {
          return {
            content: [{
              type: "text" as const,
              text: `Session file not found: ${params.session_path}`,
            }],
            details: { ok: false, error: "file_not_found" },
          };
        }

        const db = getDb();
        const turn = buildTurnFromEntryId(db, params.entry_id, params.session_path);

        if (!turn) {
          return {
            content: [{
              type: "text" as const,
              text: `Entry not found: ${params.entry_id} in ${params.session_path}. Try session-search first to get valid entry IDs.`,
            }],
            details: { ok: false, error: "entry_not_found" },
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: formatTurn(turn),
          }],
          details: {
            ok: true,
            session_path: params.session_path,
            entry_count: turn.entries.length,
          },
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Expand error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          details: { ok: false, error: String(err) },
        };
      }
    },
  });

  // ── Tool: session-read ───────────────────────────────────────

  pi.registerTool({
    name: "session-read",
    label: "Session Read",
    description:
      "读取指定 entry 的完整内容（含 toolResult）。用于需要查看工具输出细节的场景。" +
      "支持 JSONL 和 HTML 文件。",
    promptSnippet:
      "Read the full raw content of a specific session entry, including tool results.",
    promptGuidelines: [
      "Use when you need the complete toolResult output that session-expand omits.",
      "Supports max_chars truncation for very long outputs.",
    ],
    parameters: Type.Object({
      entry_id: Type.String({
        description: "entry ID",
      }),
      session_path: Type.String({
        description: "session 文件路径 (JSONL 或 HTML)",
      }),
      max_chars: Type.Optional(
        Type.Number({
          description: "截断长度，默认 5000",
          default: 5000,
        }),
      ),
    }),
    async execute(
      _toolCallId: string,
      params: { entry_id: string; session_path: string; max_chars?: number },
    ) {
      try {
        const maxChars = params.max_chars ?? 5000;

        // Validate session_path exists
        if (!existsSync(params.session_path)) {
          return {
            content: [{
              type: "text" as const,
              text: `Session file not found: ${params.session_path}`,
            }],
            details: { ok: false, error: "file_not_found" },
          };
        }

        let entry: JsonlEntry | null = null;

        if (params.session_path.endsWith(".html")) {
          // HTML file — parse and find entry
          entry = readHtmlEntry(params.session_path, params.entry_id);
        } else {
          // JSONL file — find by entry ID
          entry = findJsonlEntry(params.session_path, params.entry_id);
        }

        if (!entry) {
          return {
            content: [{
              type: "text" as const,
              text: `Entry not found: ${params.entry_id} in ${params.session_path}`,
            }],
            details: { ok: false, error: "entry_not_found" },
          };
        }

        // Format the raw entry content
        const rawText = formatRawEntry(entry);
        const truncated = rawText.length > maxChars;

        let output = truncated
          ? rawText.slice(0, maxChars) + `\n... (truncated at ${maxChars} chars, total ${rawText.length})`
          : rawText;

        return {
          content: [{
            type: "text" as const,
            text: output,
          }],
          details: {
            ok: true,
            entry_id: params.entry_id,
            truncated,
            total_chars: rawText.length,
          },
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Read error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          details: { ok: false, error: String(err) },
        };
      }
    },
  });
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
      parts.push(`\n[ToolResult: ${block.toolCallId ?? msg.toolName ?? "?"}]\n${block.text}`);
    }
    // Skip thinking blocks
  }

  if (msg.errorMessage) {
    parts.push(`\n[Error] ${msg.errorMessage}`);
  }

  return parts.join("\n");
}
