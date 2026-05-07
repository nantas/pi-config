# Design

## Context

Pi v0.73.0 的扩展加载链路：

```
AgentSessionRuntime.newSession()
  → teardownCurrent()  → emitSessionShutdownEvent()   // 旧 session 的 shutdown
  → createRuntime()     → ResourceLoader.reload()
    → loadExtensions()  → for each path: import() + call default export
```

相关源码位置：
- `interactive-mode.js:2030` — `/new` command handler
- `agent-session-runtime.js:101-138` — `teardownCurrent()` + `newSession()`
- `extensions/loader.js:325-360` — `loadExtensions()` (顺序加载，异常 continue)
- `resource-loader.js:496-515` — `mergePaths()` (按 canonicalPath 去重)

pi-config 仓库中 7 个扩展使用 `globalThis.__pi_ext_*_loaded` 布尔旗标做双重去重：
1. **跨路径去重**：项目副本先设旗标 → 全局副本跳过
2. **跨会话清理**：`session_shutdown` 中 `delete` 旗标

问题：`session_shutdown` 时序不可靠 → 旗标残留 → 两个副本都 skip → 0 handler 注册。

## Goals / Non-Goals

**Goals:**
- 消除跨会话状态污染：每个 `/new` 创建独立的去重域
- 保留跨路径去重：项目副本优先注册，全局副本跳过
- 不依赖 `session_shutdown` 的执行时序
- 与 `/reload` 兼容：重载后所有扩展正确重注册

**Non-Goals:**
- 不修改 Pi 运行时源码
- 不改变扩展的注册机制（仍用 `pi.registerCommand()`, `pi.on()` 等 API）
- 不改变扩展文件结构或目录布局（项目 `.pi/extensions/` + 全局 `~/.pi/agent/extensions/` 双目录架构不变）

## Decisions

### Decision 1: 会话计数器去重模式

每个扩展将去重模式从单一布尔旗标改为「会话计数器 + 会话绑定 key」：

```typescript
// BEFORE (broken):
const _key = "__pi_ext_xxx_loaded";
if ((globalThis as any)[_key]) return;
(globalThis as any)[_key] = true;
pi.on("session_shutdown", () => { delete (globalThis as any)[_key]; });

// AFTER (fixed):
const _key = "__pi_ext_xxx_loaded";
const SESSION_COUNTER = "__pi_ext_session_counter";

const sessionId = (globalThis as any)[SESSION_COUNTER] ?? 0;
const sessionKey = `${_key}_session_${sessionId}`;

if ((globalThis as any)[sessionKey]) return;
(globalThis as any)[sessionKey] = true;

pi.on("session_shutdown", () => {
    (globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
});
```

**为什么用计数器而非 delete：**
- `delete` 式清理依赖 shutdown 的准确执行，而这就是根因
- 计数器只需「累加」，即使 shutdown 不触发，也不影响新 session（新 session 用新 key）
- 如果 shutdown 触发多次（极端情况），计数器累加多次也不影响正确性

### Decision 2: 统一共享 SESSION_COUNTER

所有扩展共享 `globalThis.__pi_ext_session_counter` 全局计数器。每个扩展使用自己的 `_key` 前缀。

优点：
- 所有扩展的会话 ID 保持一致
- `session_shutdown` 只需一次累加就为所有扩展准备好新会话 ID
- 无需为每个扩展单独管理会话状态

### Decision 3: 不修改 session_shutdown 清理行为

`session_shutdown` handler 仍保留（从 delete flag 改为 increment counter），作为最佳路径的常规清理。即使 shutdown 不触发，计数器方案本身也容错。

### Decision 4: 每个扩展独立修改，模式统一

7 个扩展文件都使用完全相同的模式模板，差异仅在于 `_key` 常量名。这种统一性降低了维护成本。

## Risks / Migration

**风险：计数器溢出**
32 位整数在极端频繁的 `/new` + shutdown 下可能溢出。实际上 Session 生命周期远小于此上限，可忽略。

**迁移风险：正在运行的 session**
如果用户在旧 session 中执行 `/reload`，当前去重 key 仍是旧会话 ID。但 `/reload` 不创建新 session，不触发 shutdown → 计数器不增 → 旧 key 仍有效。**这是正确行为** — `/reload` 应该保留当前会话的去重状态。

**全局同步**
修改部署后必须运行 `scripts/sync-pi-agent.sh`，确保 `~/.pi/agent/extensions/` 中的副本也使用新模式。如果全局副本未同步，在其他仓库中仍使用旧模式，但旧模式在「单副本」场景（没有项目副本）下也能正常工作（不触发双路径去重问题）。
