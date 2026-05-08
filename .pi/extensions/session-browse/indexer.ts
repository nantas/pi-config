/**
 * Session index engine — SQLite connection management, file discovery,
 * content extraction, incremental indexing, FTS5 search, and rebuild.
 */

import Database from "better-sqlite3";
import { readdirSync, statSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { homedir } from "node:os";
import type {
  SessionFile,
  ExtractedEntry,
  SearchResult,
  JsonlEntry,
  JsonlContentBlock,
  JsonlMessage,
} from "./types";
import { parseHtmlExport, extractEntriesFromHtml } from "./html-parser";

// ── Constants ──────────────────────────────────────────────────

const DB_DIR = join(homedir(), ".pi", "session-browse");
const DB_PATH = join(DB_DIR, "index.db");
const JSONL_BASE = join(homedir(), ".pi", "agent", "sessions");
const TOOL_RESULT_MAX_CHARS = 2000;
const SEARCH_DEFAULT_LIMIT = 30;

// ── DB Connection ──────────────────────────────────────────────

let _db: Database.Database | null = null;

/** Get or create the SQLite database connection */
export function getDb(): Database.Database {
  if (_db) return _db;

  mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  createSchema(_db);
  return _db;
}

/** Close the database connection */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Create tables if they don't exist */
function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      path          TEXT PRIMARY KEY,
      project       TEXT NOT NULL,
      session_ts    TEXT NOT NULL,
      mtime_ms      INTEGER NOT NULL,
      first_user_message TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS entries (
      session_path  TEXT NOT NULL,
      entry_id      TEXT NOT NULL,
      parent_id     TEXT,
      line_number   INTEGER NOT NULL,
      role          TEXT NOT NULL,
      timestamp     TEXT NOT NULL,
      has_text      INTEGER NOT NULL DEFAULT 0,
      tool_names    TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (session_path, entry_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS session_fts
      USING fts5(
        content,
        session_path UNINDEXED,
        entry_id     UNINDEXED,
        line_number  UNINDEXED,
        role         UNINDEXED,
        tokenize='porter unicode61'
      );
  `);
}

// ── File Discovery ─────────────────────────────────────────────

/** Recursively discover .jsonl files in a directory */
function discoverJsonlRecursive(
  dir: string,
  project: string,
  files: SessionFile[],
): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories (e.g., subagent artifacts)
        discoverJsonlRecursive(fullPath, project, files);
      } else if (entry.name.endsWith(".jsonl")) {
        try {
          const stat = statSync(fullPath);
          files.push({
            path: fullPath,
            mtimeMs: stat.mtimeMs,
            project,
            format: "jsonl",
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Directory not readable
  }
}

/** Discover all session files (JSONL + HTML) */
export function findSessionFiles(
  htmlDirs: string[] = [],
): SessionFile[] {
  const files: SessionFile[] = [];

  // JSONL discovery — recursively scan project directories for .jsonl files
  if (existsSync(JSONL_BASE)) {
    try {
      const projects = readdirSync(JSONL_BASE, { withFileTypes: true });
      for (const proj of projects) {
        if (!proj.isDirectory()) continue;
        const projDir = join(JSONL_BASE, proj.name);
        const projectName = proj.name;
        discoverJsonlRecursive(projDir, projectName, files);
      }
    } catch {
      // sessions dir not readable
    }
  }

  // HTML discovery from configured directories
  const htmlDirsToScan = htmlDirs.length > 0
    ? htmlDirs
    : [join(process.cwd(), ".pi", "sessions")];

  for (const htmlDir of htmlDirsToScan) {
    if (!existsSync(htmlDir)) continue;
    try {
      const entries = readdirSync(htmlDir);
      for (const entry of entries) {
        if (!entry.endsWith(".html")) continue;
        const fullPath = join(htmlDir, entry);
        try {
          const stat = statSync(fullPath);
          files.push({
            path: fullPath,
            mtimeMs: stat.mtimeMs,
            project: basename(htmlDir),
            format: "html",
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // html dir not readable
    }
  }

  return files;
}

// ── Content Extraction (JSONL) ─────────────────────────────────

/** Extract indexable entries from a JSONL session file */
export function extractEntriesFromJsonl(filePath: string): ExtractedEntry[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const results: ExtractedEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry: JsonlEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // Skip malformed lines
    }

    const extracted = extractFromEntry(entry, i + 1);
    if (extracted) {
      results.push(extracted);
    }
  }

  return results;
}

/** Extract indexable content from a single JSONL entry */
function extractFromEntry(entry: JsonlEntry, lineNumber: number): ExtractedEntry | null {
  if (entry.type !== "message" || !entry.message) {
    // Skip non-message entries: model_change, thinking_level_change,
    // compaction, label, session_info
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
        // Skip thinking blocks (low signal-to-noise, contains ANSI codes)
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

// ── Incremental Indexing ───────────────────────────────────────

/** Update the index incrementally based on file modification times */
export function updateIndex(htmlDirs?: string[]): { indexed: number; skipped: number } {
  const db = getDb();
  const files = findSessionFiles(htmlDirs);
  let indexed = 0;
  let skipped = 0;

  // Load existing mtimes
  const existingMtimes = new Map<string, number>();
  const rows = db.prepare("SELECT path, mtime_ms FROM sessions").all() as { path: string; mtime_ms: number }[];
  for (const row of rows) {
    existingMtimes.set(row.path, row.mtime_ms);
  }

  for (const file of files) {
    const existingMtime = existingMtimes.get(file.path);
    if (existingMtime !== undefined && file.mtimeMs <= existingMtime) {
      skipped++;
      continue;
    }

    // Delete old entries for this file if re-indexing
    if (existingMtime !== undefined) {
      purgeSession(db, file.path);
    }

    indexFile(db, file);
    indexed++;
  }

  return { indexed, skipped };
}

/** Purge all data for a session from the index */
function purgeSession(db: Database.Database, sessionPath: string): void {
  db.prepare("DELETE FROM session_fts WHERE session_path = ?").run(sessionPath);
  db.prepare("DELETE FROM entries WHERE session_path = ?").run(sessionPath);
  db.prepare("DELETE FROM sessions WHERE path = ?").run(sessionPath);
}

/** Index a single file into the database */
function indexFile(db: Database.Database, file: SessionFile): void {
  let entries: ExtractedEntry[];
  let sessionTs: string;
  let firstUserMessage = "";

  if (file.format === "jsonl") {
    entries = extractEntriesFromJsonl(file.path);
    // Extract session_ts from the first line (session header)
    const header = extractSessionHeader(file.path);
    sessionTs = header?.timestamp ?? new Date(file.mtimeMs).toISOString();
  } else {
    // HTML — delegate to html-parser
    const data = parseHtmlExport(file.path);
    if (!data) {
      return; // Skip unparseable files
    }
    entries = extractEntriesFromHtml(data, file.path);
    sessionTs = (data.header?.timestamp as string) ?? new Date(file.mtimeMs).toISOString();
  }

  // Find first user message
  const firstUser = entries.find((e) => e.role === "user" && e.content);
  if (firstUser) {
    firstUserMessage = firstUser.content.slice(0, 200);
  }

  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO sessions (path, project, session_ts, mtime_ms, first_user_message)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSession.run(file.path, file.project, sessionTs, file.mtimeMs, firstUserMessage);

  const insertEntry = db.prepare(`
    INSERT OR IGNORE INTO entries (session_path, entry_id, parent_id, line_number, role, timestamp, has_text, tool_names)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFts = db.prepare(`
    INSERT INTO session_fts (content, session_path, entry_id, line_number, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const entry of entries) {
      if (!entry.content) continue; // Skip entries with no indexable content

      insertEntry.run(
        entry.session_path ?? file.path,
        entry.entry_id,
        entry.parent_id,
        entry.line_number,
        entry.role,
        entry.timestamp,
        entry.has_text ? 1 : 0,
        JSON.stringify(entry.tool_names),
      );

      insertFts.run(
        entry.content,
        entry.session_path ?? file.path,
        entry.entry_id,
        entry.line_number,
        entry.role,
      );
    }
  });

  transaction();
}

/** Extract the session header from a JSONL file */
function extractSessionHeader(filePath: string): { timestamp?: string } | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const firstLine = content.split("\n")[0]?.trim();
    if (!firstLine) return null;
    const parsed = JSON.parse(firstLine);
    if (parsed.type === "session") return parsed;
    return null;
  } catch {
    return null;
  }
}

// ── Full-Text Search ───────────────────────────────────────────

/** Sanitize FTS5 query tokens to prevent syntax errors */
export function sanitizeTokens(query: string): string {
  // Remove FTS5 special syntax characters
  let sanitized = query
    .replace(/["']/g, "")
    .replace(/[{}()*+\-~^!|&:=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If nothing remains, return a safe empty query that won't crash
  if (!sanitized) return "";

  // Wrap in double quotes for phrase matching
  return `"${sanitized}"`;
}

/** Search the FTS5 index */
export function search(
  query: string,
  sessionPath?: string,
  limit: number = SEARCH_DEFAULT_LIMIT,
): SearchResult[] {
  const db = getDb();
  const ftsQuery = sanitizeTokens(query);

  if (!ftsQuery) return [];

  let sql: string;
  let params: unknown[];

  if (sessionPath) {
    sql = `
      SELECT
        fts.entry_id,
        fts.session_path,
        fts.role,
        fts.line_number,
        snippet(session_fts, 0, '⟨', '⟩', '...', 32) as snippet,
        rank
      FROM session_fts fts
      WHERE session_fts MATCH ? AND fts.session_path = ?
      ORDER BY rank
      LIMIT ?
    `;
    params = [ftsQuery, sessionPath, limit];
  } else {
    sql = `
      SELECT
        fts.entry_id,
        fts.session_path,
        fts.role,
        fts.line_number,
        snippet(session_fts, 0, '⟨', '⟩', '...', 32) as snippet,
        rank
      FROM session_fts fts
      WHERE session_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `;
    params = [ftsQuery, limit];
  }

  try {
    const rows = db.prepare(sql).all(...params) as SearchResult[];

    // Enrich with timestamps from entries table
    for (const row of rows) {
      const entry = db.prepare(
        "SELECT timestamp FROM entries WHERE session_path = ? AND entry_id = ?",
      ).get(row.session_path, row.entry_id) as { timestamp: string } | undefined;
      if (entry) {
        row.timestamp = entry.timestamp;
      }
    }

    return rows;
  } catch {
    // FTS5 query syntax error — return empty
    return [];
  }
}

// ── Recent Sessions ────────────────────────────────────────────

/** List all indexed sessions ordered by timestamp descending */
export function listRecent(): SessionRecord[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM sessions ORDER BY session_ts DESC",
  ).all() as SessionRecord[];
}

// ── Index Rebuild ──────────────────────────────────────────────

/** Rebuild the entire index from scratch */
export function rebuildIndex(htmlDirs?: string[]): { indexed: number } {
  const db = getDb();

  // Clear all tables
  db.prepare("DELETE FROM session_fts").run();
  db.prepare("DELETE FROM entries").run();
  db.prepare("DELETE FROM sessions").run();

  // Close and reopen to reset WAL
  closeDb();

  // Re-index all files
  const result = updateIndex(htmlDirs);
  return { indexed: result.indexed };
}

// Types are imported directly from types.ts by consumers
