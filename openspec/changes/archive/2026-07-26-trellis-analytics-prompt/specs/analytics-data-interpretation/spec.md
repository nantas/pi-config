# Specification Delta

## Capability 对齐（已确认）

- Capability: `analytics-data-interpretation`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 三项 capability 清单已确认（05-13 设计方案讨论）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: jsonl-load-and-classify
The prompt SHALL guide the agent to load and classify all events from a trellis-analytics JSONL file, categorizing them by event type and providing a summary overview.

#### Scenario: load-task-analytics
- **WHEN** user provides a path to a task events.jsonl (e.g., `.trellis/.analytics/tasks/<slug>/events.jsonl`)
- **THEN** the prompt SHALL instruct the agent to read the file, parse each JSON line, count events per event type, and output a summary table.

#### Scenario: load-orphan-analytics
- **WHEN** user provides a path to an orphan analytics file (e.g., `.trellis/.analytics/orphans/<session-id>.jsonl`)
- **THEN** the prompt SHALL instruct the agent to load the file and display the same summary.

#### Scenario: missing-path
- **WHEN** user provides no JSONL path or an ambiguous reference
- **THEN** the prompt SHALL instruct the agent to ask the user for the exact file path before proceeding.

### Requirement: event-schema-decode
The prompt SHALL define the schema for each of the 9 trellis-analytics event types and map them to their Trellis workflow semantics.

#### Scenario: decode-session-start
- **WHEN** parsing a `session_start` event
- **THEN** the prompt SHALL extract: `reason` (startup/resume), `sessionFile`, and `ts` — and explain that this marks a Pi session boundary.
  - `reason: "resume"` indicates cross-session continuation; `"startup"` indicates a fresh session.

#### Scenario: decode-skill-load
- **WHEN** parsing a `skill_load` event
- **THEN** the prompt SHALL extract: `skill` (namespace/name), `namespace`, `path`, `source` (user_prompt/autonomous/phase_context_invoke).
  - Explain that `source` is heuristic: first-skill-in-session → `user_prompt`, invoke-matched → `phase_context_invoke`, else → `autonomous`.
  - Explain that SKILL.md duplicate reads are deduplicated (tracked as single first-load).

#### Scenario: decode-context-injection-parsed
- **WHEN** parsing a `context_injection_parsed` event
- **THEN** the prompt SHALL extract: `phase` (implement/check/debug/finish), `injectedFiles` (count + names), `modeMap` (contract/knowledge/routing/invoke grouping), `invokeTargets`, `boundChange`.
  - Explain that `injectedFiles` are files whose full content was inlined via `=== path ===` headers.
  - Explain that `modeMap` reflects the Trellis profile phase JSONL's file classification.
  - Explain that `invokeTargets` are skills Trellis requested to be loaded.
  - Explain that `boundChange` records the OpenSpec change binding metadata.

#### Scenario: decode-context-injection-references
- **WHEN** parsing a `context_injection_references` event
- **THEN** the prompt SHALL extract: `phase`, `references[]` (ref + type).
  - Explain that references are files/skills mentioned inside inlined content but not themselves inlined.
  - Explain that injected files are excluded from references (already consumed inline).

#### Scenario: decode-invoke-resolved
- **WHEN** parsing an `invoke_resolved` event
- **THEN** the prompt SHALL extract: `skill`, `loaded` (true/false), optional `note`.
  - Explain that `loaded: true` means the agent loaded the requested skill within 10 turns.
  - Explain that `loaded: false` may be due to timeout or session shutdown before loading.

#### Scenario: decode-reference-followed
- **WHEN** parsing a `reference_followed` event
- **THEN** the prompt SHALL extract: `ref`, `type` (file/skill), `read` (true).
  - Explain that positive-only: only followed refs are logged; unread refs are inferred by absence.
  - Explain that matching is fuzzy (suffix, basename, path-segment containment).

#### Scenario: decode-session-shutdown
- **WHEN** parsing a `session_shutdown` event
- **THEN** the prompt SHALL extract the event and explain that it marks the session end; all files are closed and unresolved invokes are logged.

### Requirement: timeline-reconstruction
The prompt SHALL guide the agent to reconstruct a chronological timeline from the events, grouping them by session and ordering by ts/turn.

#### Scenario: build-timeline
- **WHEN** loading analytics data with multiple sessions
- **THEN** the prompt SHALL instruct the agent to group events by `session` ID, sort within each group by `ts`/`turn`, and display as a timeline.
  - Include event type, phase (if applicable), and key data summary per timeline entry.
