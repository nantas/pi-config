# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-retrieval-tools`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: ✅ 用户于 2026-05-08 确认

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: session-search-tool

The system SHALL register an LLM-callable tool named `session-search` using `pi.registerTool`.

- **Tool name**: `session-search`
- **Description**: SHALL describe the tool as "搜索历史 Pi session 中的相关条目。返回匹配的 entry 摘要列表。"
- **Parameters**:
  - `query` (String, required): 搜索关键词
  - `session_path` (String, optional): 指定 session 文件路径 (JSONL 或 HTML)
- **Schema**: SHALL use `@sinclair/typebox` `Type.Object()` for parameter definition.

The tool SHALL call the index engine's `search()` function and format results as a human-readable list. Each result entry SHALL include:
- Timestamp
- Role (user / assistant / toolResult)
- Entry ID
- A snippet of matched text

#### Scenario: search-tool-basic
- **WHEN** the LLM calls `session-search` with query="rate limit"
- **THEN** the tool SHALL return a formatted list of matching entries from all sessions

#### Scenario: search-tool-with-path
- **WHEN** the LLM calls `session-search` with query="rate limit" and `session_path="/path/to/session.jsonl"`
- **THEN** the tool SHALL return only results from that specific session file

#### Scenario: search-tool-message-format
- **WHEN** the LLM receives tool output
- **THEN** each entry SHALL be formatted as: `[timestamp] role id=entry_id | snippet`

### Requirement: session-expand-tool

The system SHALL register an LLM-callable tool named `session-expand` using `pi.registerTool`.

- **Tool name**: `session-expand`
- **Description**: SHALL describe the tool as "展开指定 entry 所在的完整 user turn。输出: user text + 所有 assistant text + tool name 列表。"
- **Parameters**:
  - `entry_id` (String, required): 从 session-search 获得的 entry ID
  - `session_path` (String, required): session 文件路径
- **Schema**: SHALL use `@sinclair/typebox` `Type.Object()` for parameter definition.

The tool SHALL implement the turn expansion algorithm:
1. Locate the entry by `entry_id` in the specified session
2. Search backward to find the nearest preceding `user` entry (the turn start)
3. Collect all entries from turn start until the next `user` entry (exclusive)
4. Format output as: `USER: <full text>` followed by each `ASST` entry showing its text blocks and tool calls (without toolResult details)

#### Scenario: expand-turn-from-assistant-hit
- **WHEN** the LLM calls `session-expand` with an `entry_id` that belongs to an assistant entry
- **THEN** the tool SHALL locate the turn start user entry and return the full turn context

#### Scenario: expand-turn-from-user-hit
- **WHEN** the LLM calls `session-expand` with an `entry_id` that belongs to a user entry
- **THEN** the tool SHALL use that entry as the turn start and include subsequent entries

#### Scenario: expand-output-format
- **WHEN** the LLM receives tool output
- **THEN** the output SHALL show `USER:` line with full text, then each `ASST:` with text content and `→ called tool1(), tool2()` for tool calls
- **THEN** toolResult content SHALL NOT be included in the expand output

### Requirement: session-read-tool

The system SHALL register an LLM-callable tool named `session-read` using `pi.registerTool`.

- **Tool name**: `session-read`
- **Description**: SHALL describe the tool as "读取指定 entry 的完整内容（含 toolResult）。用于需要查看工具输出细节的场景。"
- **Parameters**:
  - `entry_id` (String, required): entry ID
  - `session_path` (String, required): session 文件路径
  - `max_chars` (Number, optional): 截断长度，默认 5000

The tool SHALL read the raw entry content from the specified session file and return it. If the content exceeds `max_chars`, it SHALL be truncated.

#### Scenario: read-entry-full
- **WHEN** the LLM calls `session-read` with an entry_id and session_path
- **THEN** the tool SHALL return the complete raw content of that entry

#### Scenario: read-entry-truncated
- **WHEN** the LLM calls `session-read` for a toolResult entry whose text exceeds `max_chars`
- **THEN** the returned content SHALL be truncated at the specified character limit with a truncation indicator

### Requirement: tool-error-handling

All three tools SHALL handle common error conditions gracefully:
- If the specified `session_path` does not exist, return an error message.
- If the specified `entry_id` is not found, return an error message.
- If the index database does not exist (not yet initialized), return a message suggesting to run search first.
- All errors SHALL be returned as structured error messages, not thrown exceptions.

#### Scenario: invalid-session-path
- **WHEN** the LLM calls any tool with a `session_path` that does not exist
- **THEN** the tool SHALL return a clear error message indicating the file was not found

#### Scenario: index-not-initialized
- **WHEN** the LLM calls `session-search` before any indexing has occurred
- **THEN** the tool SHALL automatically trigger indexing or return a message indicating no sessions have been indexed yet
