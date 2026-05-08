# Design

## Context

`obsidian-tools` extension 当前在 `session_start` 事件中无条件执行 `preloadKnownVaults()`，调用 `obsidian vaults verbose` CLI 命令。当 Obsidian 应用未运行时，此命令会触发应用启动并打开 vault 窗口，造成非 vault 项目中的副作用。

涉及文件：
- `vault-resolver.ts`：`preloadKnownVaults()` 和 `isInsideVault()` 检测逻辑
- `index.ts`：`session_start` 事件注册
- `search-tool.ts` / `raw-tool.ts`：工具入口，需集成 lazy preload

## Goals / Non-Goals

**Goals:**
- 消除非 vault 项目中 pi 启动时意外打开 Obsidian 应用的副作用
- 在 Obsidian vault 项目中保持原有行为不变（session_start 时即 preload）
- 非首次工具调用时自动 lazy 加载 vault 列表，用户无需额外操作

**Non-Goals:**
- 不修改 CLI 执行层（`cli-runner.ts`）
- 不修改工具参数 schema 或工具定义
- 不修改 `obsidian-search` skill 的行为规范

## Decisions

### D1: vault 检测函数 `isInsideVault(cwd)`

在 `vault-resolver.ts` 中新增 `isInsideVault(cwd: string): boolean` 函数，复用 `resolveVaultFromCwd` 中已有的 `.obsidian/` walk-up 逻辑。检测仅使用文件系统 `accessSync`，不调用任何 CLI。

```typescript
export function isInsideVault(cwd: string): boolean {
  let current = resolve(cwd);
  const root = parsePath(current).root;
  while (true) {
    try {
      accessSync(resolve(current, ".obsidian"), constants.R_OK);
      return true;
    } catch { /* no .obsidian here */ }
    if (current === root) break;
    current = resolve(current, "..");
  }
  return false;
}
```

### D2: session_start 条件化

`index.ts` 的 `session_start` handler 改为：

```typescript
pi.on("session_start", async () => {
  if (isInsideVault(process.cwd())) {
    await preloadKnownVaults();
  }
});
```

仅在 CWD 位于 vault 内时触发 preload。非 vault 项目完全不调用 CLI。

### D3: 工具入口 lazy preload

在 `vault-resolver.ts` 中新增 `ensurePreloaded()` 供工具入口调用：

```typescript
export async function ensurePreloaded(): Promise<void> {
  if (!_preloaded) {
    await preloadKnownVaults();
  }
}
```

`search-tool.ts` 和 `raw-tool.ts` 的工具 handler 在执行 CLI 命令前调用 `await ensurePreloaded()`。由于 `preloadKnownVaults` 内部有 `_preloaded` 守卫，多工具并发调用也安全（幂等）。

### D4: 不引入锁机制

`ensurePreloaded()` 多次并发调用时，`preloadKnownVaults()` 内部的 `if (_preloaded) return` 确保只有一个调用实际执行 CLI。由于 JS 单线程特性，第一次调用会设置 `_preloaded = true`（在函数入口处），后续调用直接跳过。不引入额外的 Promise 缓存或互斥锁。

## Risks / Migration

- **Risk: 竞态** — 并发工具调用可能同时进入 `preloadKnownVaults`。缓解：JS 事件循环单线程 + `_preloaded` 守卫在同一 tick 内设置，实际竞态窗口极小。若未来需要严格串行化，可引入 Promise 缓存。
- **Migration: 零成本** — 纯代码变更，无配置迁移、无用户操作变化。已安装在 vault 内的用户行为不变。
