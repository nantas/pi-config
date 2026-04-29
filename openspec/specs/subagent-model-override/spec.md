# Specification: Subagent Model Override

## Purpose

Define how builtin subagent model assignments are overridden via the `subagents.agentOverrides` mechanism in `.pi/settings.json`, allowing control over which model each builtin subagent uses at runtime.

## Requirements

### Requirement: Builtin Subagent Model Override
The system SHALL override the model of all builtin subagents that use `openai-codex/*` via the `subagents.agentOverrides` mechanism in `.pi/settings.json`.

#### Scenario: All affected agents overridden with customizable models
- **WHEN** `.pi/settings.json` contains `subagents.agentOverrides` for `context-builder`, `oracle`, `planner`, `researcher`, `reviewer`, `scout`, and `worker`
- **THEN** each agent's effective model SHALL be the value specified in its override entry, replacing the original `openai-codex/*` model
- **AND** the specific model string (e.g., `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`) MAY be customized independently per agent based on user requirements
- **AND** agents requiring stronger reasoning (e.g., `oracle`, `planner`) MAY use a more capable model than agents prioritizing speed (e.g., `context-builder`, `scout`)

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
