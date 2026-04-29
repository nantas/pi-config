# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-md-sync`
- 来源: `proposal.md` / 用户明确需求
- 变更类型: new
- 用户确认摘要: 创建 `.pi/agent/AGENTS.md`（工具调用指导），更新同步脚本使其复制该文件到全局，更新根 `AGENTS.md` 记录工作流规则

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Project-Managed AGENTS.md

The project SHALL provide a `.pi/agent/AGENTS.md` file containing tool call guidance for LLM agents.

#### Scenario: Tool call guidance content
- **WHEN** an agent reads `.pi/agent/AGENTS.md`
- **THEN** it SHALL find structured guidance on:
  - Edit tool usage (batch limit, content length limit)
  - Bash tool preference for simple text replacements
  - Error recovery protocol (diagnose before retry)

#### Scenario: File located at correct path
- **WHEN** the project is cloned and set up
- **THEN** `.pi/agent/AGENTS.md` SHALL exist in the repository

### Requirement: Sync Script Update

The system SHALL update `scripts/sync-pi-agent.sh` to copy `.pi/agent/AGENTS.md` to `~/.pi/agent/AGENTS.md` during sync.

#### Scenario: AGENTS.md synced on execution
- **WHEN** `scripts/sync-pi-agent.sh` runs and `.pi/agent/AGENTS.md` exists
- **THEN** the file SHALL be copied to `~/.pi/agent/AGENTS.md`

#### Scenario: AGENTS.md removed on source deletion
- **WHEN** `scripts/sync-pi-agent.sh` runs and `.pi/agent/AGENTS.md` does not exist
- **THEN** the script SHALL remove `~/.pi/agent/AGENTS.md` if it exists

#### Scenario: Other files preserved
- **WHEN** `scripts/sync-pi-agent.sh` copies AGENTS.md
- **THEN** existing files in `~/.pi/agent/` (settings.json, extensions/, etc.) SHALL NOT be affected

### Requirement: Root AGENTS.md Workflow Rule

The project's root `AGENTS.md` SHALL document the workflow for updating global agent guidance.

#### Scenario: Workflow rule for updating global guidance
- **WHEN** a task requires changing cross-session agent behavior guidance
- **THEN** the root `AGENTS.md` SHALL instruct:
  1. First update `.pi/agent/AGENTS.md` in the repository
  2. Get user confirmation before syncing to global
  3. Run `scripts/sync-pi-agent.sh` for deployment

#### Scenario: User confirmation required
- **WHEN** the sync to `~/.pi/agent/AGENTS.md` is proposed
- **THEN** the agent SHALL obtain explicit user confirmation before executing the sync script
