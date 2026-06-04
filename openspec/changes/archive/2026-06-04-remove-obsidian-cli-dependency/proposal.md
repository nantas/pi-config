# Proposal

## 问题定义

`obsidian-tools` 扩展在 Pi session 启动时，只要检测到当前目录属于 Obsidian vault（存在 `.obsidian/` 文件夹），就会通过 `preloadKnownVaults()` 自动启动 Obsidian CLI 进程（`obsidian vaults verbose`）。这会在 macOS 上触发 Obsidian.app 启动。

然而，该扩展的搜索实现已完全迁移至 `rg`（ripgrep）后端，不再依赖 Obsidian CLI 完成任何搜索操作。`preloadKnownVaults()` 的唯一用途是加载 vault name → path 映射表（`knownVaults`），用于支持用户通过短名称引用 vault。实际代码路径中，`knownVaults` 为空时 vault 解析仍能正常工作（通过文件系统遍历 `.obsidian/` 定位 vault root + basename 作为标识）。

**核心矛盾**：启动了 CLI 进程，但没有产生不可替代的价值。

## 范围边界

| 维度 | 说明 |
|------|------|
| **In scope** | 移除 `vault-resolver.ts` 中的 CLI 依赖（`preloadKnownVaults` / `knownVaults` / `matchPathToKnownVaults` 等） |
| **In scope** | 删除 `cli-runner.ts`（不再有调用方） |
| **In scope** | 简化 `index.ts` 的 `session_start` 钩子 |
| **In scope** | 简化 `search-tool.ts` 中的 vault 解析调用链 |
| **Out of scope** | 搜索功能逻辑变更（`rg` 调用、排序、输出格式不变） |
| **Out of scope** | 扩展 API 签名变更 |
| **Out of scope** | `search-config.yaml` 加载逻辑变更 |

## Capabilities

### Modified Capabilities

- `obsidian-tools`: 移除 obsidian-tools 扩展的 Obsidian CLI 启动依赖，vault 解析改为纯文件系统驱动；删除 `cli-runner.ts` 及所有 CLI 相关状态和辅助函数；保持搜索功能不变。

## Capabilities 待确认项

- [x] 能力清单已与用户确认：仅修改 `obsidian-tools` 一项能力

## Impact

- **启动行为**：Pi 打开含 `.obsidian/` 的仓库时不再启动 Obsidian CLI 进程
- **功能保持**：`obsidian_search` 工具全部功能不变（搜索、排序、config 加载、scope 解析）
- **代码简化**：预计净删除 ~400 行代码（`cli-runner.ts` 全文件 + `vault-resolver.ts` 多个函数/状态 + 相关 import）
- **用户体验**：Vault 名称在输出中改为 basename 展示（`path.basename(vaultPath)`），不影响实际功能
- **配置联动**：无需修改 `capabilities.yaml`（扩展注册条目不变）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：`repo://pi-config` / N/A / N/A
