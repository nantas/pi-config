# Specification Delta

## Capability 对齐（已确认）

- Capability: `dollar-skill-invoke`
- 来源: `proposal.md` / 需求确认 B1-B5
- 变更类型: new
- 用户确认摘要: 多个 `$skill-name` 全部展开，content 前置插入，移除 token，`\$` 转义，不存在的 skill 保持原样

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dollar Skill Token Expansion
The system SHALL, on user input submission, scan the text for unescaped `$skill-name` tokens, expand each matching skill by reading its `SKILL.md` content, and produce transformed text for the downstream pipeline.

#### Scenario: Single skill expansion
- **WHEN** the user submits `$my-skill explain this`
- **THEN** the system SHALL read `SKILL.md` for skill `my-skill`, strip the YAML frontmatter, wrap the body in a `<skill>` block, and return the transformed text: `<skill name="my-skill" location="<path>">\n<body>\n</skill>\n\nexplain this`

#### Scenario: Multiple skill expansion (consolidated block)
- **WHEN** the user submits `$skill-a and $skill-b`
- **THEN** the system SHALL expand both skills and emit them as a **single consolidated `<skill>` block** at the beginning of the transformed text. All expanded skills are merged into one block with `name` set to a comma-separated list of skill names and each skill's content prefixed by `[skill:<name>]`. The remaining text with `$skill-a` and `$skill-b` tokens removed follows after the block.
- **RATIONALE**: The TUI chat renderer's `parseSkillBlock()` only recognizes one `<skill>` block at the start of user message text. Separate blocks would cause the 2nd+ blocks to render as raw text.

#### Scenario: Unknown skill
- **WHEN** the user submits `$nonexistent-skill do something`
- **THEN** the token `$nonexistent-skill` SHALL be left unchanged in the text, and the downstream pipeline SHALL process it as normal text

#### Scenario: Escaped dollar
- **WHEN** the user submits `\$my-skill is a variable`
- **THEN** the `\$` SHALL be treated as an escaped literal `$`, the text `$my-skill is a variable` SHALL NOT be expanded, and SHALL pass through unchanged

#### Scenario: Mixed escaped and unescaped
- **WHEN** the user submits `\$my-skill and $other-skill`
- **THEN** `\$my-skill` SHALL remain as literal text `$my-skill` while `$other-skill` SHALL be expanded into a `<skill>` block

### Requirement: Input Event Interception
The system SHALL use the `input` event to intercept and transform user-submitted text before it reaches the LLM pipeline.

#### Scenario: Transform action
- **WHEN** the `input` event handler detects one or more valid `$skill-name` tokens
- **THEN** the handler SHALL return `{ action: "transform", text: "<transformed>" }` with the expanded skill blocks and cleaned remaining text

#### Scenario: Continue action
- **WHEN** the `input` event handler detects no valid `$skill-name` tokens
- **THEN** the handler SHALL return `{ action: "continue" }` without modifying the text

### Requirement: Skill Content Format
The system SHALL read the skill's `SKILL.md` file, strip the YAML frontmatter, and wrap the remaining body.

#### Scenario: Single skill block format
- **WHEN** a single skill `foo` at `/path/.pi/skills/foo/SKILL.md` is expanded
- **THEN** the output block SHALL be:
```
<skill name="foo" location=".">
[skill:foo]
Location: /path/.pi/skills/foo/SKILL.md

<SKILL.md body without frontmatter>
</skill>
```
#### Scenario: Multiple skill consolidated block format
- **WHEN** skills `foo` and `bar` are both expanded in the same input
- **THEN** the output SHALL be a single block:
```
<skill name="foo, bar" location=".">
[skill:foo]
Location: /path/foo/SKILL.md

<foo body>

---

[skill:bar]
Location: /path/bar/SKILL.md

<bar body>
</skill>
```
#### Scenario: File read failure
- **WHEN** reading `SKILL.md` for a matched skill fails (e.g., file deleted)
- **THEN** the `$skill-name` token SHALL be left unchanged, and no skill block SHALL be emitted

### Requirement: Skill List from ResourceLoader
The system SHALL obtain the skill list from `pi.getCommands()` filtered by `source === "skill"`, matching the same data source used by the autocomplete provider.

#### Scenario: Consistency with autocomplete
- **WHEN** a skill appears in the `$` autocomplete list
- **THEN** the same skill SHALL be expandable via `$skill-name` on submission
