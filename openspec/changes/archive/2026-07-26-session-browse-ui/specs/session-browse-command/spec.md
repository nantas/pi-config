# Specification Delta

## Capability 对齐（已确认）

- Capability: `session-browse-command`
- 来源: `proposal.md` 已确认 capabilities
- 变更类型: new
- 用户确认摘要: ✅ 用户于 2026-05-08 确认

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: sb-command-registration

The system SHALL register a command named `sb` using `pi.registerCommand()`.

- The command SHALL have description "Search and browse historical Pi sessions."
- The command SHALL accept an optional query string argument.
- The command SHALL be available for invocation by human users via `/sb [query]`.

#### Scenario: register-sb-command
- **WHEN** the extension is loaded
- **THEN** `/sb` SHALL appear in the list of available commands

### Requirement: sb-search-results

When invoked with a query argument (`/sb <query>`), the system SHALL:

1. Call `indexer.search(query)` to retrieve matching entries
2. Display a numbered list of results, each showing: `[N] timestamp role | snippet`
3. If no results match, display a "no results" message

#### Scenario: sb-search-with-results
- **WHEN** the user types `/sb rate limit`
- **THEN** the system SHALL call `search("rate limit")` and display matching results as a numbered list

#### Scenario: sb-search-no-results
- **WHEN** the user types `/sb xyzzy`
- **THEN** the system SHALL display a message indicating no results were found

#### Scenario: sb-search-no-query
- **WHEN** the user types `/sb` without arguments
- **THEN** the system SHALL display a help tip: "Usage: /sb <query>" and optionally list recent sessions

### Requirement: sb-result-selection

After displaying search results, the system SHALL allow the user to interact with results by typing a number:

- Typing a number corresponding to a result SHALL call `expander.buildTurnFromEntryId()` and display the full turn context
- After displaying the turn, the system SHALL offer options: `[r] read raw entry`, `[b] back to results`, `[q] quit`
- Typing `r` SHALL fetch the full raw entry content (via JSONL parse or `html-parser.readHtmlEntry()`)
- Typing `b` SHALL return to the search result list
- Typing `q` or pressing Enter SHALL exit the command

#### Scenario: sb-select-result
- **WHEN** the user types `2` after seeing search results
- **THEN** the system SHALL expand the turn for result #2 and display its context

#### Scenario: sb-read-entry-from-expand
- **WHEN** the user types `r` after seeing an expanded turn
- **THEN** the system SHALL display the full raw content of the selected entry

#### Scenario: sb-back-to-results
- **WHEN** the user types `b` after seeing an expanded turn
- **THEN** the system SHALL re-display the search result list

### Requirement: sb-keyboard-shortcut

The system SHALL register a keyboard shortcut `Cmd+Shift+F`:

- The shortcut SHALL have label "Session Browse"
- The shortcut handler SHALL invoke the `/sb` command pre-filled in the input prompt

#### Scenario: ctrl-shift-f-shortcut
- **WHEN** the user presses `Cmd+Shift+F`
- **THEN** the input prompt SHALL be populated with `/sb ` ready for the user to type a query

### Requirement: sb-error-handling

The command SHALL handle error conditions gracefully:

- If the index database is not initialized, the command SHALL trigger an index update automatically
- If `buildTurnFromEntryId()` returns null (entry not found), display appropriate error
- All errors SHALL be displayed as user-friendly messages, not stack traces

#### Scenario: sb-index-not-ready
- **WHEN** the user runs `/sb` before any indexing has occurred
- **THEN** the system SHALL call `updateIndex()` automatically and then proceed with the search
