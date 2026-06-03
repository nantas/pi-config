# Specification Delta

## Capability 对齐（已确认）

- Capability: `agent-file-definitions`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 全部 3 个 capabilities 确认通过

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: agent-frontmatter-format
The system SHALL define agents as `.md` files in `.pi/agents/` directory with YAML frontmatter containing at minimum `name` field, and optional fields: `description`, `tools`, `model`, `thinking`, `systemPrompt`.

#### Scenario: minimal-agent-file
- **WHEN** a `.pi/agents/scout.md` file exists with frontmatter `name: scout` and body text
- **THEN** the agent SHALL be discovered and registered with default values for all optional fields

#### Scenario: full-agent-file
- **WHEN** a `.pi/agents/worker.md` file exists with all frontmatter fields populated
- **THEN** the agent SHALL be discovered with the exact configuration specified

### Requirement: migrate-existing-overrides
The system SHALL create `.pi/agents/*.md` files for each agent currently defined in `subagents.agentOverrides` in `~/.pi/agent/settings.json` and `.pi/settings.json`, preserving the `model`, `thinking`, and `tools` configuration from the overrides.

#### Scenario: override-to-file-migration
- **WHEN** `subagents.agentOverrides` contains `scout` with `model: zhipuai-coding-plan/glm-5.1`, `thinking: minimal`, `tools: [read, grep, ...]`
- **THEN** a `.pi/agents/scout.md` file SHALL be created with matching frontmatter fields and a role-appropriate prompt body

#### Scenario: multi-source-override-merge
- **WHEN** the same agent name appears in both global `settings.json` and project `.pi/settings.json` overrides
- **THEN** the project-level configuration SHALL take precedence and be used for the `.md` file content

### Requirement: agent-discovery-compatibility
The system SHALL ensure all migrated agent files are discoverable by `@johnnywu/pi-subagents@1.5.0` which scans `~/.pi/agent/agents/` and `.pi/agents/` directories.

#### Scenario: discovery-after-sync
- **WHEN** agent files are created in `.pi/agents/` and `scripts/sync-pi-agent.sh` is run
- **THEN** the agent files SHALL be present in `~/.pi/agent/agents/` and discoverable by the new extension
