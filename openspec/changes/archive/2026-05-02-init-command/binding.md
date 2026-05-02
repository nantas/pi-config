# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-config/openspec/specs/pi-extension-lifecycle-guidance` — Pi 扩展开发生命周期治理标准
- `project_page_ref`: 无独立项目页面；进度通过 `openspec/changes/init-command/` 内部工件跟踪
- `additional_context_refs`:
  - `repo://pi-mono/packages/coding-agent/docs/extensions.md` — Pi ExtensionAPI 参考
  - `repo://opencode/packages/opencode/src/command/template/initialize.txt` — OpenCode /init 模板参考
  - `repo://pi-config/docs/plans/pi-customization-reference.md` — Pi 自定义参考文档

## Source of Truth

- 行为规范真源：`specs/init-command/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部回写目标；本 change 产出全部位于 `openspec/changes/init-command/` 内
- `writeback_owner`: N/A
- `writeback_timing`: N/A

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 无外部回写需求，不适用同步冲突约束

## 待确认项

- [x] 已确认标准页引用 — 引用 pi-extension-lifecycle-guidance 标准
- [x] 已确认项目页引用 — 无需独立项目页，change 自包含
- [x] 已确认回写目标与权限 — 无外部回写需要
- [x] 已确认异常处理与冲突策略 — N/A
