# Design

## Context

pi-mcp-adapter 注册 Direct Tools 时，每个工具对象的三个关键字段值为：

| 字段 | 值示例 | 含 "MCP" |
|------|--------|---------|
| `name` | `"gitnexus_list_sims"` | ❌ |
| `label` | `"MCP: list_sims"` | ✅ **（当前不被检查）** |
| `description` | `"List all simulators..."` | ❌ |

pi-tool-display 在 `session_start` / `before_agent_start` 时调用 `pi.getAllTools()`，对每个工具调用 `isMcpToolCandidate()`。当前实现：

```typescript
function isMcpToolCandidate(tool: unknown): boolean {
    const name = getTextField(tool, "name");
    if (name === "mcp") return true;
    const description = getTextField(tool, "description");
    return typeof description === "string" && MCP_DESCRIPTION_PATTERN.test(description);
}
```

`name === "mcp"` 只匹配 Proxy Tool；`description` 正则匹配来 MCP server 的描述通常不含 "mcp" 字样。`label` 从未被读取，这是唯一的识别盲区。

次要问题：`formatMcpCallLine()` 中的 `toolLabel.startsWith("MCP ")`（空格结尾）无法匹配 pi-mcp-adapter 的 `"MCP: xxx"` 格式（冒号）。

## Goals / Non-Goals

**Goals:**

- 修复 `isMcpToolCandidate()` 使其通过 `label` 字段识别 MCP Direct Tools
- 修复 `formatMcpCallLine()` 使其兼容 `"MCP:"` 冒号格式的 label
- 新增单元测试覆盖 label 检查路径
- 保持 Proxy Tool `mcp` 零影响
- 保持非 MCP 工具零影响

**Non-Goals:**

- 不改 pi-mcp-adapter（label 格式、description 生成、注册逻辑）
- 不改渲染逻辑（`renderMcpResult` 行为不变，只扩展现覆盖范围）
- 不改 .pi/settings.json 或 capabilities.yaml
- 不涉及全局 sync

## Decisions

**1. label 检查位置**

在 `name === "mcp"` 之后、`description` 检查之前插入 `label` 检查。理由是：
- `name === "mcp"` 是最快路径，保留最早返回
- `label` 是比 `description` 更可靠的 MCP 判别依据（label 由 adapter 强制前缀，description 来自第三方 server）
- 提前 filter 减少后续 regex 调用

**2. label 匹配模式**

复用 `MCP_DESCRIPTION_PATTERN`（`/\bmcp\b/i`），与 description 检查保持一致的匹配语义。

**3. formatMcpCallLine 格式兼容**

将 `toolLabel.startsWith("MCP ")` 改为同时兼容冒号格式，使用 `replace(/^MCP[:\s]+/, "")` 一次性处理 `"MCP "`、`"MCP:"`、`"MCP: "` 三种变体。

**4. 测试策略**

新建 `tests/tool-metadata.test.ts`，遵循 fork 现有测试惯例（`node:test` + `node:assert/strict`）。覆盖：
- Proxy Tool → true
- Direct Tool via label `"MCP: xxx"` → true
- Direct Tool via label `"MCP xxx"` → true
- Normal tool → false
- description 含 "mcp" → true（回归）
- null/undefined/empty → false

**5. 注册时机影响**

`registerMcpToolOverrides()` 只在 `session_start` / `before_agent_start` 执行一次。修复后下次 session 重启即可生效，无需动态重新注册。

## Risks / Migration

- **误识别风险**：label 中包含 "MCP" 字样的非 MCP 工具可能被误判。评估后认为极低——pi 的工具命名约定中没有这种场景，且 `"MCP"` 作为 adapter 强制前缀具有唯一语义。
- **上游合并**：如果未来 MasuRii/pi-tool-display 上游修复此问题，nantas fork 的变更可通过 `git merge upstream/main` 合并，已存在的 label 检查不会冲突。
