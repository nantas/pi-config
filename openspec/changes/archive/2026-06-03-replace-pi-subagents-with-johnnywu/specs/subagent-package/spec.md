# Specification Delta

## Capability 对齐（已确认）

- Capability: `subagent-package`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 全部 3 个 capabilities 确认通过

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: package-reference-update
The system SHALL update all references from `npm:pi-subagents@0.24.0` to `npm:@johnnywu/pi-subagents@1.5.0` in `.pi/capabilities.yaml` (global.settings.packages) and `~/.pi/agent/settings.json` (packages array).

#### Scenario: capabilities-yaml-update
- **WHEN** `.pi/capabilities.yaml` contains `npm:pi-subagents@0.24.0` in `global.settings.packages`
- **THEN** it SHALL be replaced with `npm:@johnnywu/pi-subagents@1.5.0`

#### Scenario: global-settings-update
- **WHEN** `~/.pi/agent/settings.json` packages array contains `npm:pi-subagents@0.24.0`
- **THEN** it SHALL be replaced with `npm:@johnnywu/pi-subagents@1.5.0` after sync

### Requirement: old-package-removal
The system SHALL ensure the old `pi-subagents@0.24.0` package is uninstalled from the global npm modules before installing the new package.

#### Scenario: clean-replacement
- **WHEN** `pi-subagents@0.24.0` is installed globally at `/Users/nantasmac/.nvm/versions/node/v24.15.0/lib/node_modules/pi-subagents/`
- **THEN** it SHALL be uninstalled via `pi uninstall` or equivalent before the new package is installed

## REMOVED Requirements

### Requirement: builtin-agents-discovery
**Reason**: New version does not bundle builtin agents; all agents are discovered from `.pi/agents/` and `~/.pi/agent/agents/` directories.
**Migration**: Agent definitions must be created as `.md` files (see `agent-file-definitions` spec).

### Requirement: packaged-skills-and-prompts
**Reason**: New version only provides an extension (no skills/ or prompts/ directories).
**Migration**: The old `pi-subagents` skill and 6 prompt templates are no longer injected. Users who relied on them should create project-level skills or prompts as needed.
