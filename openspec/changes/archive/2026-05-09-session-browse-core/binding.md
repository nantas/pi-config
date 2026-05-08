# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.md`
- `project_page_ref`: `openspec/` (pi-config repository OpenSpec workspace, tracked via git)
- `additional_context_refs`:
  - `docs/plans/session-browse-extension-design.md` — 总体设计方案文档

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/capabilities.yaml` — 将 `session-browse` 注册到 `global.extensions`（Change 1 部署后）
- `writeback_owner`: pi-config maintenance
- `writeback_timing`: Change 1 全部实现并通过验证后，Phase F 部署阶段执行

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用 — 使用 OrbitOS Spec Standard v0.3
- [x] 已确认项目页引用 — pi-config 仓库内的 OpenSpec workspace
- [x] 已确认回写目标与权限 — `.pi/capabilities.yaml` 在仓库内，有 git 权限
- [ ] 已确认异常处理与冲突策略 — 如果 capabilities.yaml 已有 session-browse 条目需去重（预计不存在冲突）
