# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-async-mode`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dispatch Must Support Async Execution Mode

The dispatch tool SHALL support `mode: "async"` to run tasks in the background and return immediately with a `runId` that can be used to query status later.

#### Scenario: Caller dispatches async tasks
- **WHEN** a caller submits `{ mode: "async", tasks: [{agent: "worker", task: "Long running task"}] }`
- **THEN** the request is accepted and returns immediately with `{ runId: "...", mode: "async", results: [{ taskId: "1", agent: "worker", status: "running" }] }`
- **AND** the response includes a `runId` for status polling

### Requirement: Dispatch Must Support Status Query For Async Runs

The dispatch tool SHALL accept `action: "status"` with a `runId` to query the status of a previously submitted async dispatch run.

#### Scenario: Caller queries async status
- **WHEN** a caller submits `{ action: "status", id: "<runId>" }`
- **THEN** the response returns the current status of all tasks in that run
- **AND** each task shows `status: "running"`, `"completed"`, or `"failed"`
- **AND** completed tasks include their `finalOutput` and `artifactPaths`

### Requirement: Async Runs Must Persist Session Data

Async dispatch runs SHALL persist their session files and artifacts so they remain available for status queries even after the initial dispatch call returns.

#### Scenario: Status query after completion
- **WHEN** a caller queries status for a completed async run
- **THEN** all task results are available with `finalOutput`, `artifactPaths`, and `sessionFile`
- **AND** the `aggregateSummary` shows the completion state

### Requirement: Async Must Be Unblocked From V1 Stub

The existing async stub (which returned "Async dispatch is intentionally deferred in the v1 baseline") SHALL be replaced with a working implementation that bridges to `pi-subagents` async execution.

#### Scenario: Async dispatch executes successfully
- **WHEN** a caller submits an async dispatch request
- **THEN** the request is no longer blocked with the deferred message
- **AND** tasks actually run in background and produce results
