# Writeback

## Change: dispatch-isolate-temp-files

---

## 回写摘要

| 项目 | 内容 |
|------|------|
| **修改文件** | `.pi/packages/subagent-dispatch/index.ts` |
| **变更类型** | 维护性修复 |
| **影响范围** | dispatch executor 调用参数，不涉及行为语义变化 |

## 修改内容

1. **移除 executor 级别 `cwd: PROJECT_ROOT`**：不再向 executor 显式传递仓库根路径作为 `cwd`，executor 回退到 session runtime `ctx.cwd`
2. **Task cwd 预解析为绝对路径**：task 的 `cwd` 字段在构造时通过 `path.resolve(PROJECT_ROOT, plan.cwd)` 预解析为绝对路径，确保即使 executor cwd 改变，task 仍指向正确目录

## 回写目标

- [x] `.pi/packages/subagent-dispatch/index.ts` — 已修改

## 回写内容

### 文件: `.pi/packages/subagent-dispatch/index.ts`

**变更行**: 
- 行 ~280（task 构造）：`cwd: plan.cwd ? path.resolve(PROJECT_ROOT, plan.cwd) : PROJECT_ROOT,`
- 行 ~291（executor 参数）：移除 `cwd: PROJECT_ROOT,`

**设计决策**:
- 移除 executor 级别 cwd 使临时文件（`progress.md`）不再写入仓库根目录
- task cwd 预解析确保子 agent 仍能在仓库根目录正确执行
- 完整设计见 `openspec/changes/dispatch-isolate-temp-files/design.md`
