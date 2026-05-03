# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-parameter-scope`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dispatch Must Support Agent Scope Selection

The dispatch tool SHALL accept an optional `agentScope` parameter at the top level, with values `"user"`, `"project"`, or `"both"`, to control which agent definitions are discoverable for the dispatch request.

#### Scenario: Dispatch with project scope
- **WHEN** a caller submits `{ agentScope: "project", tasks: [{agent: "code-writer", task: "Fix bug"}] }`
- **THEN** only project-level agent definitions are considered for resolution
- **AND** if the requested agent is not found in the project scope, an error is returned

#### Scenario: Dispatch with both scope (default)
- **WHEN** a caller submits `{ tasks: [{agent: "worker", task: "Do X"}] }` without `agentScope`
- **THEN** agents from all scopes (builtin, user, project) are considered
- **AND** project-level agents take precedence over user-level on name collision

#### Scenario: Dispatch with user scope
- **WHEN** a caller submits `{ agentScope: "user", tasks: [{agent: "my-custom-agent", task: "Do X"}] }`
- **THEN** only user-level and builtin agent definitions are considered
