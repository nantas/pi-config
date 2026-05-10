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
  first_line: string;
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
  tool_call_args: Record<string, Record<string, unknown>>[];
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
  session_path?: string;
  content: string;
  has_text: boolean;
  tool_names: string[];
}

/** A session-level search group (aggregated from FTS results) */
export interface SessionSearchGroup {
  session_path: string;
  project: string;
  session_ts: string;
  first_user_message: string;
  hit_count: number;
  best_rank: number;
}

/** Page state for hit list pagination */
export interface HitPage {
  items: SelectItem[];
  page: number;
  totalPages: number;
  totalItems: number;
}

/** Select item for SelectList (imported from pi-tui) */
export interface SelectItem {
  value: string;
  label: string;
  description?: string;
}

/** Standardized position in a session timeline */
export interface SessionPosition {
  /** Entry ID of the current turn's user entry */
  entry_id: string;
  /** 0-based turn index */
  turn_index: number;
  /** Total number of turns in this session */
  total_turns: number;
  /** Whether this is the first turn (turn_index === 0) */
  is_first: boolean;
  /** Whether this is the last turn (turn_index === total_turns - 1) */
  is_last: boolean;
}

/** Compressed summary of a single turn (summary mode output) */
export interface TurnSummary {
  /** User message text, truncated to 200 chars */
  user_text: string;
  /** Each assistant entry in the turn, summarized */
  entries: Array<{
    role: string;
    /** Assistant text truncated to 200 chars, empty if tool-call-only */
    text_summary: string;
    /** Tool names called by this assistant entry */
    tool_calls: string[];
  }>;
  /** Total character count of the turn's text content (before truncation) */
  total_text_chars: number;
  /** Total number of tool calls across all assistant entries in this turn */
  total_tool_calls: number;
}

/** Full result from session-iterate tool */
export interface SessionIterateResult {
  /** Current position after navigation */
  position: SessionPosition;
  /** Full turn context (present when mode="full") */
  turn?: TurnData;
  /** Compressed turn summary (present when mode="summary") */
  summary?: TurnSummary;
  /** All turns in the session, each with idx, entry_id, user_text (truncated to 80 chars) */
  session_overview: Array<{
    idx: number;
    entry_id: string;
    user_text: string;
  }>;
}

/** Turn boundary info used by buildTurnIndex() */
export interface TurnBoundary {
  entry_id: string;
  line_number: number;
  user_text: string;
}

/** Parsed HTML export data */
export interface HtmlSessionData {
  header?: Record<string, unknown>;
  entries: JsonlEntry[];
  [key: string]: unknown;
}
