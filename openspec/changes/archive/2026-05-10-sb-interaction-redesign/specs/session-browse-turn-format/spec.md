# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-browse-turn-format`
- 来源: `proposal.md` Modified Capabilities
- 变更类型: modified
- 用户确认摘要: ✅ 2026-05-09 explore session 中确认格式增强要求

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: turn-output-format

The `formatTurn()` function SHALL produce output with the following structure:

1. User text: display complete user message text without truncation, prefixed with `USER:`
2. For each assistant entry in the turn:
   a. Display complete assistant text (all text blocks concatenated) without truncation
   b. For each tool call: display on a single line as `→ name(args_summary)` where `args_summary` is the first parameter's value truncated to a fixed character width (60 chars)
3. toolResult entries SHALL be skipped (not displayed)
4. Each assistant entry SHALL be separated by a blank line

#### Scenario: turn-with-full-user-text
- **WHEN** a turn's user message is "Please check the session-browse implementation and confirm whether it has a browsing interface for sessions"
- **THEN** the output SHALL display the complete text under `USER:` without any truncation

#### Scenario: turn-with-multiple-assistant-entries
- **WHEN** a turn has two assistant entries, the first with text "Let me investigate..." and tool calls session-search + read, the second with text "Here are the findings..."
- **THEN** the output SHALL display both assistant entries sequentially, each with their full text and tool call summaries

#### Scenario: tool-call-args-summary
- **WHEN** an assistant entry has a tool call `session-search` with arguments `{query: "session browse UI interface", session_path: undefined}`
- **THEN** the output SHALL display `→ session-search(query="session browse UI interface")` on one line, truncated to 60 chars if longer

#### Scenario: tool-call-no-args
- **WHEN** an assistant entry has a tool call with no arguments
- **THEN** the output SHALL display `→ name()` on one line

### Requirement: turn-tool-call-one-line

Each tool call within a turn SHALL be rendered on exactly one line. The format SHALL be `→ tool_name(param1="value1")` using only the first parameter. If the rendered line exceeds 60 visible characters, it SHALL be truncated with `...`.

#### Scenario: tool-call-rendered-on-one-line
- **WHEN** an assistant entry makes a tool call `session-read` with parameters `{entry_id: "abc123", session_path: "/path/to/session.jsonl"}`
- **THEN** the output SHALL render it on exactly one line as `→ session-read(entry_id="abc123")` without wrapping

---

### Requirement: turn-summary-format

The system SHALL produce a compressed turn summary format for the `session-iterate` tool's `mode="summary"` output. The summary SHALL contain:

1. **user_text**: The user's message text truncated to 200 visible characters
2. **entries[]**: For each assistant entry in the turn:
   - `role`: always "assistant"
   - `text_summary`: The assistant's text blocks concatenated, then truncated to 200 visible characters. If the assistant entry has no text (tool-call-only), `text_summary` SHALL be empty string.
   - `tool_calls`: Array of tool names called by this assistant entry (e.g., `["read", "grep", "edit"]`)
3. **total_text_chars**: Total character count of the turn's text content (before truncation)
4. **total_tool_calls**: Total number of tool calls across all assistant entries in this turn

#### Scenario: summary-with-text-and-tools
- **WHEN** a turn has user text "please refactor auth module", followed by an assistant entry with text "Let me investigate the current implementation" and tool calls ["read", "grep", "read"]
- **THEN** the summary SHALL contain:
  ```json
  user_text: "please refactor auth module",
  entries: [{
    role: "assistant",
    text_summary: "Let me investigate the current implementation",
    tool_calls: ["read", "grep", "read"]
  }]
  ```

#### Scenario: summary-tool-call-only
- **WHEN** an assistant entry has no text blocks, only tool calls
- **THEN** `text_summary` SHALL be empty string, and `tool_calls` SHALL list the tool names

#### Scenario: summary-multiple-assistant-entries
- **WHEN** a turn has 3 assistant entries (the first with text+tools, the second with text only, the third with tools only)
- **THEN** the entries array SHALL contain 3 items, each with appropriate text_summary and tool_calls

#### Scenario: tool-call-with-long-args
- **WHEN** a tool call `read` has arguments `{path: ".pi/extensions/session-browse/node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts"}`
- **THEN** the output SHALL display `→ read(path=".pi/extensions/session-browse/node_modules/...")` truncated to 60 chars

## REMOVED Requirements

### Requirement: turn-text-truncation
**Reason**: User and assistant text is now displayed in full without truncation. The turn preview overlay handles overflow via scrolling.
**Migration**: No migration needed; callers receive full text.
