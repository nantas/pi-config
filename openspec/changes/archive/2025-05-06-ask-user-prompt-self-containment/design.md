# Design

## Context

pi-ask 的交互 UI 只渲染 `prompt` + `options`（label / description / preview），用户看不到 Agent 内部上下文。现有 `ASK_TOOL_PROMPT_GUIDELINES`（10 条）和 bundled `ask-user` SKILL.md 均未包含 "prompt 必须自包含" 规则，导致 Agent 将 `ask_user` 当作确认按钮使用时丢失关键信息。

本 change 在项目级 AGENTS.d/ 中补充缺失规则，作为上游修复落地前的即时兜底。

## Goals / Non-Goals

**Goals:**

- 在 `.pi/agent/AGENTS.d/tool-ask-user.md` 中定义 prompt 自包含规则，包含反模式和正确做法示例
- 在 `.pi/agent/AGENTS.md` 的 Tool Call Guidelines 区域新增引用节，确保 session 按需加载指导文件
- 遵循现有 AGENTS.d 按需加载模式（与 tool-mcp.md 等一致）

**Non-Goals:**

- 不修改 `@eko24ive/pi-ask` 上游源码（ASK_TOOL_PROMPT_GUIDELINES 或 SKILL.md）
- 不修改 pi-ask 配置或 keymaps
- 不添加工具级校验逻辑（如 prompt 最小长度检测）

## Decisions

1. **文件位置**：`.pi/agent/AGENTS.d/tool-ask-user.md`，与 `tool-mcp.md`、`output-quality.md` 等同级，遵循 on-demand 加载模式。

2. **AGENTS.md 引用位置**：在 `### MCP Tool / Dispatch` 之后、`## Markdown Output Quality` 之前插入 `### ask_user Tool` 小节，保持 Tool Call Guidelines 区域的工具条目连续。

3. **规则内容结构**：
   - 核心规则声明（prompt 自包含）
   - 反模式示例（prompt 空引用）
   - 正确做法示例（内联完整决策信息）
   - 触发条件（何时需要阅读本文件）

4. **不创建 pi-config 本地 skill 覆盖**：pi-ask 的 bundled skill 已在 `ask_user payload quality` 部分覆盖了通用质量规则，本 change 仅补充其缺失的自包含规则，不替代整个 skill。

## Risks / Migration

- **风险**：上游若后续在 `ASK_TOOL_PROMPT_GUIDELINES` 中添加类似规则，可能与本文件产生冗余。缓解：规则不冲突时冗余无害；冲突时以更严格者为准，并在上游 PR 合并后清理本地文件。
- **迁移**：无破坏性变更，纯增量添加。已同步到 `~/.pi/agent/` 后立即在新 session 中生效。
