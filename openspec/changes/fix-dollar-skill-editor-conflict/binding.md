# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`, `docs/plans/pi-customization-reference.md`, `docs/pi-change-closeout-governance.md`, `docs/reference/pi-extension-autocomplete-internals.md`, `repo://pi-mono/packages/coding-agent/docs/extensions.md`, `docs/reference/pi-extension-editor-conflict.md`

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: `pi-config` change owner in current repo
- `writeback_timing`: after verification is complete and the conflict fix has been deployed, verified, and archived

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `repo://pi-mono` 是 Pi TUI autocomplete 机制、input pipeline、extension API 的查询真源，但本次 change 的执行真源仍是当前仓库的 change artifacts
- `docs/reference/pi-extension-editor-conflict.md` 记录本次调研中发现的 `setEditorComponent` 独占覆盖问题及其约束模式，作为后续 extension 开发的参考指南

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：spec 与项目页面冲突时以 `specs/` 为准，回写仅同步摘要
