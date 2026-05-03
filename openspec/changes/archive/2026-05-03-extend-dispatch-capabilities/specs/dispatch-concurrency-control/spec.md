# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-concurrency-control`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dispatch Schema Must Support Concurrency For Parallel Tasks

The `DispatchRequestSchema` SHALL accept an optional top-level `concurrency` field (integer, minimum 1) that limits how many tasks in `tasks[]` run simultaneously.

#### Scenario: Concurrency limit applied to parallel tasks
- **WHEN** a caller submits `{ tasks: [{agent: "a", task: "X"}, {agent: "b", task: "Y"}, {agent: "c", task: "Z"}], concurrency: 2 }`
- **THEN** at most 2 agents run at the same time

#### Scenario: No concurrency limit specified
- **WHEN** a caller submits `{ tasks: [{agent: "a", task: "X"}, {agent: "b", task: "Y"}] }` without `concurrency`
- **THEN** all tasks run concurrently (no artificial limit imposed)

### Requirement: Concurrency Must Also Apply To Chain Parallel Steps

The `concurrency` field SHALL also limit parallel fan-out within chain steps when specified at the top level or within the parallel step definition.

#### Scenario: Concurrency limits parallel chain step
- **WHEN** a chain step has `parallel: [6 agents]` and `concurrency: 2`
- **THEN** at most 2 agents run simultaneously in that step
