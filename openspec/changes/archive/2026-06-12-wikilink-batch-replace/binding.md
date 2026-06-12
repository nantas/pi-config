# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无外部标准页（本 change 是新增能力，不修改现有 spec）
- `project_page_ref`: `CONTEXT.md`
- `additional_context_refs`:
  - `docs/plans/pi-customization-reference.md` Section 3（Extension System 基线知识）
  - `repo://pi-mono/packages/coding-agent/docs/extensions.md`（ExtensionAPI 详细参考）
  - `/Users/nantasmac/projects/my-wiki/docs/design/wikilink-tool-problem-report.md`（问题报告与设计背景）

## Source of Truth

- 行为规范真源：`specs/wikilink-batch-replace/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `CONTEXT.md`（OpenSpec 索引新增条目）
- `writeback_owner`: agent
- `writeback_timing`: archive 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 不涉及跨仓库回写

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
