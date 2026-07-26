# Specification Delta

## Capability 对齐（已确认）

- Capability: `analysis-tool`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户已确认四项 capability 清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: register-pi-tool
The extension SHALL register a Pi tool named `trellis_analytics` using `pi.registerTool()` with a TypeBox parameter schema.

#### Scenario: tool-registration
- **WHEN** the extension loads
- **THEN** `trellis_analytics` tool is registered and available to the LLM

#### Scenario: tool-parameters
- **WHEN** the tool is called
- **THEN** it SHALL accept: `action` (string, required): one of `summary`, `context-consumption`, `timeline`, `list-sessions`, `task-detail`; `task_slug` (string, optional): filter by task; `session_id` (string, optional): filter by Pi session ID

### Requirement: summary-action
The tool SHALL support a `summary` action that returns an overview of recorded analytics data.

#### Scenario: global-summary
- **WHEN** `trellis_analytics({ action: "summary" })` is called without task/session filter
- **THEN** return: total session count, total event count, list of tracked workflows with event counts, top 5 most-loaded skills

#### Scenario: task-scoped-summary
- **WHEN** `trellis_analytics({ action: "summary", task_slug: "05-12-my-task" })` is called
- **THEN** return: task slug, session count, event count, workflows detected, inject files count, invoke resolution rate, top skill loads

### Requirement: context-consumption-action
The tool SHALL support a `context-consumption` action that reports how injected context was consumed by the agent.

#### Scenario: consumption-report
- **WHEN** `trellis_analytics({ action: "context-consumption", task_slug: "..." })` is called
- **THEN** return:
  - Phase(s) detected with injected context
  - Per phase: files injected (with modes), invoke targets, whether each invoke was resolved
  - References extracted from inline content and whether each was followed
  - Consumption rate: resolved_invoke_count / total_invoke_count

### Requirement: timeline-action
The tool SHALL support a `timeline` action that returns a chronological event stream for a session or task.

#### Scenario: session-timeline
- **WHEN** `trellis_analytics({ action: "timeline", session_id: "..." })` is called
- **THEN** return: ordered list of events with timestamp, turn, event type, and a one-line summary per event

### Requirement: list-sessions-action
The tool SHALL support a `list-sessions` action that lists available analytics data.

#### Scenario: list-all
- **WHEN** `trellis_analytics({ action: "list-sessions" })` is called
- **THEN** return: list of tracked sessions with start time, event count, associated task slug (if any)
