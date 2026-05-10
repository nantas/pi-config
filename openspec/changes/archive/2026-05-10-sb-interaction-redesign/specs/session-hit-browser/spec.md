# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-hit-browser`
- 来源: `proposal.md` New Capabilities
- 变更类型: new
- 用户确认摘要: ✅ 2026-05-09 explore session 中确认两级分页浏览设计

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: session-list-level

The system SHALL display search results grouped by session as a two-level interaction. The first level SHALL present a list of matching sessions, each showing: project name, last message timestamp, first user message (truncated to 40 chars), and hit count. This list SHALL use `ctx.ui.custom()` with `SelectList` for viewport scrolling.

#### Scenario: query-matches-multiple-sessions
- **WHEN** the user runs `/sb session browse` and the query matches entries across 7 different sessions
- **THEN** the system SHALL display a selectable list of 7 sessions, each showing project name, timestamp, first user message preview, and hit count, with viewport scrolling

#### Scenario: query-matches-single-session
- **WHEN** the query matches entries in only one session
- **THEN** the system SHALL display that single session as the only option

#### Scenario: no-sessions-match
- **WHEN** the query matches no entries
- **THEN** the system SHALL display "No matching entries found. Try different keywords."

### Requirement: session-hit-level

After the user selects a session, the system SHALL display search hits within that session as a paginated list. Each hit SHALL show: timestamp, role, and content snippet (truncated to 80 chars). The list SHALL use `SelectList` with `maxVisible=5`. The system SHALL support left/right keyboard navigation for page turns.

#### Scenario: session-with-many-hits
- **WHEN** the user selects a session with 17 matching hits
- **THEN** the system SHALL display the first 5 hits, with a pager showing "Page 1/4 (1-5 of 17)"

#### Scenario: hit-list-page-navigation
- **WHEN** the user presses Right arrow on page 1 of 4
- **THEN** the system SHALL display hits 6-10 with pager showing "Page 2/4 (6-10 of 17)"

#### Scenario: hit-list-page-navigation-bounds
- **WHEN** the user presses Right arrow on the last page
- **THEN** the system SHALL stay on the last page (no wrap-around)

### Requirement: turn-preview-overlay

The system SHALL allow toggling a turn preview overlay by pressing Space on a selected hit. The preview SHALL display the full turn context (user message + all assistant entries + tool call summaries) in a read-only scrollable view. The overlay SHALL close on Space or Escape, returning to the hit list with selection state preserved.

#### Scenario: toggle-preview-open
- **WHEN** the user presses Space on hit #2
- **THEN** the system SHALL display a turn preview overlay showing the complete turn content starting from that hit's user entry

#### Scenario: preview-scrolling
- **WHEN** the turn preview content exceeds the visible area
- **THEN** the system SHALL support up/down arrow keys and mouse scroll to navigate the content

#### Scenario: toggle-preview-close
- **WHEN** the user presses Space or Escape while the preview is open
- **THEN** the system SHALL close the preview and return to the hit list, preserving the current selection and page state

### Requirement: explore-with-agent-action

After the user selects a hit (with or without preview), the system SHALL offer an "explore with agent" action. When chosen, the system SHALL call `ctx.ui.setEditorText()` with a prompt containing session path and entry ID, allowing the user to press Enter to send the prompt to the main agent.

#### Scenario: select-explore-action
- **WHEN** the user presses Enter on a hit and selects "explore with agent"
- **THEN** the system SHALL inject a prompt into the editor containing the session path and entry ID, formatted for the agent to use session-expand/read tools

#### Scenario: agent-prompt-format
- **WHEN** the explore action is triggered for entry "fb879780" in session "2026-05-09T14-55..."
- **THEN** the injected prompt SHALL contain the session path, entry ID, and instructions for the agent to use session-expand and session-read to locate and summarize the turn

### Requirement: search-ranking-weighting

The system SHALL apply role-based weighting to search results, prioritizing user and assistant entries over toolResult entries. This applies to both the session-level hit count ranking and the within-session hit ordering.

#### Scenario: role-weighting-order
- **WHEN** a query matches 3 user entries, 5 assistant entries, and 20 toolResult entries in the same session
- **THEN** the within-session hit list SHALL show user and assistant entries before toolResult entries

### Requirement: back-navigation

The system SHALL support navigation back from the hit list to the session list, and from the session list to exit.

#### Scenario: back-from-hit-list
- **WHEN** the user presses Escape on the hit list level
- **THEN** the system SHALL return to the session list level

#### Scenario: back-from-session-list
- **WHEN** the user presses Escape on the session list level
- **THEN** the system SHALL exit the `/sb` command

---

### Requirement: session-iterate-tool

The system SHALL provide a `session-iterate` LLM tool that enables agents to navigate session timelines turn-by-turn and retrieve global session structure. This tool SHALL be registered via `pi.registerTool()` alongside the existing `session-search`, `session-expand`, and `session-read` tools.

**Navigation**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_path` | string | Target session file path |
| `entry_id` | optional string | Starting entry ID (first call from session-browse) |
| `turn_index` | optional number | Direct turn index (0-based) as alternative to entry_id |
| `direction` | "next" \| "prev" \| "start" \| "end" | Navigation direction or jump target |
| `steps` | optional number | Step count for next/prev (default: 1) |
| `mode` | optional "full" \| "summary" | Output mode (default: "full") |
| `max_chars` | optional number | Text truncation limit for full mode |

**Output**

The tool SHALL return a structured response containing:
- `position`: SessionPosition object (entry_id, turn_index, total_turns, is_first, is_last)
- `turn` or `summary`: The turn content at the new position (full or summarized)
- `session_overview`: Array of all turns in the session, each with idx, entry_id, and user_text (truncated to 80 chars)

#### Scenario: quick-global-view
- **WHEN** the agent calls `session-iterate(session_path, entry_id, direction="end", mode="summary")`
- **THEN** the tool SHALL return:
  - `position` pointing to the last turn in the session
  - `summary` containing the last turn's compressed content (user text to 200 chars, each assistant text to 200 chars, tool call names list)
  - `session_overview` listing all turns with user text summaries

#### Scenario: step-forward-to-next-turn
- **WHEN** the agent calls `session-iterate(session_path, entry_id, direction="next", steps=3, mode="full")`
- **THEN** the tool SHALL advance 3 turns forward from the entry's turn, and return the turn at that position with full context (same format as session-expand)

#### Scenario: step-backward
- **WHEN** the agent calls `session-iterate(session_path, entry_id, direction="prev", steps=1, mode="summary")`
- **THEN** the tool SHALL move to the preceding turn and return its summary

#### Scenario: navigate-by-turn-index
- **WHEN** the agent calls `session-iterate(session_path, turn_index=5, direction="start", mode="summary")`
- **THEN** the tool SHALL jump to turn 0 and return its summary (ignoring turn_index for jump target, using it only to identify the current position context)

#### Scenario: navigate-past-boundaries
- **WHEN** the agent calls `direction="prev"` from turn 0, or `direction="next"` from the last turn
- **THEN** the tool SHALL clamp to the boundary position and SHALL indicate `is_first=true` or `is_last=true` in the position object

#### Scenario: session-overview-always-included
- **WHEN** the agent calls `session-iterate` with any direction or mode
- **THEN** the response SHALL always include `session_overview` with the full list of turns in the session (each with idx, entry_id, user_text)

#### Scenario: large-session-overview-truncation
- **WHEN** the session has more than 80 turns
- **THEN** `session_overview` SHALL include only the first 80 turns to control response size

#### Scenario: unknown-entry-id
- **WHEN** the agent calls with an `entry_id` that does not exist in the session
- **THEN** the tool SHALL return an error: "entry_id not found in session"

#### Scenario: unindexed-session
- **WHEN** the index has not yet been built for the session
- **THEN** the tool SHALL trigger `ensureIndexed()` automatically before querying
