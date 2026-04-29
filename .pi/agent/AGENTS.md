# Global Agent Guidance

该文件通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/AGENTS.md`，对所有 Pi session 生效。
如需更新，先修改此文件并提交到版本管理，再运行同步脚本。

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

- Dispatch agent 的 task 描述要具体，包含足够上下文。
- MCP 工具调用前先确认 server 已连接。
