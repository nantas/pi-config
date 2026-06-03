# Specification Delta

## Capability 对齐（已确认）

- Capability: `subagent-settings`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 全部 3 个 capabilities 确认通过

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: remove-agent-overrides-from-settings
The system SHALL remove the `subagents.agentOverrides` key from both `~/.pi/agent/settings.json` and `.pi/settings.json` and from `.pi/capabilities.yaml` (global.settings.subagents), since agent configuration is now handled by `.md` files.

#### Scenario: global-settings-cleanup
- **WHEN** `~/.pi/agent/settings.json` contains `subagents.agentOverrides` with 7 agent entries
- **THEN** the `subagents` key SHALL be removed entirely (no longer needed by the new extension)

#### Scenario: project-settings-cleanup
- **WHEN** `.pi/settings.json` contains `subagents.agentOverrides` with scout and worker overrides
- **THEN** the `subagents` key SHALL be removed entirely

#### Scenario: capabilities-yaml-cleanup
- **WHEN** `.pi/capabilities.yaml` contains `subagents` under `global.settings`
- **THEN** the `subagents` key SHALL be removed from `global.settings`

### Requirement: preserve-non-subagents-settings
The system SHALL preserve all other settings keys (packages, defaultThinkingLevel, defaultProvider, defaultModel, enabledModels, quietStartup, etc.) unchanged during the migration.

#### Scenario: settings-isolation
- **WHEN** the migration removes `subagents` from settings
- **THEN** all other keys in settings.json files SHALL remain identical to their pre-migration values
