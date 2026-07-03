# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/global-agent-guidance/spec.md` 覆盖范围：AGENTS.md「Edit Tool」节回退 + fff 编辑工作流表恢复 + snap-edit 指导 REMOVED
- [x] 1.2 确认 `specs/capability-manifest/spec.md` 覆盖范围：manifest packages 移除 + node_modules 清理 requirement
- [x] 1.3 确认依赖前置：已拿到 `8c6cd90^` 基线版本作为 AGENTS.md 恢复来源

## 2. 核心实现任务

### 2.1 manifest 移除（capability-manifest）

- [x] 2.1.1 从 `.pi/capabilities.yaml` 的 `global.settings.packages`（L64）删除 `- npm:pi-snap-edit`
- [x] 2.1.2 验证：`grep -n "snap-edit" .pi/capabilities.yaml` 无残留

### 2.2 AGENTS.md 编辑指导回退（global-agent-guidance）

- [x] 2.2.1 将 `.pi/agent/AGENTS.md` L16–47「编辑工具（quick_edit / target_edit）」整节替换为原生 `### Edit Tool` 节（三项自检硬约束：path 顶层字段 / ≤200 字符 / ≤4 条 edits）
- [x] 2.2.2 将 L112 fff 引言句「代码编辑使用 snap-edit 工具或兜底 bash+sed」改为「代码编辑回退到基础工具」
- [x] 2.2.3 将 L114–124 编辑工作流表恢复为原生 4 行映射（edit tool / bash+sed / 跨文件重命名 / 批量 checkbox）
- [x] 2.2.4 验证：`grep -n "snap-edit\|quick_edit\|target_edit" .pi/agent/AGENTS.md` 无残留

### 2.3 CONTEXT.md 能力段清理

- [x] 2.3.1 删除 `CONTEXT.md` L68–72「行号编辑」能力段（含 fff 段后的 pi-snap-edit 描述）
- [x] 2.3.2 验证：`grep -n "snap-edit\|quick_edit\|target_edit" CONTEXT.md` 无残留

### 2.4 ADR 0010

- [x] 2.4.1 新建 `docs/adr/0010-revert-snap-edit.md`，撤销 ADR 0009 结论，引用 `docs/plans/snap-edit-tool-issues-report.md` 作为证据，保留 ADR 0009 不删

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 证据点：manifest grep、AGENTS.md grep、CONTEXT.md grep、ADR 0010 存在性、settings.json 同步后无 snap-edit、node_modules 清理、新 session 工具列表
- [x] 3.2 标记 writeback 摘要：本次为仓库内全局配置变更，无外部回写目标；需记录 sync 是否运行 + node_modules 是否清理

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 verification.md（覆盖 spec-to-implementation 映射与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写（本 change 无外部回写目标，记录 sync 执行状态 + node_modules 清理结果即可）
