# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-runtime-bootstrap-sync`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 用户确认将 settings.json 生成方式从 whitelist+exclude_keys 交集模式改为 capabilities.yaml 直接生成+目标合并模式；去掉 exclude_keys 字段

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Bootstrap Sync Must Generate Settings From Manifest Directly
The system SHALL generate `~/.pi/agent/settings.json` directly from the `global.settings` section of `.pi/capabilities.yaml`, rather than filtering `.pi/settings.json` through a whitelist. For each key present in `global.settings`, the manifest value SHALL be authoritative. For keys not present in `global.settings`, the existing value in the target `~/.pi/agent/settings.json` SHALL be preserved. The user-managed key `enabledModels` SHALL always be preserved from the target regardless.

#### Scenario: Packages are generated from manifest
- **WHEN** the sync script processes settings
- **THEN** the `packages` array in `~/.pi/agent/settings.json` SHALL exactly match the `global.settings.packages` list from `.pi/capabilities.yaml`

#### Scenario: Nested subagents config is generated from manifest
- **WHEN** the sync script processes settings
- **THEN** the `subagents` object in `~/.pi/agent/settings.json` SHALL match the `global.settings.subagents` structure from `.pi/capabilities.yaml`

#### Scenario: Simple config values are generated from manifest
- **WHEN** the sync script processes settings
- **THEN** `defaultThinkingLevel`, `defaultProvider`, and `defaultModel` in `~/.pi/agent/settings.json` SHALL match their counterparts in `global.settings`

#### Scenario: User-managed enabledModels is preserved
- **WHEN** the sync script processes settings
- **THEN** `enabledModels` in `~/.pi/agent/settings.json` SHALL be preserved from the existing target file, not overwritten by the manifest

#### Scenario: Keys not in manifest are preserved from target
- **WHEN** `~/.pi/agent/settings.json` contains keys that are not declared in `global.settings` (e.g., `lastChangelogVersion`, user-added custom keys)
- **THEN** those keys SHALL be preserved with their existing values

#### Scenario: Local .pi/settings.json is not used for global generation
- **WHEN** the sync script processes settings
- **THEN** it SHALL NOT read `.pi/settings.json` from the pi-config repository for the purpose of generating `~/.pi/agent/settings.json`

## REMOVED Requirements

### Requirement: Bootstrap Sync Must Filter Settings By Manifest Rules (旧版)
**Reason**: 旧版使用 whitelist + exclude_keys 交集模式从 `.pi/settings.json` 过滤生成全局 settings.json。新方案改为直接从 capabilities.yaml 生成，不再需要 whitelist 概念和 exclude_keys 字段。
**Migration**: 
- `global.settings.packages` 从 whitelist 角色升级为 packages 的权威数据源，不再依赖 `.pi/settings.json` 中的对应条目
- `global.settings.exclude_keys` 不再需要；所有需要同步的 settings 字段改为显式列在 `global.settings` 中
- `.pi/settings.json` 中的全局配置字段（defaultProvider、defaultModel、defaultThinkingLevel、subagents 等）迁移到 capabilities.yaml 的 `global.settings` 中
- `.pi/settings.json` 仅保留本地开发配置用途

### Requirement: Bootstrap Sync Must Define Selective Path Mapping Via Manifest (部分修改)
**Reason**: Requirement 2 中引用了 `global.settings.packages` 作为选择性路径映射的一部分。需要更新为引用新的 Requirement 3。
**Migration**: Requirement 2 的描述文本中的 "global.settings.packages" 引用更新为指向新的 Requirement 3 中的直接生成模式。
