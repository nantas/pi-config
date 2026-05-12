# Specification Delta: dollar-skill-invoke

## Capability 对齐（已确认）

- Capability: `dollar-skill-invoke`
- 来源: `proposal.md`
- 变更类型: modified
- 用户确认摘要: 仅展开第一个 `$skill-name` token，输出格式对齐 `/skill:name`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件
- 未在本文件中提及的 requirements、scenarios 保持原 spec (`openspec/specs/dollar-skill-invoke/spec.md`) 中的定义不变

## MODIFIED Requirements

### Requirement: Dollar Skill Token Expansion
The system SHALL, on user input submission, scan the text for unescaped `$skill-name` tokens, expand **only the first matching skill** by reading its `SKILL.md` content, and produce transformed text for the downstream pipeline. Any subsequent `$skill-name` tokens in the same input SHALL be left as-is (not expanded).

#### Scenario: Single skill expansion (no change in behavior scope, format changed)
- **WHEN** the user submits `$my-skill explain this`
- **THEN** the system SHALL read `SKILL.md` for skill `my-skill`, strip the YAML frontmatter, wrap the body in a `<skill>` block using the format matching `/skill:name`, and return the transformed text

#### Scenario: First-only expansion (NEW, replaces "Multiple skill expansion consolidated block")
- **WHEN** the user submits `$skill-a and $skill-b`
- **THEN** the system SHALL expand **only** `$skill-a` into a `<skill>` block, and leave `$skill-b` as literal text `$skill-b` in the remaining input. Only the first `$skill-name` token SHALL be transformed.
- **RATIONALE**: This ensures the extension's `$skill-name` expansion behavior matches `/skill:name` which also only processes one skill per input. Prevents unintended multi-skill injection in mixed workflow scenarios.

#### Scenario: Unknown skill (no change)
- **WHEN** the user submits `$nonexistent-skill do something`
- **THEN** the token `$nonexistent-skill` SHALL be left unchanged in the text, and the downstream pipeline SHALL process it as normal text

#### Scenario: Escaped dollar (no change)
- **WHEN** the user submits `\$my-skill is a variable`
- **THEN** the `\$` SHALL be treated as an escaped literal `$`, the text `$my-skill is a variable` SHALL NOT be expanded, and SHALL pass through unchanged

#### Scenario: Mixed escaped and unescaped (no change)
- **WHEN** the user submits `\$my-skill and $other-skill`
- **THEN** `\$my-skill` SHALL remain as literal text `$my-skill` while `$other-skill` SHALL be expanded into a `<skill>` block

### Requirement: Skill Content Format (modified output format)

The system SHALL read the skill's `SKILL.md` file, strip the YAML frontmatter, and wrap the remaining body in a `<skill>` block whose format **exactly matches** the output of `_expandSkillCommand` used by `/skill:name`. Specifically:
- `location` attribute SHALL use the actual skill `SKILL.md` file path (not `"."`)
- The block SHALL include a `References are relative to <baseDir>.` line
- The block SHALL NOT include `[skill:name]` or `Location:` internal markers

#### Scenario: Single skill block format (changed)
- **WHEN** a single skill `foo` at `/path/.pi/skills/foo/SKILL.md` is expanded
- **THEN** the output block SHALL be:
```
<skill name="foo" location="/path/.pi/skills/foo/SKILL.md">
References are relative to /path/.pi/skills/foo.

<body>
</skill>
```
- `baseDir` SHALL be computed as `path.dirname(filePath)` (the directory containing SKILL.md), matching how `_expandSkillCommand` derives it

#### Scenario: File read failure (no change)
- **WHEN** reading `SKILL.md` for a matched skill fails (e.g., file deleted)
- **THEN** the `$skill-name` token SHALL be left unchanged, and no skill block SHALL be emitted

## REMOVED Requirements

### Requirement: (removed) Multi-skill consolidated block format

The following behavior is **removed**:
- The system SHALL NOT expand multiple `$skill-name` tokens in a single input
- The system SHALL NOT produce a consolidated `<skill>` block with comma-separated `name` attribute
- The system SHALL NOT use `[skill:name]` or `Location: <path>` markers inside the `<skill>` block

This removal is a direct consequence of:
- `Dollar Skill Token Expansion` → first-only expansion
- `Skill Content Format` → exact match with `/skill:name` format

## Unchanged Requirements

The following requirements from the base spec remain fully in effect with no changes:

- **Input Event Interception**: Transform / Continue action
- **Skill List from ResourceLoader**: Consistency with autocomplete
- **Input Handler Single Registration**: No handler accumulation across sessions, handler works across sessions
- **All autocomplete-related behaviors** (covered by `dollar-skill-autocomplete` and `slash-skill-filter` capabilities)
