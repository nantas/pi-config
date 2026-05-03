# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-chain-mode`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dispatch Schema Must Support Chain Mode

The dispatch tool SHALL accept an optional `chain` parameter on `DispatchRequestSchema`, mutually exclusive with `tasks[]`, that defines a sequential pipeline of agent steps. Each step's output text SHALL be available to the subsequent step as the `{previous}` template variable.

#### Scenario: Caller submits a chain of two agents
- **WHEN** a caller submits `{ chain: [{agent: "scout", task: "Analyze {task}"}, {agent: "worker", task: "Implement based on {previous}"}] }`
- **THEN** the scout agent runs first with the original task
- **AND** the worker agent receives the scout's result text as `{previous}` in its task template

#### Scenario: Caller submits a single-step chain
- **WHEN** a caller submits `{ chain: [{agent: "worker", task: "Do X"}] }`
- **THEN** it behaves the same as `{ tasks: [{agent: "worker", task: "Do X"}] }`

### Requirement: Chain Steps Must Support Template Variables

Each chain step SHALL support `{task}` (original user task), `{previous}` (prior step's text output, empty for first step), and `{chain_dir}` (shared temp directory for chain artifacts) in the `task` field.

#### Scenario: First step uses {task} and {chain_dir}
- **WHEN** the first chain step has `task: "Explore {task} and save to {chain_dir}/report.md"`
- **THEN** `{task}` is replaced with the original request
- **AND** `{chain_dir}` is replaced with the chain's shared directory path
- **AND** `{previous}` is empty

#### Scenario: Subsequent step uses {previous}
- **WHEN** the second chain step has `task: "Review: {previous}"`
- **THEN** `{previous}` contains the full text output of the first step
- **AND** `{chain_dir}` remains the same shared directory

### Requirement: Chain Steps Must Support Output Persistence

Each chain step SHALL support an optional `output` field to save the step's result to a file.

#### Scenario: Chain step with output file
- **WHEN** a chain step specifies `output: "step1-output.md"`
- **THEN** the step's result text is written to that file
- **AND** the path is reported in the chain result

### Requirement: Chain Must Report Per-Step Results

The dispatch response for a chain SHALL include per-step results with the same normalized shape as task results: `taskId`, `agent`, `status`, `summary`, `finalOutput`, `artifactPaths`, `savedOutputPath`, `sessionFile`, `error`.

#### Scenario: Two-step chain reports two results
- **WHEN** a two-step chain completes
- **THEN** the response contains two entries in `results[]`
- **AND** each entry has the agent name, status, and output
- **AND** an `aggregateSummary` reports how many steps succeeded/failed
