# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`, `repo://pi-mono/node_modules/@mariozechner/pi-coding-agent/docs/packages.md`, `repo://pi-mono/node_modules/@mariozechner/pi-coding-agent/docs/settings.md`

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: `pi-config` change owner in current repo
- `writeback_timing`: after verification confirms the pkg-research skill works end-to-end and backlog file is populated correctly

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- pi-mono docs 为 pi packages 行为的参考真源，skill 实现必须对齐 `packages.md` 与 `settings.md` 的接口约定

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：pi-mono 文档与本 repo specs 冲突时以 pi-mono docs 为接口真源，行为流程以本 repo specs 为流程真源
