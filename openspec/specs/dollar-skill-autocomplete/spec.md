# Specification: dollar-skill-autocomplete

## Purpose

Defines the behavior for `$`-prefixed skill autocomplete in the Pi TUI editor. When the user types `$` followed by characters, the system displays a filtered list of available skills for completion.

## Requirements

### Requirement: Dollar-Prefixed Skill Completion
The system SHALL trigger skill autocomplete when the user types `$` followed by alphanumeric characters and hyphens.

#### Scenario: Dollar at start of input
- **WHEN** the user types `$` at the beginning of the input line
- **THEN** the autocomplete panel SHALL display all available skills (including those with `disableModelInvocation: true`), filtered by the characters after `$`

#### Scenario: Dollar mid-input
- **WHEN** the user types `$` in the middle of the input line (e.g., `hello $my-`)
- **THEN** the autocomplete panel SHALL display skills matching the token `my-` at the cursor position

#### Scenario: Fuzzy matching
- **WHEN** the user types a partial skill name after `$`
- **THEN** the autocomplete SHALL use fuzzy matching (`fuzzyFilter`) on the skill name (without the `skill:` prefix) to return sorted results

#### Scenario: No matching skills
- **WHEN** the user types `$` followed by text that matches no known skill
- **THEN** no autocomplete panel SHALL appear, and the behavior SHALL fall through to any other autocomplete providers

#### Scenario: Completion application
- **WHEN** the user selects a skill from the `$` autocomplete list
- **THEN** the token SHALL be replaced with `$skill-name` (with a trailing space), and the editor SHALL remain at the end of the completed token

### Requirement: Escaped Dollar Ignored
The system SHALL NOT trigger autocomplete for `$` tokens that are preceded by an odd number of backslashes (escaped).

#### Scenario: Escaped dollar sign
- **WHEN** the user types `\$my-skill`
- **THEN** no skill autocomplete SHALL be triggered, and the input SHALL be treated as literal text

#### Scenario: Double backslash dollar
- **WHEN** the user types `\\$my-skill`
- **THEN** the system SHALL treat this as an unescaped `$` (the double backslash is an escaped backslash) and SHALL trigger skill autocomplete

### Requirement: Skills Source from getCommands
The system SHALL use `pi.getCommands()` filtered by `source === "skill"` to obtain the skill list for autocomplete.

#### Scenario: Skill list refresh on reload
- **WHEN** the user runs `/reload` (or skills are reloaded by the system)
- **THEN** the next autocomplete query SHALL reflect the updated skill list (lazy lookup via `pi.getCommands()`)

### Requirement: Editor Auto-Trigger on `$`
The TUI editor SHALL auto-trigger autocomplete when `$` is typed at a token boundary (start of line or after whitespace).

#### Scenario: Trigger on dollar keypress
- **WHEN** the user types `$` at a token boundary
- **THEN** the editor SHALL immediately invoke the autocomplete provider without requiring Tab

#### Scenario: Backslash-escaped dollar no trigger
- **WHEN** the user types `\$` (escaped dollar)
- **THEN** the editor SHALL NOT trigger autocomplete and SHALL treat `\$` as literal text
