# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无（本变更为全局配置重构，无外部标准页依赖）
- `project_page_ref`: `AGENTS.md`（全局 agent 指导）、`.pi/agent/mcp.json`（MCP 配置）、`.pi/capabilities.yaml`（能力清单）
- `additional_context_refs`: `AGENTS.d/subagent-usage.md`、`.pi/agents/*.md`（4 个 agent 定义文件）

## Source of Truth

- 行为规范真源：`specs/fff-retrieval/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部回写目标（所有变更均在 pi-config 仓库内完成）
- `writeback_owner`: 本仓库
- `writeback_timing`: 实现完成后同步一次

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- serena MCP 配置删除后，需运行 `scripts/sync-pi-agent.sh` 将变更推送到 `~/.pi/agent/`

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用（AGENTS.md、mcp.json、capabilities.yaml、agent 定义）
- [x] 已确认回写目标与权限（无外部目标，仓库内变更）
- [x] 已确认异常处理与冲突策略（serena skill 移至 archive 保留）
