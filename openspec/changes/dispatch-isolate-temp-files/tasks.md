# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 已确认 capability `pi-subagent-dispatch-baseline` 的 spec delta：移除 executor 级别 `cwd: PROJECT_ROOT`，task cwd 预解析为绝对路径
- [x] 1.2 无外部依赖项；修改范围限于 `.pi/packages/subagent-dispatch/index.ts`

## 2. 核心实现任务

- [x] 2.1 **移除 executor 级别 `cwd: PROJECT_ROOT`**
  - 文件: `.pi/packages/subagent-dispatch/index.ts:290`
  - 操作: 从 `executor.execute()` 的参数对象中删除 `cwd: PROJECT_ROOT` 行
  - 验证: executor 不再显式传递仓库路径，回退到 `ctx.cwd`

- [x] 2.2 **Task cwd 预解析为绝对路径**
  - 文件: `.pi/packages/subagent-dispatch/index.ts:280`
  - 操作: 在构造 task 时，将 `plan.cwd` 通过 `path.resolve(PROJECT_ROOT, plan.cwd)` 预解析为绝对路径；若 `plan.cwd` 为 falsy（undefined/null），退化为 `PROJECT_ROOT`
  - 验证: 所有 dispatch task 的 `cwd` 字段在被 `resolveChildCwd` 解析前即为绝对路径，不依赖 executor 级别 cwd

## 3. 收敛与验证准备

- [x] 3.1 verification 检查点：
  - 检查 `/dispatch` 正常执行后仓库根目录无 `progress.md` 残留
  - 检查 dispatch task 仍能在仓库根目录正常读写文件
  - 检查同时跑多个 task 时各自的 cwd 正确

- [x] 3.2 writeback 摘要：
  - 修改文件: `.pi/packages/subagent-dispatch/index.ts`
  - 变更类型: 维护性修复
  - 影响范围: dispatch executor 调用参数，不涉及行为语义变化

## 4. 验证与回写收敛

- [x] 4.1 基于实际实现结果生成或更新 verification.md
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md
- [x] 4.3 执行 writeback.md 中定义的回写目标
