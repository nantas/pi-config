# Global Agent Guidance

该文件通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/AGENTS.md`，对所有 Pi session 生效。
如需更新，先修改此文件并提交到版本管理，再运行同步脚本。

---

## Core Rules

- 默认语言：中文
- 保持输出简洁
- 展示文件路径时清晰标注

## Tool Call Guidelines

### Edit Tool

**Schema 结构（必填字段在顶层，与 `edits` 同级）：**

```json
{
  "path": "relative/path/to/file",
  "edits": [
    { "oldText": "...", "newText": "..." },
    { "oldText": "...", "newText": "..." }
  ]
}
```

- **`path` 是顶层必填字段**，不要把它放进 `edits[]` 内部，也不要遗漏。
- **Batch limit**: 最多 3-4 个 `edits[]` 条目 per 调用。超过时拆分为多次 edit 调用。
- **Content length**: 每条 `oldText` / `newText` 控制在 200 字符以内。长 multiline 内容优先用 bash + sed。
- **Avoid overlap**: 多个 `edits[]` 的 `oldText` 不能在原始文件中重叠。
- **Prefer sed for bulk**: 简单文本替换（如 `[ ]` → `[x]`）直接用 `sed -i ''` 而非 edit。

### Bash Tool

- 优先用 bash 工具做**文件读取、查找、替换**，而非多次 edit。
- 临时文件用 `mktemp -d` 创建，用完后清理。

### Error Recovery

- 工具调用失败后，**不要立即用相同参数重试**。
- 先读错误信息确认根因：missing field / type mismatch / content overlap。
- 根据根因选择：拆分参数、换方案、或修复参数后再试。

### MCP Tool / Dispatch

涉及以下场景时，请先阅读 [AGENTS.d/tool-mcp.md](./AGENTS.d/tool-mcp.md)：
- 需要创建或调用 Dispatch agent
- 需要通过 MCP 操作外部工具

### ask_user Tool

涉及以下场景时，请先阅读 [AGENTS.d/tool-ask-user.md](./AGENTS.d/tool-ask-user.md)：
- 调用 ask_user 让用户确认某个决策或内容选择
- 需要将 Agent 内部生成的数据（标题、摘要、方案等）展示给用户做判断

## Markdown Output Quality

输出内容包含 Markdown 表格时（尤其是 Obsidian Wiki 链接），请先阅读 [AGENTS.d/output-quality.md](./AGENTS.d/output-quality.md)。

## LSP 代码智能

涉及复杂仓库的代码理解、检索或诊断时，优先用 `lsp` 工具而非 `grep` + `read`。完整指南参见 [AGENTS.d/lsp-guide.md](./AGENTS.d/lsp-guide.md)。

以下场景**必须**阅读：
- 第一次在当前项目中使用 `lsp` 工具
- 需要理解某个符号的定义、引用或类型
- 修改代码前需要检查影响范围
- 编辑完成后需要验证无新增错误

## Subagent 自动委派

涉及以下场景时，请先阅读 [AGENTS.d/subagent-usage.md](./AGENTS.d/subagent-usage.md)：
- 需要追踪跨文件调用链或搜索复杂代码模式
- 需要调用 `gitnexus_query/context/impact` 等返回大量数据的工具
- 需要并行执行多个独立探索方向
- 实施完成后需要自动代码审查

**核心原则**：当任务需要 3+ 步工具调用才能得出一个结论时，优先用 `subagent()` 委托给子 agent 执行，避免主 session context 被膨胀。

## README 维护

当变更涉及仓库能力的增删（扩展、包、Agent、技能）时，必须按 [AGENTS.d/readme-governance.md](./AGENTS.d/readme-governance.md) 评估并更新 README.md 和 `docs/getting-started.md` 的能力描述，保持与 `capabilities.yaml` 一致。

## Pi 供应商与模型配置

当用户需要设置自定义供应商、添加模型或配置 `enabledModels` 时，先阅读 [AGENTS.d/pi-provider-model.md](./AGENTS.d/pi-provider-model.md)：
- 通过 `~/.pi/agent/models.json` 添加自定义供应商/模型（Ollama、代理网关等）
- 通过 `~/.pi/agent/settings.json` 中的 `enabledModels` 控制模型轮询范围

### 初学者首次配置

当用户是 pi-config 初学者或需要完整的环境配置指导时，引导其阅读 [docs/getting-started.md](../../docs/getting-started.md)：
- 七步入门工作流：安装 Pi CLI → 配置供应商 → 配置 enabledModels → 查看能力清单 → 确认同步范围 → 执行全局同步 → 验证环境
- 该文档涵盖内置供应商 login 和自定义供应商（企业代理/API 网关）两种配置路径
