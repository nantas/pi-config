# Proposal

## 问题定义

执行 `/dispatch` 命令时，dispatch executor 被调用时传入 `cwd: PROJECT_ROOT`（仓库根目录），导致以下两个问题：

1. **`progress.md` 写入仓库根目录** — `runParallelPath` 中 `writeInitialProgressFile(effectiveCwd)` 将 `progress.md` 写入 `PROJECT_ROOT`，而非临时目录。
2. **子 agent Pi 进程以仓库根为 cwd** — 可能产生其他临时文件（session context 等），污染仓库工作区。

这些文件是临时性的运行产物，不应被版本管理或放置在仓库根目录下。

## 范围边界

### In Scope

- 修改 `subagent-dispatch/index.ts` 中 `delegateDispatch` 函数，移除对 executor 的 `cwd: PROJECT_ROOT` 传递
- 确保 dispatch 的 task 如需仓库上下文仍可通过 `task.cwd` 单独指定
- 不修改 `pi-subagents` 库代码（仅 dispatch 层改动）

### Out of Scope

- 不修改 `pi-subagents` 底层库的行为
- 不涉及 `chain` 模式（dispatch 走的是 `tasks`/parallel 模式）
- 不涉及 async dispatch（当前 v1 baseline 明确 deferred）

## Capabilities

### New Capabilities

- 不适用（本次为维护性修复，不引入新能力）

### Modified Capabilities

- `pi-subagent-dispatch-baseline`: 修复 dispatch executor 调用参数，使 `cwd` 不强制指向仓库根目录；临时文件（`progress.md` 等）不再写入仓库根

## Capabilities 待确认项

- [x] 已确认本次不涉及新增或修改 capability spec，无需生成 `specs/` delta

## Impact

| 项目 | 影响 |
|------|------|
| 兼容性 | 无破坏性变更。task 的 `cwd` 字段仍可显式指定仓库路径 |
| 行为变化 | `/dispatch` 不再在仓库根生成 `progress.md` 等临时文件 |
| 测试 | 需验证 `/dispatch` 仍能正常执行子 agent 任务，且仓库根目录无残余文件 |

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 自包含 change，不涉及外部标准页或项目页
  - 修改目标：`.pi/packages/subagent-dispatch/index.ts`
