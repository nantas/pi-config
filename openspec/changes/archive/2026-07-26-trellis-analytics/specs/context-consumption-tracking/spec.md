# Specification Delta

## Capability 对齐（已确认）

- Capability: `context-consumption-tracking`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户已确认四项 capability 清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: detect-phase-context-injection
The extension SHALL detect execution of `trellis-load-phase-context` commands by matching the command string in `tool_call(bash)` events.

#### Scenario: detect-implement-phase
- **WHEN** agent runs `trellis-load-phase-context --phase implement`
- **THEN** extension records a `context_injection_begin` event with `{ phase: "implement", command: "<raw-command>" }`

#### Scenario: detect-all-four-phases
- **WHEN** agent runs `trellis-load-phase-context --phase check|debug|finish`
- **THEN** the SHALL phase be extracted and recorded correctly

### Requirement: parse-context-injection-output
The extension SHALL parse the `tool_result` output of the detected `trellis-load-phase-context` command to extract structured metadata.

#### Scenario: extract-injected-file-list
- **WHEN** the output contains `=== path/to/file.md ===` headers
- **THEN** extension records each such path as an injected file

#### Scenario: extract-mode-classification
- **WHEN** the output contains `[trellis-mode:routing]` / `[trellis-mode:invoke]` / `[trellis-mode:contract]` / `[trellis-mode:knowledge]` group headers
- **THEN** extension records the mode classification for each group, mapping files to their mode

#### Scenario: extract-invoke-targets
- **WHEN** a `[trellis-mode:invoke]` group contains skill paths
- **THEN** extension extracts each path into `invoke_targets` list for cross-reference with skill_load events

#### Scenario: extract-bound-change
- **WHEN** the output contains a `[trellis-bound-change]` line
- **THEN** extension parses `change_id`, `schema`, `path`, `next_stage`, `bridge_workflow`

#### Scenario: store-files-not-content
- **WHEN** parsing the injection output
- **THEN** extension records ONLY the file list, modes, and invoke targets — NOT the full inline content of each file (avoids JSONL bloat)

### Requirement: cross-reference-invoke-resolution
The extension SHALL compare the `invoke_targets` from context injection with subsequent `skill_load` events to determine whether the agent acted on invoke directives.

#### Scenario: invoke-resolved
- **WHEN** `invoke_targets` contains `gitnexus/gitnexus-debugging/SKILL.md` AND subsequent session records show `skill_load` for `gitnexus/gitnexus-debugging`
- **THEN** extension records a `invoke_resolved` event with `{ skill: "gitnexus/gitnexus-debugging", loaded: true }`

#### Scenario: invoke-unresolved
- **WHEN** `invoke_targets` contains a skill AND no `skill_load` event for that skill is found within 10 turns
- **THEN** extension records a `invoke_resolved` event with `{ skill: "...", loaded: false }`

### Requirement: extract-file-references-from-inline-content
The extension SHALL extract file and skill references from the inline content of injected context (the text body after `=== filepath ===` headers), using regex patterns to identify `.md` / `.yaml` / `.json` paths and known skill names.

#### Scenario: extract-md-references
- **WHEN** inline content contains `openspec/specs/shell-owned-view-assets/spec.md`
- **THEN** extension records a reference `{ ref: "openspec/specs/shell-owned-view-assets/spec.md", type: "file" }`

#### Scenario: extract-skill-references
- **WHEN** inline content mentions a known skill name like `gitnexus-exploring` or `uitoolkit-page-context`
- **THEN** extension records a reference `{ ref: "gitnexus-exploring", type: "skill" }`

#### Scenario: deduplicate-injected-files
- **WHEN** a reference matches a file already in the `injected_files` list (already inline-consumed)
- **THEN** the reference is NOT recorded (it was already consumed as inline content)

### Requirement: track-reference-consumption
The extension SHALL track whether extracted references are subsequently read by the agent via `tool_call(read)`.

#### Scenario: reference-read
- **WHEN** a reference `ref: "gitnexus-exploring"` was extracted AND subsequent `tool_call(read)` matches the corresponding SKILL.md path
- **THEN** extension records a `reference_followed` event with `{ ref: "...", read: true }`

#### Scenario: reference-not-read
- **WHEN** a reference was extracted AND no matching `tool_call(read)` occurs within the session
- **THEN** no explicit "not read" event is recorded (consumption state is inferred by absence of positive signal)
