# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-natural-language-chain`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: /dispatch Command Must Support Chain Workflow Generation

The `/dispatch` command SHALL instruct the LLM agent to interpret natural-language requests that describe sequential workflows and decompose them into `chain` parameters (rather than only `tasks[]`), including the ability to generate `{previous}`, `{task}`, and `{chain_dir}` template variable usage.

#### Scenario: User describes a chain workflow naturally
- **WHEN** a user runs `/dispatch "first analyze the codebase with scout, then implement the fix with worker"`
- **THEN** the LLM agent receives the natural-language request with context that `chain` mode is available
- **AND** the agent chooses to use `chain: [{agent: "scout", task: "..."}, {agent: "worker", task: "Implement based on {previous}"}]`
- **AND** the agent does not ask the user to write JSON or hand-author parameters

### Requirement: /dispatch Command Must Support Parallel Workflow Generation

The `/dispatch` command SHALL instruct the LLM agent to generate `tasks[]` with `output`, `count`, and `concurrency` parameters from natural-language descriptions of parallel/redundant work.

#### Scenario: User describes parallel tasks with output
- **WHEN** a user runs `/dispatch "review all three files in parallel with worker agent and save results"`
- **THEN** the LLM agent generates a `tasks[]` with three entries and `output` paths
- **AND** the agent may add `concurrency` to control parallelism

#### Scenario: User describes redundant review tasks
- **WHEN** a user runs `/dispatch "have 3 workers independently review the architecture doc"`
- **THEN** the LLM agent generates `{ tasks: [{agent: "worker", task: "Review architecture doc", count: 3}] }`

### Requirement: /dispatch Instruction Must List All Available Parameters

The natural-language prompt injected by `/dispatch` SHALL be updated to inform the LLM agent about all available dispatch parameters, including `chain`, `output`, `count`, `concurrency`, `async`, and `agentScope`, so the agent can make informed decisions about which to use.

#### Scenario: Agent knows about chain mode
- **WHEN** a user submits a chain-like request via `/dispatch`
- **THEN** the injected prompt context includes that `chain` is an available mode
- **AND** the agent generates the appropriate chain structure

#### Scenario: Agent knows about output files
- **WHEN** a user's request implies saving results
- **THEN** the agent can generate `output` fields on tasks
