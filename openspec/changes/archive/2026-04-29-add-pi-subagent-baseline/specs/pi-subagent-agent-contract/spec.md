# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-subagent-agent-contract`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: `2026-04-29` 用户确认 `.pi/agents/*.md` 应作为 subagent persona 与执行策略的唯一真源，字段一次定全，调用层只开放最小动态控制面

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Agent Files Must Be The Source Of Truth
The system SHALL define `.pi/agents/*.md` as the source of truth for project-local subagent definitions, including persona and execution policy.

#### Scenario: Contributor reviews subagent configuration ownership
- **WHEN** a contributor checks where subagent behavior is defined in `pi-config`
- **THEN** the contributor can identify `.pi/agents/*.md` as the canonical location for project-local subagent persona and execution policy

### Requirement: Project Agent Resolution Must Remain Compatible With Pi User-Level Agent Discovery
The system SHALL keep project-local `.pi/agents/*.md` compatible with Pi's user-level agent discovery by allowing repository-owned project agents to override user-level agents from `~/.pi/agent/agents` without requiring project-local agents to exist in every repository.

#### Scenario: Dispatch runs in a repository without local `.pi/agents`
- **WHEN** a contributor uses the repository-owned dispatch baseline from a repository that has no project-local `.pi/agents`
- **THEN** user-level agents from `~/.pi/agent/agents` remain available as the default fallback agent definitions

### Requirement: Agent Files Must Support Full V1 Strategy Fields
The system SHALL define a formal frontmatter contract for `.pi/agents/*.md` that includes `name`, `description`, `systemPromptMode`, `tools`, `extensions`, `cwd`, `inheritProjectContext`, `inheritSkills`, and optional repository-owned fixed `skills`.

#### Scenario: Agent author creates a new subagent definition
- **WHEN** an author adds a new project-local subagent
- **THEN** the author can express the subagent persona plus its v1 execution strategy using the formal frontmatter fields

### Requirement: Agent Contract Must Support Fixed Skill Injection
The system SHALL allow an agent definition to declare repository-owned fixed `skills` so that skill-sensitive delegated tasks can run without depending on ad-hoc task-level skill strings.

#### Scenario: Repository defines a skill-sensitive delegate
- **WHEN** a contributor creates an agent for a task class that must use a specific skill
- **THEN** the contributor can encode that fixed skill requirement in the agent file
- **AND** dispatch can rely on the agent contract rather than requiring the user to write a raw `skill` override

### Requirement: Agent Policy Must Not Be Split Across Multiple Truth Sources
The system SHALL keep subagent execution policy in `.pi/agents/*.md` and SHALL not require `.pi/settings.json` or runtime tool parameters to act as a second source of truth for per-agent policy in v1.

#### Scenario: Contributor evaluates a policy change
- **WHEN** a contributor needs to change a subagent's allowed tools or default project-context behavior
- **THEN** the contributor can make that change in the agent file without also redefining the same policy in `.pi/settings.json`

### Requirement: Agent Contract Must Support Project Context Defaults
The system SHALL allow each agent definition to declare a default project-context inheritance policy that can be used by the dispatch layer when no runtime override is provided.

#### Scenario: Dispatch call omits project context override
- **WHEN** a dispatch task does not specify a project-context preference
- **THEN** execution uses the default project-context inheritance policy defined by the selected agent file

### Requirement: Agent Contract Must Be Compatible With Future Orchestration Layers
The system SHALL define the v1 agent contract in a way that remains consumable by future `team`, `chain`, and richer orchestration layers without requiring a second agent schema.

#### Scenario: Future orchestration capability is planned
- **WHEN** a later change introduces `team` or `chain` orchestration
- **THEN** the design can continue using `.pi/agents/*.md` as the agent-definition substrate rather than inventing a separate persona schema

## MODIFIED Requirements

## REMOVED Requirements

## RENAMED Requirements
