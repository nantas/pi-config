# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-task-count`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Parallel Tasks May Specify Count

Each task in the `tasks[]` array SHALL support an optional `count` field (integer, minimum 1) to repeat the same agent task configuration N times concurrently.

#### Scenario: Single task with count 3
- **WHEN** a caller submits `{ tasks: [{agent: "worker", task: "Review file X", count: 3}] }`
- **THEN** three instances of the worker agent run concurrently with the same task and configuration
- **AND** the results contain three separate entries

#### Scenario: Count of 1 behaves identically to no count
- **WHEN** a caller submits `{ tasks: [{agent: "worker", task: "Do X", count: 1}] }`
- **THEN** it behaves the same as `{ tasks: [{agent: "worker", task: "Do X"}] }`

### Requirement: Each Count Instance Must Be Independent

Each instance created by `count` SHALL operate in an independent session with its own `syntheticAgent` identity, logs, and output paths.

#### Scenario: Count 2 produces independent outputs
- **WHEN** two instances run with `count: 2`
- **THEN** each instance has its own `finalOutput`, `artifactPaths`, and `sessionFile`
- **AND** one instance's failure does not affect the other
