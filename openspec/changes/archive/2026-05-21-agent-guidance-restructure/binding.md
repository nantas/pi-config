# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/specs/change-orbitos-v1/spec.md`
- `project_page_ref`:
  - `.pi/agent/AGENTS.md` — 全局 Agent 行为指导（同步到 `~/.pi/agent/AGENTS.md`）
  - `.pi/agent/AGENTS.d/` — 全局 AGENTS.d 子指南目录
  - `AGENTS.md` — pi-config 仓库项目级 Agent 指导
  - `.pi/skills/lsp-code-intelligence/SKILL.md` — 待替换的旧 LSP skill
  - `.pi/capabilities.yaml` — 能力清单 Manifest
  - `docs/reference/` — 仓库级参考文档目录（新存放地）
  - `.pi/settings.json` — 项目级 settings（`subagents` 部分）
- `additional_context_refs`:
  - `~/.pi/agent/mcp.json` — 全局 MCP 服务配置（serena 已添加）
  - `~/.pi/agent/settings.json` — 全局 settings
  - `opsx.sync-pi-agent` — 全局同步脚本的 spec

## Source of Truth

- 行为规范真源：`specs/simplify/consolidate/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/agent/AGENTS.md` — 精简全局 AGENTS.md
  - `.pi/agent/AGENTS.d/lsp-guide.md` — 删除
  - `.pi/agent/AGENTS.d/output-quality.md` — 删除
  - `.pi/agent/AGENTS.d/tool-ask-user.md` — 删除
  - `.pi/agent/AGENTS.d/tool-mcp.md` — 删除
  - `.pi/agent/AGENTS.d/pi-provider-model.md` — 删除
  - `.pi/agent/AGENTS.d/readme-governance.md` — 删除
  - `docs/reference/pi-provider-model.md` — 新建
  - `docs/reference/readme-governance.md` — 新建
  - `.pi/skills/lsp-code-intelligence/SKILL.md` — 删除
  - `.pi/skills/serena-code-intelligence/SKILL.md` — 新建
  - `AGENTS.md` — 更新项目级引用
  - `.pi/capabilities.yaml` — 更新 skill 列表
- `writeback_owner`: this change (agent-guidance-restructure)
- `writeback_timing`: after implementation verification completes, before opsx-archive

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
