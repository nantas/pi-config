# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-baseline` (Modified)
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件
- 本文件是对 `openspec/specs/pi-subagent-dispatch-baseline/spec.md` 中既有 requirements 的 delta 修改
- 未在本文件中列出的要求保持不变

## MODIFIED Requirements

### Requirement: The Dispatch Tool Schema Must Support Extended Parameters

This requirement modifies "Requirement: Dispatch Must Use A Unified Task Array Contract" from the baseline spec.

The dispatch tool SHALL accept `tasks[]` (existing) OR `chain` (new) as mutually exclusive execution modes. Each mode SHALL support the same per-item parameter set for consistency.

#### Scenario: Caller dispatches with tasks array
- **WHEN** a caller submits a request with `tasks[]`
- **THEN** behavior is identical to the baseline spec

#### Scenario: Caller dispatches with chain
- **WHEN** a caller submits a request with `chain: [...]`
- **THEN** the request uses `chain` mode and `tasks[]` is ignored (if both present, `chain` takes precedence and a warning is logged)

### Requirement: The Dispatch Tool Schema Must Support Additional Parameters on Task Items

This requirement modifies "Requirement: Dispatch Must Use A Unified Task Array Contract" from the baseline spec.

Each item in `tasks[]` SHALL additionally support `output` (string path or false) and `count` (integer, minimum 1) fields beyond the existing `agent`, `task`, `context`, `skills`, `reads`, `model`, `cwd`, and `projectContext`.

#### Scenario: Task with output
- **WHEN** a task specifies `output: "result.md"`
- **THEN** the task result is written to the specified file

#### Scenario: Task with count
- **WHEN** a task specifies `count: 3`
- **THEN** three instances of the same agent task run concurrently

### Requirement: Dispatch Must Support Top-Level Concurrency Parameter

Adds a new top-level parameter beyond the baseline schema.

The dispatch tool SHALL accept an optional top-level `concurrency` field (integer, minimum 1) that limits concurrent execution for both `tasks[]` and `chain` parallel steps.

#### Scenario: Concurrency limits parallel tasks
- **WHEN** a caller submits `{ tasks: [...], concurrency: 2 }`
- **THEN** at most 2 tasks execute simultaneously

### Requirement: Dispatch Must Support Action Parameter For Management

Adds a new top-level parameter for read-only management actions.

The dispatch tool SHALL accept an optional top-level `action` field with values `"list"`, `"get"`, or `"status"`. When `action` is present, the tool operates in management mode and does not execute tasks.

#### Scenario: Caller requests agent list
- **WHEN** a caller submits `{ action: "list" }`
- **THEN** the tool returns agent definitions without executing any tasks

### Requirement: Async Mode Must Be Implemented

This requirement modifies "Requirement: Sync Must Be The Only Formal V1 Completion Mode" from the baseline spec.

The dispatch tool SHALL support both `sync` and `async` modes. `Sync` remains the default. `Async` mode SHALL run tasks in the background and return a `runId` for status queries.

#### Scenario: Sync mode (default)
- **WHEN** no `mode` is specified or `mode: "sync"`
- **THEN** behavior matches the baseline sync requirement

#### Scenario: Async mode
- **WHEN** `mode: "async"` is specified
- **THEN** tasks run in the background and a `runId` is returned immediately
- **AND** status can be queried via `action: "status"` with the `runId`

### Requirement: Dispatch Tool Description Must Reflect Extended Capabilities

The dispatch tool's description SHALL be updated to inform callers about all available parameters: `tasks[]`, `chain`, `output`, `count`, `concurrency`, `mode`, `action`, `agentScope`, and how they interact.

#### Scenario: Caller reads tool description
- **WHEN** a caller inspects the dispatch tool's schema and description
- **THEN** the description lists all supported parameters and their purpose
- **AND** the available agents list is still shown
