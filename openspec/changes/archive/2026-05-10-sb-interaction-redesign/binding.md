# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/changes/session-browse-ui/specs/session-browse-command/spec.md` (原有规范，本次 change 修改其行为)
- `project_page_ref`: 无独立项目页面（本 change 限定在 extension 代码范围内）
- `additional_context_refs`:
  - `openspec/changes/session-browse-ui/` — 原始 change 工件作为参考基线
  - `.pi/extensions/session-browse/` — 实现代码位置

## Source of Truth

- 行为规范真源：`specs/session-browse-command/spec.md`（本次 change 更新）+ `specs/session-hit-browser/spec.md`（新增）
- 项目页面角色：无独立项目页面；OpenSpec 工件为唯一治理与验证依据
- 非真源说明：`openspec/changes/session-browse-ui/` 下的历史工件仅供参考，不作为本次 change 的实现与验证依据

## 回写目标

- `writeback_targets`: 无（本 change 不涉及外部项目页面回写）
- `writeback_owner`: N/A
- `writeback_timing`: N/A

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用（参考 session-browse-ui 原有 spec）
- [x] 已确认项目页引用（无独立项目页面）
- [x] 已确认回写目标与权限（无外部回写）
- [x] 已确认异常处理与冲突策略（本 change 直接替换 browser.ts 交互逻辑，不影响 LLM tools）
