# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-fff-global-package`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: modified
- 用户确认摘要: 用户要求将 `@ff-labs/pi-fff` 纳入全局能力管理，通过 `capabilities.yaml` → `sync-pi-agent.sh` → `~/.pi/agent/settings.json` 路径同步

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Global packages list includes pi-fff

The system SHALL include `npm:@ff-labs/pi-fff` in `global.settings.packages` within `capabilities.yaml`.

- The entry SHALL use the `npm:` source type prefix
- The entry SHALL reference the exact npm package name `@ff-labs/pi-fff`
- The entry SHALL be a distinct item in the packages list array

#### Scenario: Capabilities manifest after modification

- **WHEN** reading `global.settings.packages` from `capabilities.yaml`
- **THEN** the list SHALL contain `npm:@ff-labs/pi-fff`
- **AND** all existing package entries SHALL remain unchanged

### Requirement: Settings sync includes pi-fff

The system SHALL propagate `npm:@ff-labs/pi-fff` to `~/.pi/agent/settings.json` via the `render_settings_file` step of `sync-pi-agent.sh`.

- After sync, `~/.pi/agent/settings.json` SHALL contain `npm:@ff-labs/pi-fff` in its `packages` array
- Any existing packages in the target file that are NOT in the manifest SHALL be preserved (merge behavior)

#### Scenario: Sync after manifest update

- **WHEN** `scripts/sync-pi-agent.sh` is executed
- **AND** `capabilities.yaml` contains `npm:@ff-labs/pi-fff` in `global.settings.packages`
- **THEN** `~/.pi/agent/settings.json` SHALL contain `npm:@ff-labs/pi-fff` in `packages`

### Requirement: Deduplication protects pi-fff

The system SHALL treat `pi-fff` as a dedup target: if any project-level `.pi/settings.json` also contains a package resolving to the same name, the sync script dedup step SHALL remove the project-level duplicate.

#### Scenario: Project has pi-fff locally installed

- **WHEN** a project in `repo_registry.json` has `npm:@ff-labs/pi-fff` in its `.pi/settings.json`
- **AND** `npm:@ff-labs/pi-fff` is also in global `packages`
- **THEN** the sync script dedup step SHALL remove the project-level entry
