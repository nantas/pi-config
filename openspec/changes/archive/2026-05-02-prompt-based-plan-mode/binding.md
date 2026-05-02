# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: OrbitOS Spec Standard (repo://orbitos)
- `project_page_ref`: 无（本次 change 为 pi-config 内部扩展改造，不涉及外部项目页面回写）
- `additional_context_refs`:
  - repo://codex（参考 Codex plan mode 实现原理）
  - pi 官方 plan-mode extension（`examples/extensions/plan-mode/`）
  - 当前 `planner-toggle.ts`（`.pi/extensions/planner-toggle.ts`）

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：本项目不涉及项目页面治理展示，不承担回写义务
- 非真源说明：本 change 无外部项目页面回写；变更仅影响本地 `.pi/extensions/planner-toggle.ts` 和 `docs/reference/` 文档

## 回写目标

- `writeback_targets`: 无外部项目页面回写目标
- `writeback_owner`: n/a
- `writeback_timing`: n/a

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用 — repo://orbitos 的 OrbitOS Spec Standard
- [x] 已确认项目页引用 — 本项目无外部项目页
- [x] 已确认回写目标与权限 — 无外部回写目标
- [x] 已确认异常处理与冲突策略 — 本次 change 无跨仓冲突风险
