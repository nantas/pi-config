# Specification Delta: pi-runtime-bootstrap-sync

## Capability 对齐（已确认）

- Capability: `pi-runtime-bootstrap-sync`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 结构性迁移 — subagent-dispatch 从 package 路径迁至 extension 路径，sync 脚本对应调整加载逻辑

## 规范真源声明

- 本文件是 `pi-runtime-bootstrap-sync` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Sync Script Must Migrate Package Dependency Support To Extension Path
The system SHALL migrate the `ensure_local_package_dependencies` logic from supporting `.pi/packages/subagent-dispatch/` to supporting `.pi/extensions/subagent-dispatch/`, and SHALL remove the local-path-to-absolute rendering for `./packages/subagent-dispatch` from the settings JSON rendering logic. The migrated npm install behavior SHALL be functionally identical — running `npm install --no-package-lock --ignore-scripts` when `package.json` exists and `node_modules/` is missing.

#### Scenario: Extension npm install triggers correctly
- **WHEN** the sync script runs and `.pi/extensions/subagent-dispatch/package.json` exists
- **THEN** the script runs `npm install --no-package-lock --ignore-scripts` inside that directory if `node_modules/pi-subagents` is missing

#### Scenario: Legacy local package path rendering is removed
- **WHEN** the sync script renders `~/.pi/agent/settings.json`
- **THEN** the node rendering script no longer maps `./packages/subagent-dispatch` to an absolute path

#### Scenario: Extension is synced via manifest
- **WHEN** the sync script processes global extensions from `.pi/capabilities.yaml`
- **THEN** `subagent-dispatch/` directory under `.pi/extensions/` is copied to `~/.pi/agent/extensions/subagent-dispatch/`

### Requirement: Bootstrap Sync Must Remove Stale Settings Entry
The system SHALL ensure that after migration, the `./packages/subagent-dispatch` entry is no longer present in `~/.pi/agent/settings.json` packages array on next sync.

#### Scenario: Settings package whitelist excludes legacy path
- **WHEN** the sync script filters packages by `global.settings.packages` whitelist
- **THEN** `./packages/subagent-dispatch` is excluded because it no longer appears in the whitelist
