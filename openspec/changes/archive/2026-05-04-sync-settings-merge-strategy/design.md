# Design

## Context

`scripts/sync-pi-agent.sh` 的 `render_settings_file()` 函数目前执行的是**覆写**策略：读取仓库源 `.pi/settings.json` → manifest 过滤 → 直接写入 `~/.pi/agent/settings.json`。这导致用户在 Pi 运行时通过 `/scoped-models` 保存的 `enabledModels` 等字段在每次 sync 后丢失。

本次 change 将 `render_settings_file()` 从**覆写**改为**合并**策略，在覆写前后增加缓存与合并步骤。

## Goals / Non-Goals

**Goals:**
- 在 sync 覆写 settings.json 前缓存目标文件的运行时修改字段
- 覆写后将缓存字段合并回目标文件
- 定义 `USER_MANAGED_KEYS` 白名单，初始包含 `enabledModels`
- 保持 manifest 过滤（packages 白名单、exclude_keys）的优先级高于合并

**Non-Goals:**
- 不修改 Pi 运行时写入 settings.json 的行为
- 不添加双向同步或冲突解决 UI
- 不修改 manifest/capabilities.yaml 格式
- 不处理 settings.json 以外的文件

## Decisions

| 决策项 | 选择 | 理由 |
|---|---|---|
| 合并策略 | 目标端优先（target wins） | 用户运行时修改优先于仓库源默认值 |
| 用户管理键白名单 | 硬编码数组 `USER_MANAGED_KEYS` | 简单明确，初始仅 `enabledModels`，后续可扩展 |
| 合并时机 | manifest 过滤**之后** | 确保 manifest 的 exclude_keys 和 packages 白名单不被绕过 |
| 原子写入 | 使用临时文件 + rename | 避免写入中断导致文件损坏 |
| 实现位置 | `render_settings_file()` 内部 | 最小改动，不引入新函数/模块 |

## Risks / Migration

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 缓存的 `enabledModels` 包含已删除 Provider 的模型 | `/scoped-models` 中显示不存在的模型 | Pi 的 `resolveModelScope` 会过滤不存在的模型，显示警告 |
| 合并逻辑引入 JSON 解析错误 | sync 失败 | 原子写入 + 错误处理，失败时保留原始文件 |
| `exclude_keys` 与 `USER_MANAGED_KEYS` 冲突 | 用户期望保留的键被 manifest 排除 | 文档明确说明 manifest exclusions 优先级最高 |
