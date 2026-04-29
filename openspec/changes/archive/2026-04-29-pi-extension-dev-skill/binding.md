# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`, `docs/plans/pi-customization-reference.md`, `docs/plans/pi-customization-blueprint.md`

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: `pi-config` change owner in current repo
- `writeback_timing`: after verification is complete and the change is ready for archival or summary sync

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 蓝图 `docs/plans/pi-customization-blueprint.md` 作为规划基线参考输入，不替代 change artifacts 的约束效力
- Phase 3 蓝图段落为本次 change 的范围锚点，但具体实现以本 change 的 specs 为准

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：发生冲突时以 `specs/` 为准，项目页面仅回写摘要
