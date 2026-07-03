# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无（本变更为全局配置与 agent 指导回退，无外部标准页依赖）
- `project_page_ref`: `.pi/capabilities.yaml`（能力清单）、`.pi/agent/AGENTS.md`（全局 agent 指导）、`CONTEXT.md`（仓库上下文）
- `additional_context_refs`: `docs/adr/0009-prefer-snap-edit-over-builtin-edit.md`（撤销对象）、`docs/plans/snap-edit-tool-issues-report.md`（问题证据）

## Source of Truth

- 行为规范真源：`specs/agent-edit-tool-guidance/spec.md`、`specs/capability-manifest/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部回写目标（所有变更均在 pi-config 仓库内完成）
- `writeback_owner`: 本仓库
- `writeback_timing`: 实现完成后同步一次；需运行 `scripts/sync-pi-agent.sh` 将变更推送到 `~/.pi/agent/`

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- sync 脚本只重写 `~/.pi/agent/settings.json`，不清理已安装的 `node_modules`；移除 manifest 条目后需额外执行 `pi remove npm:pi-snap-edit` 清理本地安装

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用（capabilities.yaml、AGENTS.md、CONTEXT.md）
- [x] 已确认回写目标与权限（无外部目标，仓库内变更）
- [x] 已确认异常处理与冲突策略（ADR 0009 保留作历史，新建 ADR 0010 撤销）
