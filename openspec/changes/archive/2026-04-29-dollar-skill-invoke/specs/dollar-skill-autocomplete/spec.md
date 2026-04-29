# Specification Delta

## Capability 对齐（已确认）

- Capability: `dollar-skill-autocomplete`
- 来源: `proposal.md` / 需求确认 B1-B5
- 变更类型: new
- 用户确认摘要: `$` 仅匹配 skill，任意位置触发，支持模糊过滤，含 disableModelInvocation 的 skill

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

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
