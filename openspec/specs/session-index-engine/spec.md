# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-index-engine`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: ✅ 用户于 2026-05-08 确认

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: sqlite-schema-creation

The system SHALL create a SQLite database at `~/.pi/session-browse/index.db` with three tables on first use: `sessions`, `session_fts` (FTS5 virtual table), and `entries`.

- The `sessions` table SHALL have columns: `path` (PK), `project`, `session_ts`, `mtime_ms`, `first_user_message`.
- The `session_fts` virtual table SHALL use FTS5 with `porter unicode61` tokenizer and columns: `content`, `session_path` (UNINDEXED), `entry_id` (UNINDEXED), `line_number` (UNINDEXED), `role` (UNINDEXED).
- The `entries` table SHALL have columns: `session_path`, `entry_id`, `parent_id`, `line_number`, `role`, `timestamp`, `has_text`, `tool_names`, with composite PK (`session_path`, `entry_id`).
- SQLite SHALL run in WAL mode.

#### Scenario: fresh-database-creation
- **WHEN** the extension is loaded for the first time and `~/.pi/session-browse/index.db` does not exist
- **THEN** the system SHALL create the file and all three tables with correct schema

#### Scenario: existing-database-reuse
- **WHEN** the extension is loaded and `~/.pi/session-browse/index.db` already exists
- **THEN** the system SHALL reuse the existing database and SHALL NOT overwrite or recreate tables

### Requirement: jsonl-session-discovery

The system SHALL discover JSONL session files at `~/.pi/agent/sessions/<project-hash>/` by scanning all subdirectories for files with `.jsonl` extension.

- The system SHALL extract the project name from the directory path.
- The system SHALL record each discovered file's `mtime_ms` for incremental indexing.

#### Scenario: discover-existing-sessions
- **WHEN** the system scans `~/.pi/agent/sessions/`
- **THEN** it SHALL return all `.jsonl` files grouped by project directory

#### Scenario: no-sessions-directory
- **WHEN** the `~/.pi/agent/sessions/` directory does not exist
- **THEN** the system SHALL gracefully handle this and return an empty file list without error

### Requirement: per-entry-content-extraction

The system SHALL extract indexable content from each JSONL session entry based on its type:

- For `user` entries: extract `content[].text` blocks in full.
- For `assistant` entries: extract `content[].text` blocks only; skip `content[].thinking` blocks.
- For `toolCall` assistant entries: extract the tool `name` and stringified `arguments`.
- For `toolResult` entries: extract `content[].text` truncated to 2000 characters.

Non-message entries (`model_change`, `thinking_level_change`, `compaction`, `label`, `session_info`) SHALL NOT be indexed.

#### Scenario: extract-user-entry
- **WHEN** processing a `message` entry with `role: user` and `content[0].text = "你好请解释架构"`
- **THEN** the extracted index text SHALL include the full "你好请解释架构" string

#### Scenario: extract-assistant-thinking-skipped
- **WHEN** processing a `message` entry with `role: assistant` containing a `content[].thinking` block
- **THEN** the thinking block SHALL NOT appear in the index text; only `content[].text` SHALL be indexed

#### Scenario: extract-toolresult-truncated
- **WHEN** processing a `toolResult` entry whose `content[].text` exceeds 2000 characters
- **THEN** the index text SHALL be truncated to 2000 characters

### Requirement: incremental-indexing

The system SHALL support incremental indexing based on file modification time (`mtime_ms`).

- On each index run, the system SHALL compare each discovered session file's current `mtime_ms` against the value stored in the `sessions` table.
- Files with a newer `mtime_ms` SHALL be re-indexed (delete old entries + insert new ones).
- New files not yet in the `sessions` table SHALL be fully indexed.
- The `sessions` table SHALL be updated with the latest `mtime_ms` after indexing.

#### Scenario: index-new-session
- **WHEN** a new `.jsonl` file appears in `~/.pi/agent/sessions/`
- **THEN** the system SHALL index all entries from that file and add it to the `sessions` table

#### Scenario: re-index-updated-session
- **WHEN** an existing `.jsonl` file's modification time has changed
- **THEN** the system SHALL delete its old entries from `session_fts` and `entries`, then re-index all entries

### Requirement: full-text-search

The system SHALL provide a `search()` function that queries the `session_fts` virtual table using FTS5 BM25 ranking and returns entry-level results.

- The function SHALL accept a string `query` and an optional `session_path` filter.
- The query SHALL support FTS5 syntax (AND/OR, phrase, prefix).
- The system SHALL sanitize the query to prevent FTS5 syntax errors.
- Results SHALL include: `entry_id`, `session_path`, `role`, `timestamp`, `line_number`, and a `snippet` of the matched content.
- Results SHALL be sorted by BM25 relevance (highest first).
- The function SHALL limit results to a configurable maximum (default 30).

#### Scenario: search-across-sessions
- **WHEN** the user searches for "rate limit" across all indexed sessions
- **THEN** the system SHALL return all matching entries from all sessions, sorted by relevance

#### Scenario: search-in-specific-session
- **WHEN** the user searches for "rate limit" with a specific `session_path` filter
- **THEN** the system SHALL return only results from that specific session file

#### Scenario: search-no-results
- **WHEN** the search query matches no entries
- **THEN** the system SHALL return an empty result list without error

#### Scenario: search-invalid-query
- **WHEN** the search query contains characters that could cause FTS5 syntax errors
- **THEN** the system SHALL sanitize the query before execution to prevent errors

### Requirement: recent-sessions-list

The system SHALL provide a `listRecent()` function that returns a list of recently indexed sessions, ordered by `session_ts` descending.

#### Scenario: list-recent-sessions
- **WHEN** called without arguments
- **THEN** the system SHALL return all sessions in the index, ordered by timestamp (newest first)

### Requirement: index-rebuild

The system SHALL provide a `rebuildIndex()` function that deletes all indexed data and re-indexes all discovered session files from scratch.

#### Scenario: rebuild-full-index
- **WHEN** `rebuildIndex()` is called
- **THEN** the system SHALL clear all rows from `session_fts`, `entries`, and `sessions` tables, then discover and index all session files
