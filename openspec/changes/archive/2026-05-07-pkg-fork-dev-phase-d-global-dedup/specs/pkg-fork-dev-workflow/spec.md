# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-fork-dev-workflow`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: Phase D/E 新增全局去重门禁、持久化记录与恢复步骤

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: phase-d-global-dedup-gate
Phase D step D1a SHALL check whether `~/.pi/agent/settings.json` contains a package entry whose identity (per Pi's `getPackageIdentity`) differs from the local path being used in project settings but resolves to the same package. When detected, the skill SHALL temporarily remove the conflicting entry from global settings and persist the removal record.

#### Scenario: local path in project conflicts with git source in global
- **WHEN** project `.pi/settings.json` has `/Users/.../forks/pkg-name` and global `~/.pi/agent/settings.json` has `git:github.com/user/pkg-name`
- **THEN** the skill removes `git:github.com/user/pkg-name` from global settings and writes a persistent record of the removal

#### Scenario: no conflict exists
- **WHEN** project settings uses a local path but global settings has no entry for the same package
- **THEN** the skill proceeds without modification, records no override

### Requirement: global-override-persistence
The skill SHALL persist global override state in a location that survives session loss. For OpenSpec changes, the record SHALL be in `writeback.md`. For standalone fork modifications, the record SHALL be in `<dev-clone>/.pi-dev-state.json`.

#### Scenario: session crashes during Phase D
- **WHEN** a session is lost while global settings has been modified
- **THEN** the override record exists in `writeback.md` or `.pi-dev-state.json` and can be used to restore global settings

### Requirement: phase-e-global-restore
Phase E step E4 SHALL restore all global settings entries that were removed during Phase D, using the persistent override record. The override record SHALL be cleaned up after successful restoration.

#### Scenario: shipping a fork modification
- **WHEN** Phase E restores project settings from local path back to git URL
- **THEN** the skill also restores the previously removed entries in `~/.pi/agent/settings.json` and removes the override record

## MODIFIED Requirements

### Requirement: phase-d-switch-source
Phase D step D1 (switch project source to local path) SHALL be preceded by the global dedup gate (D1a) to prevent dual-load conflicts. The original D1 behavior of updating `.pi/settings.json` remains unchanged.

#### Scenario: developer starts local testing
- **WHEN** developer executes Phase D
- **THEN** D1a runs first (global dedup check), then D1 switches the project source

### Requirement: phase-e-restore-source
Phase E step E4 (restore source to git URL) SHALL also restore global settings entries removed during Phase D. The original E4 behavior of updating `.pi/settings.json` remains unchanged.

#### Scenario: developer ships changes
- **WHEN** developer executes Phase E
- **THEN** E4 restores both project settings (git URL) and global settings (re-add removed entries), then cleans up override records
