# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-parallel-chain-fanout`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Chain Steps May Fan Out To Parallel Agents

A chain step SHALL support an optional `parallel` array of agents within a `ChainItem`, instead of a single `agent` field, to run multiple agents concurrently in that step.

#### Scenario: Chain step with parallel fan-out
- **WHEN** a chain step specifies `{ parallel: [{agent: "agent-a", task: "X"}, {agent: "agent-b", task: "Y"}] }`
- **THEN** both agents run concurrently
- **AND** the step's `{previous}` for the next chain step is an aggregate of all parallel outputs

### Requirement: Parallel Steps Must Support Concurrency Limit

Parallel fan-out within a chain step SHALL support an optional `concurrency` field to limit how many parallel agents run at once.

#### Scenario: Parallel step with concurrency limit
- **WHEN** a chain step has `parallel: [...]` with `concurrency: 2` and 6 agents
- **THEN** at most 2 agents run simultaneously

### Requirement: Parallel Steps Must Aggregate Results For Next Step

The aggregate output of a parallel chain step SHALL contain a summary of all parallel agent outputs, formatted so the next chain step can use `{previous}` to see all results.

#### Scenario: Next step receives aggregated output
- **WHEN** a parallel step completes with results from agent-a and agent-b
- **THEN** the `{previous}` for the next chain step includes both agent results
- **AND** each result is labeled with its agent name
