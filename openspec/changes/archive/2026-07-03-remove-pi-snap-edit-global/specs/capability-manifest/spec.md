# Specification Delta

## Capability 对齐（已确认）

- Capability: `capability-manifest`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 确认从 `.pi/capabilities.yaml` 的 `global.settings.packages` 移除 `npm:pi-snap-edit`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: global-settings-packages-list
`.pi/capabilities.yaml` 的 `global.settings.packages` 列表 SHALL 是全局同步到 `~/.pi/agent/settings.json` 的权威 packages 来源。该列表 MUST NOT 包含 `npm:pi-snap-edit`。移除一个 package 条目后，运行 `scripts/sync-pi-agent.sh` MUST 自动从 `~/.pi/agent/settings.json` 同步移除对应条目（manifest 为 authoritative 列表）。

#### Scenario: 移除 snap-edit 后同步 settings
- **WHEN** `global.settings.packages` 不再包含 `npm:pi-snap-edit` 且运行 sync 脚本
- **THEN** `~/.pi/agent/settings.json` 的 `packages` 数组不再包含 `npm:pi-snap-edit`

#### Scenario: manifest 不残留 snap-edit
- **WHEN** 检查 `.pi/capabilities.yaml` 的 `global.settings.packages`
- **THEN** 不应出现 `npm:pi-snap-edit` 或任何 snap-edit 变体（含版本后缀如 `npm:pi-snap-edit@x.y.z`）

### Requirement: package-removal-node-modules-cleanup
当从全局能力移除一个已安装的 package 时，MUST 在 sync 脚本重写 `settings.json` 之外，额外执行 `pi remove <source>`（或等价的手动清理 `~/.pi/agent/node_modules/<pkg>`），因为 sync 脚本只重写配置文件、不卸载已安装的 node_modules。验证 MUST 确认 `~/.pi/agent/node_modules/` 下不再存在该包目录。

#### Scenario: 完整移除 snap-edit 安装
- **WHEN** 从 manifest 移除 `npm:pi-snap-edit` 并完成同步
- **THEN** 执行 `pi remove npm:pi-snap-edit` 后 `~/.pi/agent/node_modules/pi-snap-edit` 目录不再存在
- **THEN** 新 session 的工具列表恢复原生 `edit`，不再出现 `quick_edit` / `target_edit`
