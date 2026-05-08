/**
 * Core types for the session-browse extension.
 */

/** Metadata for a discovered session file */
export interface SessionFile {
  path: string;
  mtimeMs: number;
  project: string;
  format: "jsonl" | "html";
}

/** A row from the sessions table */
export interface SessionRecord {
  path: string;
  project: string;
  session_ts: string;
  mtime_ms: number;
  first_user_message: string;
}

/** A row from the entries table */
export interface EntryRecord {
  session_path: string;
  entry_id: string;
  parent_id: string | null;
  line_number: number;
  role: string;
  timestamp: string;
  has_text: number; // 0 | 1
  tool_names: string; // JSON array string
}

/** A search result from FTS5 */
export interface SearchResult {
  entry_id: string;
  session_path: string;
  role: string;
  timestamp: string;
  line_number: number;
  snippet: string;
  rank: number;
}

/** Turn data returned by the expand algorithm */
export interface TurnData {
  session_path: string;
  user_text: string;
  entries: TurnEntry[];
}

/** A single entry within an expanded turn */
export interface TurnEntry {
  entry_id: string;
  role: string;
  text: string;
  tool_calls: string[];
}

/** Raw JSONL entry (discriminated by type field) */
export interface JsonlEntry {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: string;
  message?: JsonlMessage;
  // non-message fields
  provider?: string;
  modelId?: string;
  thinkingLevel?: string;
  summary?: string;
  firstKeptEntryId?: string;
  targetId?: string;
  label?: string;
  name?: string;
}

/** Message structure within a JSONL entry */
export interface JsonlMessage {
  role: "user" | "assistant" | "toolResult";
  content: JsonlContentBlock[];
  timestamp?: number;
  model?: string;
  stopReason?: string;
  errorMessage?: string;
  toolCallId?: string;
  toolName?: string;
}

/** Content block within a message */
export interface JsonlContentBlock {
  type: "text" | "thinking" | "toolCall" | "toolResult";
  text?: string;
  thinking?: string;
  name?: string;
  arguments?: string | Record<string, unknown>;
  toolCallId?: string;
}

/** Extracted indexable content for a single entry */
export interface ExtractedEntry {
  entry_id: string;
  parent_id: string | null;
  line_number: number;
  role: string;
  timestamp: string;
  content: string;
  has_text: boolean;
  tool_names: string[];
}

/** Parsed HTML export data */
export interface HtmlSessionData {
  header?: Record<string, unknown>;
  entries: JsonlEntry[];
  [key: string]: unknown;
}
