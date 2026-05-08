# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-resume-command`
- 来源: `proposal.md` 已确认 capabilities
- 变更类型: new
- 用户确认摘要: ✅ 用户于 2026-05-08 确认

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: sr-command-registration

The system SHALL register a command named `sr` using `pi.registerCommand()`.

- The command SHALL have description "List recent sessions and resume a previous conversation."
- The command SHALL accept an optional session identifier argument.
- The command SHALL be available for invocation by human users via `/sr [session_id_or_index]`.

#### Scenario: register-sr-command
- **WHEN** the extension is loaded
- **THEN** `/sr` SHALL appear in the list of available commands

### Requirement: sr-list-recent-sessions

When invoked without arguments (`/sr`), the system SHALL:

1. Call `indexer.listRecent()` to retrieve indexed sessions
2. Display a numbered list, each showing: `[N] project | timestamp | first_user_message[:60]`
3. Display the total count at the bottom
4. If no sessions are indexed, trigger `updateIndex()` first, or display a "no sessions indexed yet" message

#### Scenario: sr-list-sessions
- **WHEN** the user types `/sr`
- **THEN** the system SHALL display a numbered list of recently indexed sessions

#### Scenario: sr-no-indexed-sessions
- **WHEN** there are no indexed sessions
- **THEN** the system SHALL display a message: "No sessions indexed yet. Run a few Pi sessions first, then try again."

### Requirement: sr-resume-by-selection

After displaying the session list, the system SHALL allow the user to type a number to select a session:

- Typing a number SHALL invoke `ctx.commandContextActions.switchSession(sessionPath)` or equivalent Pi API to resume that session
- The system SHALL first confirm the session path exists and is a JSONL file
- If the session is an HTML file, display "Resume not supported for HTML exports (JSONL only)"

#### Scenario: sr-resume-by-number
- **WHEN** the user types `2` after seeing the session list
- **THEN** the system SHALL call switchSession for the selected session path

#### Scenario: sr-resume-by-path
- **WHEN** the user types `/sr path/to/session.jsonl`
- **THEN** the system SHALL directly attempt to resume that session

### Requirement: sr-resume-jsonl-only

The system SHALL only support resume for JSONL session files:

- If the selected session path ends with `.html`, display "Resume not supported for HTML exports."
- If the file does not exist, display "Session file not found: <path>"

#### Scenario: sr-resume-html-rejected
- **WHEN** the user selects an HTML export file for resume
- **THEN** the system SHALL display a rejection message

### Requirement: sr-keyboard-shortcut

The system SHALL register a keyboard shortcut `Cmd+Shift+R`:

- The shortcut SHALL have label "Session Resume"
- The shortcut handler SHALL invoke the `/sr` command

#### Scenario: ctrl-shift-r-shortcut
- **WHEN** the user presses `Cmd+Shift+R`
- **THEN** the `/sr` command SHALL execute, displaying the recent sessions list

### Requirement: sr-error-handling

The command SHALL handle error conditions gracefully:

- If `switchSession()` fails, display a clear error message
- If `listRecent()` returns empty, suggest the user run `/sb` first to trigger indexing
- All errors SHALL be displayed as user-friendly messages

#### Scenario: sr-switch-session-failure
- **WHEN** `switchSession()` raises an error for the selected session
- **THEN** the system SHALL display a user-friendly error message without crashing
