# Specification Delta

## Capability 对齐（已确认）

- Capability: `trellis-workflow-correlation`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 三项 capability 清单已确认（05-13 设计方案讨论）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: phase-skip-detection
The prompt SHALL correlate analytics phase injection events against the Trellis workflow's expected phase sequence from trellis-start SKILL.md (Step 8 → implement, Step 9 → check, Step 10 → handoff with finish).

#### Scenario: detect-skipped-check
- **WHEN** analytics shows `context_injection_parsed` with phase "implement" but no matching "check" event
- **THEN** the prompt SHALL flag that the check quality gate was skipped.
  - Reference: trellis-start Step 9 states "load Trellis check context → openspec-verify-change"
  - Suggest: review whether the agent bypassed verification, or whether check was deferred to a separate session.

#### Scenario: detect-skipped-debug
- **WHEN** analytics shows no `context_injection_parsed` with phase "debug" despite the task being a bugfix
- **THEN** the prompt SHALL flag that the debug phase was not loaded.
  - Reference: rule-phase-gate-map.md CTX-DEBUG requires debug context injection
  - Note: debug phase is optional for non-debug tasks; assess based on task type.

#### Scenario: detect-complete-phase-sequence
- **WHEN** analytics covers implement → (check?) → finish phases
- **THEN** the prompt SHALL report the phase sequence completeness ratio (e.g., 3/4 phases covered) and note which phases are missing.

### Requirement: context-volume-assessment
The prompt SHALL correlate the number of injected files and references against the Trellis profile expectations to assess whether the context volume is appropriate.

#### Scenario: assess-context-volume
- **WHEN** `context_injection_parsed` shows > 10 injected files or > 50 references in a single phase
- **THEN** the prompt SHALL:
  1. Flag potential context overload
  2. Suggest checking the Trellis profile in `.trellis/profiles/context-profiles.yaml` to see if the profile expanded more entries than intended
  3. Suggest checking whether the task's `init-context` stage correctly used `docs|test|fullstack` granularity

#### Scenario: assess-low-consumption
- **WHEN** consumption rate is below 10% despite moderate context volume (5-15 files injected)
- **THEN** the prompt SHALL suggest:
  - The context format (inline content vs. summary headers) may need adjustment
  - The reference extraction may be too aggressive (capturing non-actionable URLs/paths)
  - Check the Trellis context injection template at `.trellis/spec/guides/context-injection-template.md` for best practices

### Requirement: invoke-mechanism-analysis
The prompt SHALL correlate invoke resolution data against the Trellis `[trellis-mode:invoke]` mechanism design.

#### Scenario: analyze-invoke-effectiveness
- **WHEN** invoke response rate is below 50%
- **THEN** the prompt SHALL:
  1. List the unresolved skills
  2. Check whether those skills exist in the repository's `.agents/skills/` directory
  3. Suggest reviewing the invoke format in the phase JSONL (`[trellis-mode:invoke]` → `=== path/to/skill/SKILL.md ===`) for path correctness
  4. Suggest cross-referencing with trellis-start SKILL.md's workflow to verify that the invoked skill is appropriate for the current phase

#### Scenario: no-invoke-targets
- **WHEN** analytics shows zero invoke targets across all phases
- **THEN** the prompt SHALL note that the phase profiles did not include invoke directives, and suggest:
  - Check `.trellis/profiles/context-profiles.yaml` for the selected profiles' invoke entries
  - Consider whether invoke is needed for this task type

### Requirement: skill-drift-detection
The prompt SHALL detect when the agent loaded skills outside the expected Trellis workflow namespace during execution phases.

#### Scenario: detect-autonomous-skill-drift
- **WHEN** a non-Trellis skill (e.g., gitnexus-debugging, uitoolkit-page-context) is loaded during or immediately after an implement phase context injection with source: "autonomous"
- **THEN** the prompt SHALL:
  1. Flag the drift
  2. Check whether the skill was referenced in the injected context (context_injection_references) — if so, it's legitimate consumption
  3. If not referenced, it may indicate the agent autonomously diverging from the planned workflow
  4. Suggest reviewing the phase context content to see if it inadvertently triggered off-track exploration

### Requirement: session-boundary-analysis
The prompt SHALL correlate session boundary events with Trellis task lifecycle events to detect inefficient cross-session patterns.

#### Scenario: detect-fragmented-task
- **WHEN** a task's analytics shows 3+ distinct sessions contributing to the same task
- **THEN** the prompt SHALL flag that the task was fragmented across multiple Pi sessions and suggest:
  - Check whether session resumption correctly restored task state
  - Check whether the trellis-start resume path was followed
  - Measure per-session event count — very short sessions (< 10 events) may indicate repeated context loss

### Requirement: improvement-scoping-output-format
The prompt SHALL define a structured output format for improvement suggestions, following the template: "data fact → workflow spec reference → deviation → actionable suggestion".

#### Scenario: output-improvement-suggestion
- **WHEN** any deviation is detected
- **THEN** the prompt SHALL format the output as:
  ```
  **发现**: <analytics data fact, e.g., "消费率 5.3% (3/57 refs)">
  **对照**: <Trellis spec reference, e.g., "trellis-start Step 8 injects implement phase context with knowledge files of expected consumption rate > 30%">
  **偏差**: <what deviated from expectation, e.g., "57 references were injected but only 3 were read over 44 turns">
  **建议**: <actionable next step, e.g., "检查该 task 的 implement.jsonl 中 knowledge 分组的文件数量是否合理。考虑分阶段注入或减少非核心引用。如需调研 Trellis context 设计，阅读 .agents/skills/trellis/trellis-start/SKILL.md 和 .trellis/spec/guides/context-injection-template.md">
  ```

#### Scenario: optional-user-supplement
- **WHEN** user provides additional prompts alongside the analytics file path (e.g., "帮我看看为什么消费率这么低")
- **THEN** the prompt SHALL instruct the agent to incorporate the user's supplemental question into the analysis focus, prioritizing relevant metrics and deviations.
