# Proposal

## 问题定义

Pi extension 在实现 `globalThis` self-deduplication 模式时，使用类似以下代码防止同一 extension 被 project-local (`.pi/extensions/`) 和 global (`~/.pi/agent/extensions/`) 两个路径双重加载：

```typescript
const _key = "__pi_ext_<name>_loaded";
if ((globalThis as any)[_key]) return;
(globalThis as any)[_key] = true;
```

该模式的问题是：`globalThis` 标志位跨 session 生命周期持久存在。当 pi 执行 session 替换操作（`/new`、`/reload`、`/resume`）时，会触发 `loadExtensions` 重新加载 extension 模块（jiti 配置了 `moduleCache: false`），但 `globalThis` 上的标志位并未清除，导致 extension factory function 在执行时命中 dedup 检查而提前 `return`，所有 handler、shortcut、command、autocomplete provider 均不会重新注册。

**影响范围**：session 替换后 extension 功能全部失效（快捷键、slash command、event handler、autocomplete 等）。只能通过完全退出并重启 pi 恢复。

## 范围边界

- **In scope**: 建立 extension 在 `session_shutdown` 事件中清除自身 `globalThis` 去重标志位的最佳实践规范
- **In scope**: 更新 `pi-extension-dev` skill 的 dedup 章节，强制要求同时注册 `session_shutdown` 清理逻辑
- **In scope**: 更新现有受影响的 extension（dollar-skill-invoke、planner-toggle）
- **Out of scope**: 修改 pi-mono 核心代码（ExtensionRunner、ResourceLoader、jiti 加载逻辑）
- **Out of scope**: 修改其他使用 `globalThis` dedup 但未受影响的项目（如 npm packages）

## Capabilities

### Modified Capabilities

- `extension-globalthis-dedup-session-shutdown`: 修改 pi-extension-dev skill 中关于 `globalThis` self-deduplication 的规范，要求 extension 必须在 `session_shutdown` 事件中清除自身标志位，确保 session 替换（/new、/reload、/resume）后能重新注册所有 handler

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **`.pi/skills/pi-extension-dev/SKILL.md`**: 更新 Dedup Requirement 章节，添加 `session_shutdown` 清理要求的代码示例和说明
- **`docs/reference/pi-extension-session-shutdown-dedup.md`**: 新建参考文档，详细说明 `globalThis` dedup + `session_shutdown` 清理模式的技术原理、时序图和最佳实践
- **`.pi/extensions/dollar-skill-invoke.ts`**: 已更新，添加 `session_shutdown` handler
- **`.pi/extensions/planner-toggle.ts`**: 已更新，添加 `session_shutdown` handler

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页: repo://orbitos
  - 项目页: docs/reference/pi-extension-session-shutdown-dedup.md (新建)
  - 回写目标: docs/reference/pi-extension-session-shutdown-dedup.md, .pi/skills/pi-extension-dev/SKILL.md
