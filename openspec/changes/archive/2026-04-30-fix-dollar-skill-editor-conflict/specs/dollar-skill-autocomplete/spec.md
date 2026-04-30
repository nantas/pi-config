# Specification Delta

## Capability 对齐（已确认）

- Capability: `dollar-skill-autocomplete`
- 来源: `proposal.md` / 需求确认
- 变更类型: modified
- 用户确认摘要: 移除 `Editor Auto-Trigger` requirement，改由 Tab 触发；移除 `DollarSkillEditor` 和 `setEditorComponent` 调用；`addAutocompleteProvider` chain 保持不变

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## REMOVED Requirements

### Requirement: Editor Auto-Trigger on `$`
**Reason**: 该 requirement 通过 `DollarSkillEditor`（extends `CustomEditor`）的 `handleInput` 方法实现，在每次键入 `$` 后调用 `tryTriggerAutocomplete()`。但 Pi 的 `ctx.ui.setEditorComponent()` 是独占替换 API —— 任何其他 extension 调用 `setEditorComponent` 后都会覆盖自定义 editor。`pi-powerline-footer` 在 `session_start` 中调用 `setEditorComponent`，导致该功能失效。

由于 Pi 框架不提供 editor handleInput 的组合/装饰 API，`$` auto-trigger 无法在不替换整个 editor 的前提下实现。

**Migration**: `$` 自动补全改为 Tab 触发。用户在输入 `$skill-name` 后按 Tab 即可触发补全面板。autocomplete provider chain 通过 `addAutocompleteProvider` 保持不变，$ 前缀检测逻辑完整保留。

## MODIFIED Requirements

### Requirement: Dollar-Prefixed Skill Completion (via Tab)
The system SHALL trigger skill autocomplete when the user types `$` followed by alphanumeric characters and hyphens, and presses Tab to invoke autocomplete.

#### Scenario: Dollar at start of input, Tab triggered
- **WHEN** the user types `$` at the beginning of the input line, continues typing a skill name, and presses Tab
- **THEN** the autocomplete panel SHALL display all available skills (including those with `disableModelInvocation: true`), filtered by the characters after `$`

#### Scenario: Dollar mid-input, Tab triggered
- **WHEN** the user types `$` in the middle of the input line (e.g., `hello $my-`) and presses Tab
- **THEN** the autocomplete panel SHALL display skills matching the token `my-` at the cursor position

#### Scenario: Fuzzy matching
- **WHEN** the user types a partial skill name after `$` and presses Tab
- **THEN** the autocomplete SHALL use fuzzy matching (`fuzzyFilter`) on the skill name (without the `skill:` prefix) to return sorted results

#### Scenario: No matching skills
- **WHEN** the user presses Tab after typing `$` followed by text that matches no known skill
- **THEN** no autocomplete panel SHALL appear, and the behavior SHALL fall through to any other autocomplete providers

#### Scenario: Completion application
- **WHEN** the user selects a skill from the `$` autocomplete list
- **THEN** the token SHALL be replaced with `$skill-name` (with a trailing space), and the editor SHALL remain at the end of the completed token

### Requirement: Escaped Dollar Ignored
（不变，同原 spec）

#### Scenario: Escaped dollar sign
- **WHEN** the user types `\$my-skill`
- **THEN** no skill autocomplete SHALL be triggered, and the input SHALL be treated as literal text

#### Scenario: Double backslash dollar
- **WHEN** the user types `\\$my-skill`
- **THEN** the system SHALL treat this as an unescaped `$` (the double backslash is an escaped backslash) and SHALL trigger skill autocomplete

### Requirement: Skills Source from getCommands
（不变，同原 spec）

#### Scenario: Skill list refresh on reload
- **WHEN** the user runs `/reload` (or skills are reloaded by the system)
- **THEN** the next autocomplete query SHALL reflect the updated skill list (lazy lookup via `pi.getCommands()`)
