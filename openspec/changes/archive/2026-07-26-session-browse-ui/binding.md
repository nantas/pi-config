# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.md`
- `project_page_ref`: `openspec/` (pi-config repository OpenSpec workspace)
- `additional_context_refs`:
  - `docs/plans/session-browse-extension-design.md` — 总体设计方案文档（含 Change 2 更新）
  - `openspec/changes/session-browse-core/` — Change 1 的 artifacts（specs/design/tasks）

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/capabilities.yaml` — Change 1 已在 `global.extensions` 注册 `session-browse`，Change 2 无需新增（增量代码在已有目录中）
- `writeback_owner`: pi-config maintenance
- `writeback_timing`: Change 2 全部通过验证后

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
