# Proposal

## 问题定义

`scripts/sync-pi-agent.sh` 在同步 `settings.json` 时，使用 `render_settings_file()` 将仓库源的 `.pi/settings.json` 经过 manifest 过滤后**完整覆写** `~/.pi/agent/settings.json`。这导致用户在 Pi 运行时通过 `/scoped-models` → Ctrl+S 保存的 `enabledModels` 等字段被永久丢失。

当前工作流：
1. 用户在 Pi 中运行 `/scoped-models`，toggle 模型，按 Ctrl+S 保存
2. Pi 将 `enabledModels` 写入 `~/.pi/agent/settings.json`
3. 用户运行 `sync-pi-agent.sh`
4. 脚本用 repo 源的 settings.json 覆写目标，步骤 2 的修改完全丢失

## 范围边界

**In Scope**
- 修改 `scripts/sync-pi-agent.sh` 的 `render_settings_file()` 函数
- 在覆写前缓存目标文件中用户运行时修改的字段
- 覆写后将缓存的字段合并回目标文件
- 定义明确的 "user-managed keys" 白名单（初始仅 `enabledModels`）

**Out of Scope**
- 不修改 Pi 运行时写入 settings.json 的行为（那是 Pi 的设计）
- 不添加复杂的双向同步/冲突解决（只保留目标端值）
- 不改写 manifest/capabilities.yaml 的格式

## Capabilities

### New Capabilities
- `settings-merge-strategy`: 在 sync 覆写 settings.json 前缓存用户运行时修改的字段（`enabledModels`），覆写后合并回目标文件

### Modified Capabilities
- （无修改——本 change 为纯新增 sync 脚本行为）

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **修改文件**: `scripts/sync-pi-agent.sh` 的 `render_settings_file()` 函数
- **用户体验**: `enabledModels` 等运行时修改在 sync 后得以保留
- **兼容性**: 纯新增合并逻辑，不破坏现有过滤行为
- **无破坏性变更**: manifest 过滤、packages 白名单、exclude_keys 逻辑保持不变

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
