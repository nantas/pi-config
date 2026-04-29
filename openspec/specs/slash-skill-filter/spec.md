# Specification: slash-skill-filter

## Purpose

Defines the behavior for filtering out skill commands (`skill:xxx`) from the `/` prefix autocomplete list. The autocomplete panel still shows builtin commands, extension commands, and prompt templates — skill entries are silently excluded.

## Requirements

### Requirement: Slash Autocomplete Skill Exclusion
The system SHALL, when the user types `/` to trigger built-in slash command autocomplete, exclude all skill commands (entries with value prefix `skill:`) from the completion list.

#### Scenario: Slash without skill entries
- **WHEN** the user types `/` at the beginning of the input line
- **THEN** the autocomplete panel SHALL list only builtin commands, extension commands, and prompt templates, with NO `skill:xxx` entries

#### Scenario: Slash partial match without skill entries
- **WHEN** the user types `/sk` to filter commands
- **THEN** the results SHALL NOT include items like `skill:my-skill`, even if they match the prefix `sk`

### Requirement: Delegate-Then-Filter Pattern
The system SHALL delegate autocomplete to the original provider and then filter out skill entries, rather than reimplementing slash autocomplete logic.

#### Scenario: Results filtering
- **WHEN** the original autocomplete provider returns results for a `/` prefix query
- **THEN** the wrapper SHALL filter the `items` array to remove entries where `value` starts with `skill:`

#### Scenario: Non-slash fallback
- **WHEN** the user is not in a `/` autocomplete context (no slash prefix)
- **THEN** the wrapper SHALL delegate to the original provider and SHALL NOT apply the skill filter

### Requirement: Skill Command Coexistence
The system SHALL NOT disable the `/skill:name` execution mechanism — both `$skill-name` and `/skill:name` SHALL remain valid ways to invoke a skill.

#### Scenario: Slash skill command still works
- **WHEN** the user types `/skill:my-skill` (without using autocomplete) and submits
- **THEN** the system SHALL still expand the skill normally via the existing `_expandSkillCommand` pipeline
