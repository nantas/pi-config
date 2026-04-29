# Proposal

## 问题定义

`planner-toggle.ts` 扩展同时存在于 `.pi/extensions/`（项目本地）和 `~/.pi/agent/extensions/`（全局同步）时，Pi 会同时加载两副本，均注册 `Ctrl+Alt+P` 快捷键，导致启动时出现冲突警告：

```
Extension shortcut conflict: 'ctrl+alt+p' registered by both
/Users/nantas-agent/projects/pi-config/.pi/extensions/planner-toggle.ts and
/Users/nantas-agent/.pi/agent/extensions/planner-toggle.ts
```

两种存在都有合理用途：项目本地用于开发迭代，全局同步用于其他项目加载该扩展。不能通过"不同步到全局"解决，因为其他项目依赖此扩展。需要一种运行时去重机制：当同一扩展被加载两次时，只有第一次生效。

## 范围边界

**In scope:**
- 在 `planner-toggle.ts` 中添加 `globalThis` 标记去重，后加载的副本静默退出
- 撤回之前错误地将 `planner-toggle.ts` 排除在全局同步之外的提交

**Out of scope:**
- Pi 核心层的扩展加载去重
- 其他扩展的去重处理
- 通用去重库或工具函数

## Capabilities

### New Capabilities
- `extension-self-dedup`: 为 `planner-toggle.ts` 添加运行时自去重机制。当 extension 被从多个加载路径同时加载时，通过 `globalThis` 标记确保只有首次加载的副本注册快捷键、命令和事件处理器。后加载的副本静默退出，消除冲突警告。

### Modified Capabilities

（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（已在前面对话中确认需用 globalThis 方案）

## Impact

- **修改文件**: `.pi/extensions/planner-toggle.ts` — 在 export default 函数入口增加 globalThis 去重标记检查
- **撤回**: 之前的提交 `a0ed55e` (fix: exclude planner-toggle.ts from global extension sync)
- **无新增文件**

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页: `repo://orbitos`
  - 项目页: `openspec/pkg-backlog.md`
  - 回写目标: `repo://pi-config` → `openspec/pkg-backlog.md`
