# Design

## Context

当前 `.pi/agent/AGENTS.md` 和 `.pi/agent/AGENTS.d/` 内容臃肿（~500 行），混合高频核心规则与低频参考信息，导致 agent 对关键约束的遵从度下降。同时 `lsp-code-intelligence` skill 已过时（serena MCP 已接入），部分 AGENTS.d 文件价值低。

三个 capability specs 定义了：
- `specs/serena-code-intelligence/spec.md` — 创建 serena skill，删除 lsp skill
- `specs/reference-docs-consolidation/spec.md` — 迁移参考文档到 `docs/reference/`
- `specs/agent-guidance-simplify/spec.md` — 精简全局 AGENTS.md，删除无用 AGENTS.d 文件

## Goals / Non-Goals

**Goals:**

- 全局 AGENTS.md 从 ~500 行精简到 ~80-100 行
- 删除 6 个 AGENTS.d 文件（4 个彻底删除，2 个迁移到 `docs/reference/`）
- 创建 `docs/reference/pi-provider-model.md` 和 `docs/reference/readme-governance.md`
- 创建 `.pi/skills/serena-code-intelligence/SKILL.md`
- 删除 `.pi/skills/lsp-code-intelligence/`
- 更新 `.pi/capabilities.yaml` skill 列表
- 更新项目级 `AGENTS.md` 引用 `docs/reference/` 文档
- `~/.pi/agent/` 全局同步（opsx-closeout 阶段执行）

**Non-Goals:**

- 不修改 serena 的 mcp.json 配置（已在当前会话完成）
- 不修改 `subagent-usage.md`（已合理按需加载）
- 不修改其他 skill（pkg-research、pi-extension-dev 等）
- 不修改其他仓库的 AGENTS.md

## Decisions

### D1: 文档迁移路径（`AGENTS.d/` → `docs/reference/`）

将 `pi-provider-model.md` 和 `readme-governance.md` 从 `.pi/agent/AGENTS.d/` 迁移到 `docs/reference/`。

- 全局 AGENTS.md 通过相对路径 `docs/reference/<file>.md` 引用（解析为仓库根相对路径）
- 项目级 AGENTS.md 直接引用 `docs/reference/<file>.md`
- 这些文档不再通过 AGENTS.d 懒加载机制提供，改为更通用的 `docs/reference/` 参考文档

### D2: 全局 AGENTS.md 精简策略

采用"删除 + 链接"双层策略：

| 节 | 处理方式 |
|---|---------|
| Core Rules | 保留（3 行） |
| Edit Tool | 精简为 3 条自检项，移除 JSON schema 块 |
| Bash Tool | 保留（2 行） |
| Error Recovery | 保留（3 行） |
| MCP Tool | 删除（不复相关，agent 自主使用 `mcp` 工具即可） |
| ask_user Tool | 删除引用 |
| Web Search | 移除完整参数表，保留 5 条使用原则 |
| Markdown Output Quality | 删除引用 |
| LSP 代码智能 | 改为 serena 工具指引 + 链接到 skill |
| Subagent 委派 | 精简为触发原则表 + 链接到 `AGENTS.d/subagent-usage.md` |
| README 维护 | 链接指向 `docs/reference/readme-governance.md` |
| Pi 供应商/模型 | 链接指向 `docs/reference/pi-provider-model.md` |

### D3: serena skill 位置与格式

- 路径: `.pi/skills/serena-code-intelligence/SKILL.md`
- 格式: 标准 Pi skill frontmatter（`name`、`description`）+ Markdown 正文
- skill name: `serena-code-intelligence`
- description: 概述 serena 工具的全覆盖能力
- 正文: 按 spec 要求包含工具概览、决策表、初始化工作流、代码探索/编辑流程

### D4: 同步策略

文件变更不通过 `scripts/sync-pi-agent.sh` 推送到全局（opsx-closeout 阶段处理）。

## Risks / Migration

### 迁移风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| 已有 agent 依赖 `lsp-code-intelligence` skill | 低 | serena 覆盖全部等价能力且更完整 |
| 删除的 AGENTS.d 文件在历史会话中有引用 | 低 | 历史会话不影响新会话 |
| `docs/reference/` 的可发现性低于 AGENTS.d 的按需加载 | 中 | 通过项目级 AGENTS.md 显式链接补偿 |
| 精简后 AGENTS.md 可能遗漏必要规则 | 低 | 仅删除低频内联内容，核心规则全部保留或改为链接 |
| serena skill 内容与 serena 官方文档不一致 | 低 | skill 聚焦使用模式而非 API 参考，serena `initial_instructions` 工具提供最新官方指引 |
