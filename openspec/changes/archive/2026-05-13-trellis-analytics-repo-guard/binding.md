# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 本 change 为独立修复，不涉及外部标准规范页面
- `project_page_ref`: `.pi/extensions/trellis-analytics.ts`（修改目标）
- `additional_context_refs`: `tests/trellis-analytics.test.ts`（测试文件）

## Source of Truth

- 行为规范真源：`specs/trellis-repo-guard/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部回写目标（本 change 为 pi-config 仓库内部修改）
- `writeback_owner`: nantasmac
- `writeback_timing`: 实现完成后同步

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 无未确认引用或权限限制

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用（trellis-analytics.ts）
- [x] 已确认回写目标与权限（无外部回写）
- [x] 已确认异常处理与冲突策略（哨兵检测，静默跳过）
