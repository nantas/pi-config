# Specification Delta

## Capability 对齐（已确认）

- Capability: `subagent-prompt-guide`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户确认创建 `.pi/prompts/subagent.md` 作为编排入口，替代 dispatch extension 和 dispatch-planner agent

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Repository Must Provide A /subagent Orchestration Prompt
The system SHALL provide a `.pi/prompts/subagent.md` prompt file that serves as the entry point for multi-agent orchestration, replacing the removed `dispatch` tool and `/dispatch` command.

#### Scenario: LLM needs to delegate work to a subagent
- **WHEN** the LLM needs to delegate a single task to a subagent
- **THEN** the prompt provides a concise pattern for `subagent({ agent: "...", task: "..." })` usage

#### Scenario: LLM needs to run parallel subagents
- **WHEN** the LLM needs to delegate multiple non-conflicting tasks simultaneously
- **THEN** the prompt provides a concise pattern for `subagent({ tasks: [...] })` usage

#### Scenario: LLM needs a sequential chain of subagents
- **WHEN** the LLM needs to run agents in a sequence where each feeds into the next
- **THEN** the prompt provides a concise pattern for `subagent({ chain: [...] })` usage

### Requirement: Prompt Must Be Concise And Action-Oriented
The prompt SHALL be a concise, command-style quick-reference that fits in a single screen, not a comprehensive API reference.

#### Scenario: LLM reads the prompt under token pressure
- **WHEN** the prompt is loaded into the system prompt
- **THEN** it consumes minimal token budget while still providing actionable patterns
- **AND** it explicitly directs the LLM to the pi-subagents skill for advanced usage (intercom, control events, resume, agent management)

### ~~Requirement: Prompt Must Provide Dispatch Migration Mappings~~ (REMOVED)

The prompt is an agent-facing orchestration guide, not a migration reference. The native `subagent()` tool's three modes (single/chain/parallel) are documented directly without migration context. Dispatch references in the repo are limited to `README.md` migration context mentions.

### ~~Requirement: Prompt Must Cover Common Workflows~~ (REMOVED)

Workflow patterns (recon→plan→implement, parallel review, etc.) are fully documented in the `pi-subagents` built-in skill (`SKILL.md`). The prompt references the skill for detailed patterns, avoiding duplication.

### Requirement: Prompt Must Reference Pi-Subagents Skill For Advanced Usage
The prompt SHALL include a reference to the bundled pi-subagents skill (loaded via `skills: pi-subagents` or available in the runtime) for advanced capabilities such as intercom coordination, forked context, control events, async background runs, resume, and agent management.

#### Scenario: LLM needs async execution
- **WHEN** the LLM needs to launch a long-running task in the background
- **THEN** the prompt directs to the pi-subagents skill for `async: true` usage

#### Scenario: LLM needs intercom coordination
- **WHEN** the LLM needs bidirectional communication with a subagent
- **THEN** the prompt directs to the pi-subagents skill for intercom patterns

### Requirement: Prompt Must Include Error Recovery Guidance
The prompt SHALL provide quick troubleshooting patterns for common subagent failures: unknown agent, setup confusion, forked context failures, and max nesting depth.

#### Scenario: LLM encounters an unknown agent error
- **WHEN** the LLM tries to call a subagent that doesn't exist
- **THEN** the prompt suggests `subagent({ action: "list" })` to discover available agents

#### Scenario: LLM needs to diagnose setup issues
- **WHEN** subagent execution fails due to configuration or environment
- **THEN** the prompt suggests `subagent({ action: "doctor" })` for diagnostics
