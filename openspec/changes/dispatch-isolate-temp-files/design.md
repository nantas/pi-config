# Design

## Context

当前 `delegateDispatch` 中 `executor.execute()` 被调用时传入 `cwd: PROJECT_ROOT`（行 290）。Executor 将 `cwd` 用作 `effectiveCwd`，并在 `runParallelPath` 中将 `writeInitialProgressFile(effectiveCwd)` 写入仓库根目录。

同时，每个 task 的 `cwd` 字段来自 `serializeTaskPlan`（`core.js:230`）：
```typescript
cwd: task.cwd ?? agentDefinition.cwd,
```

agent 定义中 `cwd: .`（相对路径），因此在 executor 中经 `resolveChildCwd(effectiveCwd, ".")` 解析后等效于 `effectiveCwd`，即 `PROJECT_ROOT`。

## Goals / Non-Goals

**Goals:**
- Dispatch executor 不再显式传入 `cwd: PROJECT_ROOT`，避免强制将调度层 cwd 指向仓库根
- 每个 task 的 `cwd` 解析为绝对路径，保持子 agent 在仓库根目录执行的能力
- 执行 `/dispatch` 后仓库根目录不残留临时文件

**Non-Goals:**
- 不修改 `pi-subagents` 库代码
- 不改变 `/dispatch` 的行为语义或 API contract
- 不涉及 async dispatch（v1 baseline 已 deferred）

## Decisions

### Decision 1: 移除 executor 级别的 `cwd: PROJECT_ROOT`

**文件**: `index.ts:290`

移除 `cwd: PROJECT_ROOT` 参数，让 executor 使用默认的 `ctx.cwd`（session runtime cwd）。

**为什么可行**: 对于 dispatch 用例，`ctx.cwd` 和 `PROJECT_ROOT` 在正常情况下指向同一个仓库根目录，行为不变。但这消除了 dispatch 层对 executor cwd 的显式强制，使得 executor 的 fallback 行为一致。

### Decision 2: Task cwd 预解析为绝对路径

**文件**: `index.ts:280`

每个 task 的 `cwd: plan.cwd` 保持不变，但将 plan.cwd 预解析为绝对路径后再传入 task：

```typescript
cwd: plan.cwd ? path.resolve(PROJECT_ROOT, plan.cwd) : PROJECT_ROOT,
```

**为什么**: agent 定义中 `cwd: .` 是相对路径，依赖 executor 的 `effectiveCwd` 来解析。将 task cwd 预解析为绝对路径后，即使 executor cwd 被改变，每个 task 的 cwd 仍然正确。

### Decision 3: 不直接修改 `pi-subagents` 的 `writeInitialProgressFile` 行为

`pi-subagents` 的 `writeInitialProgressFile` 使用 `effectiveCwd` 作为目标目录。在不修改 pi-subagents 的前提下，通过 Decisions 1+2 的组合来减少对仓库根的污染。

**后续防线**: 如果将来需要更严格的隔离，应在 pi-subagents 层将 `progress.md` 等临时文件写入 `sessionRoot` 而非 `effectiveCwd`。

## Risks / Migration

| 风险 | 影响 | 缓解 |
|------|------|------|
| `ctx.cwd` 不是仓库根 | dispatch task 的默认 cwd 可能非预期 | task cwd 已显式预解析为 `PROJECT_ROOT`，与 ctx.cwd 解耦 |
| 某些 dispatch 场景依赖 executor 级 cwd | 行为变化 | 当前无此类依赖，所有路径经 `serializeTaskPlan` 后携带独立 cwd |
| 回滚 | 双向兼容 | 只需还原 index.ts 中 `cwd: PROJECT_ROOT` 一行即可回滚 |
