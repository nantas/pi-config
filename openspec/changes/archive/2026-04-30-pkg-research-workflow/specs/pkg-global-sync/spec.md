# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-global-sync`
- 来源: `proposal.md` / 用户确认
- 变更类型: new
- 用户确认摘要: 加入全局配置时更新 `.pi/settings.json` 的 `packages` 数组，然后通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`，用户确认后执行

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Settings Update for Package Addition
The system SHALL verify the package is present in `.pi/settings.json` `packages` array (normally added by `pi install -l` during Phase 2), and add it only if missing.

#### Scenario: package already present from Phase 2 install
- **WHEN** the package source already exists in `.pi/settings.json` `packages` array (from Phase 2 install)
- **THEN** the system SHALL confirm the entry and proceed to sync without modification

#### Scenario: package missing from settings
- **WHEN** the package source is not in `.pi/settings.json` `packages` array
- **THEN** the system SHALL append the package source string without modifying existing entries

### Requirement: Sync Confirmation Prompt
Before executing the sync script, the system SHALL confirm with the user whether global sync is desired.

#### Scenario: user confirms sync
- **WHEN** user explicitly confirms the sync operation
- **THEN** the system SHALL execute `scripts/sync-pi-agent.sh` to sync `.pi/` contents to `~/.pi/agent/`

#### Scenario: user declines sync
- **WHEN** user declines the sync operation
- **THEN** the system SHALL report that changes remain in `.pi/settings.json` only and sync can be done later

#### Scenario: user defers sync
- **WHEN** user wants to defer sync
- **THEN** the system SHALL record that sync is pending and remind user at closeout

### Requirement: Sync Success Verification
The system SHALL verify the sync operation completed successfully and confirm the package is available globally.

#### Scenario: sync success
- **WHEN** `scripts/sync-pi-agent.sh` exits with code 0
- **THEN** the system SHALL report successful sync and confirm the target paths

#### Scenario: sync failure
- **WHEN** `scripts/sync-pi-agent.sh` exits with non-zero code
- **THEN** the system SHALL report the failure, preserve the error output, and advise the user on manual recovery
