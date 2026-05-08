# Specification Delta

## Capability 对齐（已确认）

- Capability: `html-export-support`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: ✅ 用户于 2026-05-08 确认

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: html-file-discovery

The system SHALL discover HTML session export files at `.pi/sessions/` by scanning for files with `.html` extension.

- The system SHALL also accept any `.html` file path specified by the user via tool parameters.
- HTML files SHALL be discovered alongside JSONL files during the index update scan.

#### Scenario: discover-html-exports
- **WHEN** the system scans for session files
- **THEN** it SHALL return both `.jsonl` files from `~/.pi/agent/sessions/` and `.html` files from `.pi/sessions/`

#### Scenario: no-html-exports
- **WHEN** the `.pi/sessions/` directory does not exist or contains no `.html` files
- **THEN** the system SHALL gracefully continue with only JSONL files without error

### Requirement: html-data-extraction

The system SHALL extract structured session data from HTML export files.

- The system SHALL locate the `<script id="session-data" type="application/json">` element in the HTML.
- The content of this element SHALL be a base64-encoded JSON string.
- The system SHALL decode the base64 payload and parse it as JSON.
- The parsed JSON SHALL contain an `entries` array with the same entry structure as JSONL files.
- For large files (base64 payload > 1MB), the system SHALL use `indexOf()` + `slice()` for extraction instead of `String.match()` to avoid performance issues.

#### Scenario: parse-html-export
- **WHEN** processing a valid HTML export file
- **THEN** the system SHALL successfully extract the base64 payload, decode it, and parse the entries array

#### Scenario: html-no-session-data
- **WHEN** processing an HTML file that does not contain the `session-data` script element
- **THEN** the system SHALL skip the file and log a warning without crashing

### Requirement: html-entries-feed-into-index-engine

The entries extracted from HTML export files SHALL be processed through the same indexing pipeline as JSONL entries.

- The system SHALL apply the same per-entry content extraction rules (user/assistant/toolResult handling, truncation, thinking skip).
- The extracted entries SHALL be inserted into the same `session_fts` and `entries` tables.
- The `sessions` table SHALL record HTML files with their `mtime_ms` for incremental indexing.
- The entry metadata (entry_id, parent_id, timestamp, role, etc.) SHALL be preserved from the HTML data.

#### Scenario: index-html-entries
- **WHEN** an HTML export file is discovered during index update
- **THEN** its entries SHALL be indexed into the same FTS5 index as JSONL entries, searchable via `session-search`

### Requirement: html-read-support

The `session-read` tool SHALL support reading individual entries from HTML export files, not just JSONL.

- When reading an entry from an HTML file, the system SHALL parse the HTML, extract the entries array, and locate the specific entry by `entry_id`.

#### Scenario: read-entry-from-html
- **WHEN** the LLM calls `session-read` with a `session_path` pointing to an `.html` file
- **THEN** the tool SHALL parse the HTML, find the specified entry, and return its raw content

### Requirement: html-no-resume

The system SHALL NOT support session resume from HTML export files. If the LLM or user attempts to use resume with an HTML file, the system SHALL return an error indicating that resume is not supported for HTML exports.

#### Scenario: html-resume-error
- **WHEN** the system is asked to resume a session from an HTML file
- **THEN** it SHALL return an error message explaining that resume is only supported for JSONL files
