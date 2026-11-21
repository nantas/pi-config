# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-config/docs/agents/issue-tracker.md`
- `project_page_ref`: `repo://pi-config/CONTEXT.md`
- `additional_context_refs`:
  - `repo://pi-config/docs/pi-change-closeout-governance.md`
  - `repo://pi-config/.pi/skills/pi-extension-dev/SKILL.md`
  - `repo://pi-config/docs/reference/pi-extension-tool-registration.md`

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://pi-config/CONTEXT.md`（归档后由 `/opsx-archive` 追加新主 spec 索引）
- `writeback_owner`: Lead agent
- `writeback_timing`: 归档（archive）完成后

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 全局运行时同步（`scripts/sync-pi-agent.sh`）必须经用户显式确认后执行

## 待确认项

- [x] 已确认标准页引用（repo-local governance）
- [x] 已确认项目页引用（`CONTEXT.md`）
- [x] 已确认回写目标与权限（repo-local）
- [x] 已确认异常处理与冲突策略（以 `specs/` 为准）
