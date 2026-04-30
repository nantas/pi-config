# Pi Extension globalThis Dedup + session_shutdown Cleanup

## 问题背景

Pi extension 可能同时被 project-local (`.pi/extensions/`) 和 global (`~/.pi/agent/extensions/`) 两个路径加载。如果不做去重处理，extension 的 handler、shortcut、command 会被注册两次，导致：
- "shortcut conflict" warnings
- 重复的 autocomplete 条目
- 不可预测的行为

## globalThis Self-Deduplication 模式

Pi extension 的标准去重方案是使用 `globalThis` 标志位：

```typescript
export default function (pi: ExtensionAPI) {
  const _key = "__pi_ext_<name>_loaded";
  if ((globalThis as any)[_key]) return;  // 已注册，跳过
  (globalThis as any)[_key] = true;

  // ... 注册 handlers, shortcuts, commands ...
}
```

**工作原理**：同一 load cycle 中，第一个路径加载时标志位未设置，factory 正常执行并设置标志位；第二个路径加载时发现标志位已设置，提前 return。

## 为什么 session 替换后失效

Pi 在 session 替换（`/new`、`/reload`、`/resume`）时通过 `loadExtensions` 重新加载 extension 模块。jiti 配置了 `moduleCache: false`，每次加载都会重新执行模块代码。但 `globalThis` 标志位跨 session 生命周期持久存在，导致 factory function 在二次加载时命中 dedup 检查而提前 return，**所有 handler、shortcut、command 均不会重新注册**。

### 失效时序

```
1. 初始加载:  factory执行 → flag=false → 注册handlers → flag=true
2. /new 触发:  session_shutdown 发出
3. 新session:  loadExtensions → factory执行 → flag=true → return(跳过!) ← 问题
```

## 解决方案：session_shutdown 清理

在 extension 中注册 `session_shutdown` handler，在该事件中清除 `globalThis` 标志位：

```typescript
export default function (pi: ExtensionAPI) {
  const _key = "__pi_ext_<name>_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  // ★ 关键：session 结束时清除标志位，允许下次加载时重新注册
  pi.on("session_shutdown", () => {
    delete (globalThis as any)[_key];
  });

  // ... 注册 handlers, shortcuts, commands ...
}
```

### 修复后时序

```
1. 初始加载:    factory执行 → flag=false → 注册handlers + session_shutdown handler → flag=true
2. /new 触发:   session_shutdown handler执行 → delete flag
3. 新session:   loadExtensions → factory执行 → flag=false → 注册handlers ✓
```

### 为什么不会导致双重注册

`session_shutdown` 清理的是上一次 session 的标志位。在同一 load cycle 中，第一个路径加载后会立即重新设置标志位：

```
loadExtensions 开始
  paths = [global/ext.ts, local/ext.ts]
  
  ── global/ext.ts ──
  factory执行 → flag=false → 注册 → flag=true + session_shutdown handler
  
  ── local/ext.ts ──
  factory执行 → flag=true → return (dedup 仍有效)
loadExtensions 结束
```

## 影响的事件路径

`session_shutdown` 在所有 session 替换路径中均会触发：

| 操作 | session_shutdown reason | 说明 |
|------|------------------------|------|
| `/new` | `"new"` | 创建全新 session |
| `/reload` | `"reload"` | 热重载 extensions/skills/themes |
| `/resume` | `"resume"` | 切换到已有 session |
| `/fork` | `"fork"` | 从消息分支创建新 session |

## 边界条件

- **第三方 extension** 如果使用 `globalThis` dedup 但未注册 `session_shutdown`，session 替换后功能会静默失效（pi 不会崩溃或报错）
- **extension 不应在 `session_shutdown` 之外清除标志位**，否则可能在当前 load cycle 中导致双重注册
- **标志位 key 必须全局唯一**，建议使用 `__pi_ext_<extension-name>_loaded` 命名约定

## 参考

- pi-extension-dev skill: `.pi/skills/pi-extension-dev/SKILL.md`
- Extension lifecycle events: `repo://pi-mono/packages/coding-agent/docs/extensions.md`
- ExtensionRunner source: `repo://pi-mono/packages/coding-agent/src/core/extensions/runner.ts`
- Extension loader source: `repo://pi-mono/packages/coding-agent/src/core/extensions/loader.ts`
