# Specification Delta

## Capability 对齐（已确认）

- Capability: `slash-skill-filter`
- 来源: `proposal.md` / 需求确认 B6b
- 变更类型: new
- 用户确认摘要: `/` 自动补全不再列出 skill，通过 extension autocomplete wrapper 过滤 `skill:xxx` 条目

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

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
