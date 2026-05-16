# Specification Delta: dollar-skill-invoke

## Capability 对齐（已确认）

- Capability: `dollar-skill-invoke`
- 来源: `proposal.md` / 用户设计讨论确认
- 变更类型: modified
- 用户确认摘要: 将 skill 展开从 `input` 事件文本替换切换为 `context` 事件消息追加。原始 prompt 保留 `$skill-name` 标记，每个 skill 作为独立 `CustomMessage`（`customType: "skill"`, `display: false`）注入，支持多 skill 自然共存。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件
- 未在本文件中提及的 requirements、scenarios 保持原 spec (`openspec/specs/dollar-skill-invoke/spec.md`) 中的定义不变

## ADDED Requirements

### Requirement: Context Event Message Injection
The system SHALL use the `context` event to inject skill content as `CustomMessage` entries into the LLM message array. Each matched `$skill-name` token SHALL produce one `CustomMessage` with `customType: "skill"`, `display: false`, and content containing the `<skill>` block. Injected messages SHALL be inserted immediately after the user message in the `AgentMessage[]` array.

#### Scenario: Single skill injection
- **WHEN** a user submits `$my-skill explain this` and the `context` event fires
- **THEN** the system SHALL parse `$my-skill` from the user message, read its `SKILL.md`, and insert one `CustomMessage` with `customType: "skill"` and content `<skill name="my-skill" location="...">...body...</skill>` immediately after the user message

#### Scenario: Multiple skill injection
- **WHEN** a user submits `$skill-a and $skill-b` and the `context` event fires
- **THEN** the system SHALL parse both `$skill-a` and `$skill-b`, and insert two `CustomMessage` entries—one per skill—in the order they appear in the text, immediately after the user message

#### Scenario: Original prompt preserved
- **WHEN** a user submits `$skill-a help me with X`
- **THEN** the original user message text SHALL remain unchanged (including the `$skill-a` token), and skill content SHALL be appended as additional messages, not prepended or inlined

### Requirement: Repeat Injection Prevention
The system SHALL prevent injecting duplicate skill messages for the same user message across multiple `context` event firings within the same turn. After injection, subsequent `context` calls for the same turn SHALL NOT re-inject skill messages.

#### Scenario: Same turn re-injection prevented
- **WHEN** the `context` event fires after tool calls within the same turn, and skill messages were already injected in the first `context` call
- **THEN** the system SHALL detect that the user message is already followed by `CustomMessage` entries with `customType: "skill"` and SHALL skip injection

#### Scenario: New turn triggers fresh injection
- **WHEN** a new user message is submitted and the `context` event fires
- **THEN** the system SHALL detect that the new user message is the last user message and is NOT followed by skill messages, and SHALL perform injection

## MODIFIED Requirements

### Requirement: Dollar Skill Token Expansion
The system SHALL, on each LLM call, scan the last user message in the message array for unescaped `$skill-name` tokens. For each matched token, the system SHALL read the skill's `SKILL.md` content and inject a `CustomMessage` containing a `<skill>` block after the user message. **All** unescaped `$skill-name` tokens in the same input SHALL be expanded (not just the first). The original user message text SHALL be preserved unchanged.

#### Scenario: Single skill expansion
- **WHEN** the user submits `$my-skill explain this`
- **THEN** the system SHALL read `SKILL.md` for skill `my-skill`, strip the YAML frontmatter, wrap the body in a `<skill>` block using the format matching `/skill:name`, and inject it as a `CustomMessage` after the user message

#### Scenario: Multiple skill expansion
- **WHEN** the user submits `$skill-a and $skill-b`
- **THEN** the system SHALL expand **both** `$skill-a` and `$skill-b` into separate `<skill>` blocks, injected as two `CustomMessage` entries in the order they appear in the text. The user message SHALL retain `$skill-a and $skill-b` as-is.

#### Scenario: Unknown skill
- **WHEN** the user submits `$nonexistent-skill do something`
- **THEN** the token `$nonexistent-skill` SHALL be left unchanged in the user message, and no skill message SHALL be injected for this token

#### Scenario: Escaped dollar
- **WHEN** the user submits `\$my-skill is a variable`
- **THEN** the `\$` SHALL be treated as an escaped literal `$`, the text `$my-skill is a variable` SHALL NOT trigger skill expansion, and no skill message SHALL be injected

#### Scenario: Mixed escaped and unescaped
- **WHEN** the user submits `\$my-skill and $other-skill`
- **THEN** `\$my-skill` SHALL remain as literal text while `$other-skill` SHALL trigger a skill message injection

### Requirement: Skill Content Format
The system SHALL read the skill's `SKILL.md` file, strip the YAML frontmatter, and wrap the remaining body in a `<skill>` block whose format **exactly matches** the output of `_expandSkillCommand` used by `/skill:name`. The resulting block SHALL be set as the `content` field of a `CustomMessage` with `customType: "skill"` and `display: false`. Each skill SHALL produce one `CustomMessage`.

#### Scenario: Single skill block format
- **WHEN** a single skill `foo` at `/path/.pi/skills/foo/SKILL.md` is expanded
- **THEN** the injected `CustomMessage` SHALL have `customType: "skill"`, `display: false`, and content:
```
<skill name="foo" location="/path/.pi/skills/foo/SKILL.md">
References are relative to /path/.pi/skills/foo.

<body>
</skill>
```
- `baseDir` SHALL be computed as `path.dirname(filePath)` (the directory containing SKILL.md), matching how `_expandSkillCommand` derives it

#### Scenario: File read failure
- **WHEN** reading `SKILL.md` for a matched skill fails (e.g., file deleted)
- **THEN** the `$skill-name` token SHALL be left unchanged in the user message, and no `CustomMessage` SHALL be injected for this token

### Requirement: Context Handler Single Registration
The system SHALL register the `context` event handler **once** at extension load time (top level of the `export default function`), NOT inside `session_start` or any per-session lifecycle handler.

#### Scenario: No handler accumulation across sessions
- **WHEN** the user creates a new session (`/new`) or the session is replaced
- **THEN** only ONE `context` event handler SHALL be active for this extension (not accumulated copies from previous sessions)

#### Scenario: Handler works across sessions
- **WHEN** the `context` event fires in any session
- **THEN** the single `context` handler SHALL process the message array and inject skill messages if applicable

## REMOVED Requirements

### Requirement: Input Event Interception
**Reason**: Skill expansion is moved from `input` event text transformation to `context` event message injection. The `input` event is no longer used for `$skill-name` expansion.

**Migration**: The `input` event handler (formerly `handleInputTransform`) SHALL be removed or changed to return `{ action: "continue" }` unconditionally. Autocomplete registration remains in `session_start`, unchanged.
