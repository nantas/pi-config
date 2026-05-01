# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-mono/packages/coding-agent/docs/extensions.md` (ExtensionAPI 事件与 Custom UI 接口参考、`repo://pi-mono/packages/tui/src/tui.ts` (TUI Component & Overlay API)
- `project_page_ref`: 暂无独立项目页面，本仓 `openspec/` 为主工作区
- `additional_context_refs`: `repo://pi-mono/packages/coding-agent/examples/extensions/overlay-qa-tests.ts` (ScrollableOverlay 参考实现)、`repo://pi-mono/packages/coding-agent/src/core/extensions/types.ts` (ExtensionUIContext 类型定义)

## Source of Truth

- 行为规范真源：`specs/output-scroll-viewer/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部项目页面需要回写（本仓仅 `openspec/` 工作区）
- `writeback_owner`: n/a
- `writeback_timing`: n/a

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 无外部标准页引用需要确认（pi-mono 为源码参考，非外部标准）
- [x] 无外部项目页需要回写
- [x] 无已知权限限制
