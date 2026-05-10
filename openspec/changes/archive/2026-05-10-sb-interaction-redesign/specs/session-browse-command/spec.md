# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-browse-command`
- 来源: `proposal.md` Modified Capabilities
- 变更类型: modified
- 用户确认摘要: ✅ 2026-05-09 explore session 中确认交互流变更

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: sb-search-results

When invoked with a query argument (`/sb <query>`), the system SHALL:

1. Call `searchGrouped()` to retrieve matching entries grouped by session with role-weighted ranking
2. Display a session-level list using `ctx.ui.custom()` + `SelectList` with viewport scrolling
3. Each session option SHALL show: project name, last message timestamp, first user message (≤40 chars), hit count
4. If no results match, display a "no results" message

#### Scenario: sb-search-with-multiple-sessions
- **WHEN** the user types `/sb rate limit` and results span 5 sessions
- **THEN** the system SHALL display a paginated session list with 5 entries, each showing project/timestamp/first-message/hits

#### Scenario: sb-search-no-results
- **WHEN** the user types `/sb xyzzy`
- **THEN** the system SHALL display "No matching entries found. Try different keywords."

#### Scenario: sb-search-no-query
- **WHEN** the user types `/sb` without arguments
- **THEN** the system SHALL display "Usage: /sb <query>" notification

### Requirement: sb-result-selection

After the user selects a session, the system SHALL display paginated search hits within that session using `SelectList(maxVisible=5)` with left/right page navigation. The user MAY toggle a turn preview overlay with Space. On confirmation (Enter), the system SHALL offer: [e] explore with agent / [b] back / [q] quit.

#### Scenario: sb-browse-session-hits
- **WHEN** the user selects a session with 12 hits
- **THEN** the system SHALL show a paginated hit list, 5 per page, with left/right navigation

#### Scenario: sb-explore-with-agent
- **WHEN** the user selects "explore with agent" after choosing a hit
- **THEN** the system SHALL call `setEditorText()` with a prompt containing session path and entry ID

#### Scenario: sb-back-to-session-list
- **WHEN** the user presses Escape on the hit list
- **THEN** the system SHALL return to the session list

## REMOVED Requirements

### Requirement: sb-read-entry-from-expand
**Reason**: Replaced by turn preview overlay (Space toggle) and agent-driven exploration. Direct raw entry reading is no longer a user-facing operation.
**Migration**: Users who need raw entry content should use "explore with agent" which gives the agent session-read access.

### Requirement: sb-back-to-results
**Reason**: Replaced by Space toggle and Escape navigation. The explicit "back to results" button is no longer needed because the preview is an overlay that closes with Space/Esc.
**Migration**: Space toggles preview on/off; Escape returns to hit list or session list.

## RENAMED Requirements

- FROM: `### Requirement: sb-keyboard-shortcut` (Cmd+Shift+F prefills `/sb `)
- TO: `### Requirement: sb-keyboard-shortcut` (behavior unchanged, no rename needed)
