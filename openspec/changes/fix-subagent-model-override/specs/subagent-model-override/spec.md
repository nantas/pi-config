# Specification Delta

## Capability 对齐（已确认）

- Capability: `subagent-model-override`
- 来源: `proposal.md`
- 变更类型: new
- 用户确认摘要: 将 7 个 builtin subagent 的 model 覆盖为 `deepseek/deepseek-v4-flash`，`delegate` 和 project-owned agents 不变

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Builtin Subagent Model Override
The system SHALL override the model of all builtin subagents that use `openai-codex/*` to `deepseek/deepseek-v4-flash` via the `subagents.agentOverrides` mechanism in `.pi/settings.json`.

#### Scenario: All affected agents overridden
- **WHEN** `.pi/settings.json` contains `subagents.agentOverrides` for `context-builder`, `oracle`, `planner`, `researcher`, `reviewer`, `scout`, and `worker`
- **THEN** each agent's effective model SHALL be `deepseek/deepseek-v4-flash` regardless of the original model defined in the agent's `.md` file

#### Scenario: Delegate agent unchanged
- **WHEN** the `delegate` agent is dispatched
- **THEN** the agent SHALL use its default behavior (inherit parent model) without any override applied

#### Scenario: Project-owned agents unchanged
- **WHEN** `code-writer` or `dispatch-planner` agents are dispatched
- **THEN** each agent SHALL use its default behavior (inherit parent model) without any override applied

### Requirement: Override Format
The system SHALL use the `subagents.agentOverrides` map format as defined by `pi-subagents` to apply model overrides.

#### Scenario: Valid override format
- **WHEN** the agent override entry is `{ "model": "deepseek/deepseek-v4-flash" }`
- **THEN** the `pi-subagents` discovery logic SHALL apply the override and the agent's effective model SHALL be `deepseek/deepseek-v4-flash`

### Requirement: Dispatch Works with Overridden Models
After the override is applied, dispatching any builtin subagent SHALL succeed (no "No API key found" error).

#### Scenario: Researcher dispatch succeeds
- **WHEN** `dispatch` is called with `agent: "researcher"`
- **THEN** the subagent SHALL start with model `deepseek/deepseek-v4-flash` and SHALL execute at least 1 turn successfully
