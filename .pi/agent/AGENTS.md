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

## Markdown Output Quality

输出内容包含 Markdown 表格时（尤其是 Obsidian Wiki 链接），请先阅读 [AGENTS.d/output-quality.md](./AGENTS.d/output-quality.md)。

## LSP 代码智能

涉及复杂仓库的代码理解、检索或诊断时，优先用 `lsp` 工具而非 `grep` + `read`。完整指南参见 [AGENTS.d/lsp-guide.md](./AGENTS.d/lsp-guide.md)。

以下场景**必须**阅读：
- 第一次在当前项目中使用 `lsp` 工具
- 需要理解某个符号的定义、引用或类型
- 修改代码前需要检查影响范围
- 编辑完成后需要验证无新增错误
