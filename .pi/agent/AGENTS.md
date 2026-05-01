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

## Markdown Output Quality

### Wiki Link in Tables（Markdown 表格内的 Obsidian Wiki Link）

当在 Markdown 表格单元格内写入 `[[页面名|显示文本]]` 时，`|` 会被标准 Markdown 解析器误判为表格列分隔符，导致渲染错乱和链接失效。

**强制规则：** 表格中的 Wiki 链接必须将内部的 `|` 转义为 `\|`。

**正确写法：**
```markdown
| [[str-01-competitive-games\|Competitive Games]] | Game Structure |
```

**注意：**
- 仅表格内的 Wiki 链接需要转义。列表项（如 `- 参见 — [[xxx|yyy]]`）不受影响。
- 子章节 index.md 如使用列表而非表格时无需处理。

### 非表格场景下的 Wiki Link

表格外的 `[[页面名|显示文本]]` 无需转义，`|` 在此处是合法的 Obsidian Wiki 链接语法。
