# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-agent-management-readonly`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dispatch Must Support Agent List Action

The dispatch tool SHALL accept `{ action: "list", agentScope?: "user" | "project" | "both" }` to list all available agents. The response SHALL include each agent's name, source (builtin/user/project), and description.

#### Scenario: Caller lists all agents
- **WHEN** a caller submits `{ action: "list" }`
- **THEN** the response includes a summary of available agents with name, source, and description

#### Scenario: List with agentScope filter
- **WHEN** a caller submits `{ action: "list", agentScope: "project" }`
- **THEN** only project-level agents are returned

### Requirement: Dispatch Must Support Agent Get Action

The dispatch tool SHALL accept `{ action: "get", agent: "<name>" }` to retrieve detailed information about a specific agent, including its `name`, `description`, `source`, `systemPromptMode`, `inheritProjectContext`, `inheritSkills`, `skills`, `tools`, `extensions`, `model`, `cwd`, and `filePath`.

#### Scenario: Caller retrieves agent details
- **WHEN** a caller submits `{ action: "get", agent: "planner" }`
- **THEN** the response includes the full agent definition with all available fields
- **AND** if the agent does not exist, a clear error message is returned

### Requirement: Dispatch Must Support Agent Status Query

The dispatch tool SHALL accept `{ action: "status", id: "<runId>" }` to query the status of a dispatch run, supporting both sync and async runs.

#### Scenario: Caller queries dispatch run status
- **WHEN** a caller submits `{ action: "status", id: "<runId>" }`
- **THEN** the response returns the current state of all tasks in that run
- **AND** if the run does not exist or has expired, a clear message is returned
