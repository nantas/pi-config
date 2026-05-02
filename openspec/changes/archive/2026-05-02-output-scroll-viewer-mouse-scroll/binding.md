# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-mono/packages/coding-agent/docs/extensions.md` (ExtensionAPI Custom UI 接口参考)、`repo://pi-mono/packages/tui/src/tui.ts` (TUI Component & Overlay API)、`repo://pi-mono/packages/tui/src/stdin-buffer.ts` (SGR 鼠标序列识别)
- `project_page_ref`: 本仓 `openspec/` 为主工作区
- `additional_context_refs`: `.pi/extensions/output-scroll-viewer.ts` (现有扩展实现)、`openspec/specs/output-scroll-viewer/spec.md` (现有 spec)

## Source of Truth

- 行为规范真源：`specs/output-scroll-viewer-mouse-scroll/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 本仓 `openspec/` 工作区，无外部项目页面需要回写
- `writeback_owner`: n/a
- `writeback_timing`: n/a

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 无外部标准页引用需要确认
- [x] 无外部项目页需要回写
- [x] 无已知权限限制
