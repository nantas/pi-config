# Specification Delta

## Capability 对齐（已确认）

- Capability: `workflow-observability`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户已确认四项 capability 清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: skill-load-tracking
The extension SHALL track every skill load event during a Pi session by monitoring `tool_call(read)` for paths matching `**/SKILL.md`.

#### Scenario: detect-trellis-start-load
- **WHEN** agent calls `read` on `.agents/skills/trellis/trellis-start/SKILL.md`
- **THEN** extension records a `skill_load` event with `{ skill: "trellis/trellis-start", source: "tool_call_read" }`

#### Scenario: detect-gitnexus-skill-load
- **WHEN** agent calls `read` on `.agents/skills/gitnexus/gitnexus-debugging/SKILL.md`
- **THEN** extension records a `skill_load` event with `{ skill: "gitnexus/gitnexus-debugging", namespace: "gitnexus" }`

#### Scenario: detect-other-namespace-skills
- **WHEN** agent calls `read` on any path ending in `SKILL.md` in any subdirectory
- **THEN** extension records a `skill_load` event with the full path and inferred namespace

### Requirement: skill-namespace-classification
The extension SHALL infer a namespace for each tracked skill from its path components (first directory segment after `.agents/skills/` or `.pi/skills/`).

#### Scenario: classify-by-path
- **WHEN** path is `.agents/skills/trellis/trellis-start/SKILL.md`
- **THEN** namespace = `trellis`

- **WHEN** path is `.agents/skills/gitnexus/gitnexus-debugging/SKILL.md`
- **THEN** namespace = `gitnexus`

- **WHEN** path is `.agents/skills/close-task/SKILL.md`
- **THEN** namespace = `close-task`

#### Scenario: skill-load-record-schema
- **WHEN** a skill load is recorded
- **THEN** the record SHALL contain: `{ event: "skill_load", skill: "<namespace/skill-name>", path: "<full-path>", ts: "<ISO8601>", session: "<session-id>", turn: <turn-number> }`

### Requirement: workflow-detection-no-whitelist
The extension SHALL NOT filter tracked skills to a trellis whitelist. ALL skill loads MUST be recorded regardless of namespace.

#### Scenario: non-trellis-skill-tracking
- **WHEN** agent loads a skill from any namespace (e.g., `openspec-propose`, `pkg-research`, or any custom skill)
- **THEN** the event is recorded with its namespace and path, with no filtering

### Requirement: source-annotation
The extension SHALL annotate each skill load event with its inferred source: whether it was triggered by phase context injection, user prompt, or agent autonomous decision. Source inference is heuristic and recorded as an annotation, not a guarantee.

#### Scenario: invoke-source-annotation
- **WHEN** a skill from `context_injection` data's `invoke_targets` list is subsequently loaded
- **THEN** the skill load event SHALL include `{ source: "phase_context_invoke" }`
