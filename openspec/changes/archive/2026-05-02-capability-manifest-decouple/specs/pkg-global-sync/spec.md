# Specification Delta: pkg-global-sync

## Capability 对齐（已确认）

- Capability: `pkg-global-sync`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 已确认从同步全部 packages 改为只同步 capabilities.yaml 中 global.settings.packages 声明的包

## 规范真源声明

- 本文件是 `pkg-global-sync` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Global Pi Sync Must Use Whitelist Filtering For Packages
The system SHALL filter `.pi/settings.json` packages to only those listed in `global.settings.packages` in `.pi/capabilities.yaml` when deploying to `~/.pi/agent/settings.json`, rather than syncing all packages.

#### Scenario: Whitelisted packages are synced
- **WHEN** the sync script processes packages
- **THEN** only packages present in `global.settings.packages` appear in the global settings output

#### Scenario: Non-whitelisted packages are excluded
- **WHEN** `.pi/settings.json` contains `npm:lsp-pi` but it is not in the whitelist
- **THEN** `npm:lsp-pi` is excluded from `~/.pi/agent/settings.json`

#### Scenario: Whitelist is sourced from manifest
- **WHEN** the whitelist is determined
- **THEN** it is read from `global.settings.packages` in `.pi/capabilities.yaml`, not hardcoded in the sync script

### Requirement: Global Pi Sync Must Still Use Existing Managed Path And Confirmation
The system SHALL deploy confirmed repository-managed Pi settings to `~/.pi/agent/settings.json` through the existing managed sync path and SHALL still require explicit user confirmation.

#### Scenario: User confirms global sync
- **WHEN** the user confirms that the new repository-managed Pi settings should be deployed globally
- **THEN** the workflow executes the sync path with whitelist filtering applied

#### Scenario: Sync requires confirmation
- **WHEN** a change is ready to deploy repository-managed Pi settings globally
- **THEN** deployment does not run until the user explicitly confirms it

### Requirement: Global Pi Sync Must Render Local Path Packages As Absolute
The system SHALL continue to render local-path package sources (e.g., `./packages/subagent-dispatch`) as absolute filesystem paths when writing to `~/.pi/agent/settings.json`.

#### Scenario: Local path is rendered as absolute
- **WHEN** `./packages/subagent-dispatch` is in the whitelist
- **THEN** the global output contains the absolute path to that package
