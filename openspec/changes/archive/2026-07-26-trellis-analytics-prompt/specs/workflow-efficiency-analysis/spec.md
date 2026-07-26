# Specification Delta

## Capability 对齐（已确认）

- Capability: `workflow-efficiency-analysis`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 三项 capability 清单已确认（05-13 设计方案讨论）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: consumption-rate-calculation
The prompt SHALL define and guide calculation of the **context consumption rate**: the ratio of `reference_followed` events to total reference count from `context_injection_references`, plus the ratio of `injectedFiles` that were subsequently read.

#### Scenario: compute-consumption-rate
- **WHEN** analyzing a task's analytics data
- **THEN** the prompt SHALL instruct the agent to:
  1. Sum all `referenceCount` values from `context_injection_parsed` events → totalRefs
  2. Count all `reference_followed` events → followedRefs
  3. Calculate `consumptionRate = followedRefs / totalRefs * 100%`
  4. Additionally, check which `injectedFiles` were subsequently read by the agent (may not be tracked as `reference_followed` since they're already inline-consumed)
  5. Report both metrics with interpretation thresholds:
     - > 30%: healthy consumption
     - 10-30%: moderate — consider reducing context volume
     - < 10%: low — context format or relevance may need attention

### Requirement: phase-coverage-calculation
The prompt SHALL define and guide calculation of **Phase coverage**: which of the 4 Trellis phases (implement, check, debug, finish) had context injection events.

#### Scenario: compute-phase-coverage
- **WHEN** analyzing a task's analytics data
- **THEN** the prompt SHALL instruct the agent to:
  1. Extract all unique `phase` values from `context_injection_parsed` events
  2. Compare against the expected set: `[implement, check, debug, finish]`
  3. Report covered and missing phases
  4. Note that check+debug combined omission suggests the agent skipped quality gates; check alone may mean no debugging was needed

### Requirement: latency-distribution-calculation
The prompt SHALL define and guide calculation of **consumption latency**: the number of turns between context injection and the first consumption of its references.

#### Scenario: compute-latency
- **WHEN** analyzing a task where both `context_injection_parsed` and `reference_followed` events exist
- **THEN** the prompt SHALL instruct the agent to:
  1. For each `context_injection_parsed` event, note its `turn`
  2. Find the first `reference_followed` event from the same session occurring after that turn
  3. If found, calculate `latency = refTurn - injectionTurn`
  4. Report the latency distribution (min/max/avg)
  5. If no `reference_followed` exists after an injection, report as "no consumption observed"
  6. Interpretation: latency > 20 turns may indicate context overload or poor relevance

### Requirement: invoke-response-rate-calculation
The prompt SHALL define and guide calculation of the **invoke response rate**: how many skills Trellis requested via `[trellis-mode:invoke]` were actually loaded by the agent.

#### Scenario: compute-invoke-rate
- **WHEN** analyzing a task with non-empty `invokeTargets`
- **THEN** the prompt SHALL instruct the agent to:
  1. Sum all `invokeTargets` across `context_injection_parsed` events → totalInvokes
  2. Count `invoke_resolved` events with `loaded: true` → resolvedInvokes
  3. Calculate `invokeRate = resolvedInvokes / totalInvokes * 100%`
  4. For each unresolved invoke, identify which skill was missed
  5. Interpretation: low invoke rate suggests the invoke mechanism design or skill discoverability needs review

### Requirement: skill-structure-analysis
The prompt SHALL define analysis of the **skill load structure**: the ratio of Trellis-related skills vs non-Trellis skills, and at which workflow stages they were loaded.

#### Scenario: analyze-skill-structure
- **WHEN** a task has 3+ `skill_load` events
- **THEN** the prompt SHALL instruct the agent to:
  1. Categorize each loaded skill by namespace (trellis/*, gitnexus/*, openspec/*, close-task, etc.)
  2. Identify whether Trellis framework skills (trellis-brainstorm, trellis-start, trellis-finish-work, close-task) were loaded at the expected workflow stage
  3. Flag skills loaded at unexpected times (e.g., gitnexus-exploring loaded during implement phase context injection)
  4. Report the Trellis skill ratio: `trellisSkillCount / totalSkillCount`

### Requirement: abnormal-session-detection
The prompt SHALL define detection criteria for abnormal sessions: very short sessions that may indicate environmental issues or configuration problems.

#### Scenario: detect-abnormal-session
- **WHEN** an analytics file contains `session_shutdown` within 60 seconds of `session_start`, or contains only `session_start` with no subsequent events
- **THEN** the prompt SHALL flag this session as abnormal and suggest:
  - Check the session file for error messages
  - Check extension load errors in Pi logs
  - For `session_shutdown` within the same turn as `session_start`, likely an aborted startup
