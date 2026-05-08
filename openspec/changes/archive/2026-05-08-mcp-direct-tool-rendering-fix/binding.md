# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 本 change 为 fork 内缺陷修复 + 知识沉淀，不涉及新 capability spec
- `project_page_ref`: `repo://pi-config`
- `additional_context_refs`: `docs/plans/pi-tool-display-mcp-direct-tools-bug-analysis.md`, `openspec/changes/archive/2026-05-07-pi-tool-display-direct-tools-fold`, `forks/manifest.yaml`

## Source of Truth

- 行为规范真源：`specs/` — 本次变更不涉及新的 capability，无需新增 spec
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `forks/manifest.yaml`, `openspec/pkg-backlog.md`, `docs/reference/pi-tool-api-dependency.md`
- `writeback_owner`: pi-config change owner
- `writeback_timing`: after verification is complete and changes are committed to fork

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本次变更不涉及 `.pi/settings.json` 或 `capabilities.yaml` 修改，无需全局 sync

## 待确认项

- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
