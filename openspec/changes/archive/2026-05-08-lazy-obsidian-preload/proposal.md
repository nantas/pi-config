# Proposal

## 问题定义

`obsidian-tools` extension 在 pi session 启动时通过 `session_start` 事件无条件执行 `preloadKnownVaults()`，该函数调用 `obsidian vaults verbose` CLI 命令。当 Obsidian 应用未运行时，此 CLI 调用会触发 Obsidian app 启动并打开 vault 窗口，导致用户在非 Obsidian vault 项目中启动 pi 时出现意外的 Obsidian 应用窗口。

具体问题：
1. **无条件 preload**：`session_start` 事件不判断当前目录是否为 Obsidian vault，直接调用 CLI
2. **副作用不可控**：`obsidian vaults verbose` 命令在 Obsidian 未运行时会启动整个应用
3. **资源浪费**：即使在完全不需要 Obsidian 搜索功能的 session 中也会触发 CLI 调用

## 范围边界

**In scope：**
- 修改 `vault-resolver.ts` 的 preload 策略：从 eager 改为 lazy + 条件触发
- 修改 `index.ts` 的 `session_start` 事件处理逻辑
- 确保 `obsidian_search` 和 `obsidian_cli` 工具在首次调用时仍能正确加载 vault 信息
- 静默降级：CLI 不可用时工具仍可工作（基于 `.obsidian/` 目录检测）

**Out of scope：**
- 不修改 `cli-runner.ts` 的 CLI 执行逻辑
- 不修改 `search-tool.ts` 或 `raw-tool.ts` 的工具定义
- 不修改 `obsidian-search` skill 的触发条件或行为

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `obsidian-tools-lazy-preload`: 将 vault preload 从 session_start 无条件执行改为「当前目录在 Obsidian vault 内时条件触发」+「非 vault 环境下首次工具调用时 lazy 加载」双重策略

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **低风险**：仅修改 preload 触发时机，不改变工具功能和 vault 解析逻辑
- **向后兼容**：对已经在 Obsidian vault 内工作的用户行为无变化
- **新增防御**：非 vault 项目不再触发 Obsidian CLI，消除意外启动应用的副作用

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 无外部标准页引用
  - 项目页：`.pi/extensions/obsidian-tools/`
  - 无外部回写目标
