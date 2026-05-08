# pi-tool-display MCP Direct Tools 折叠失效诊断

> 记录日期: 2026-05-06
> 涉及包: `pi-tool-display@0.3.6`, `pi-mcp-adapter@2.5.1`
> 状态: 待修复（等待本地修改管理方式确认）

---

## 问题现象

在 `opencode` preset 下，`pi-tool-display` 的 `mcpOutputMode` 设为 `"hidden"`，但：
- **`mcp` Proxy Tool** 的输出被正确折叠
- **通过 `directTools` 暴露的 Direct Tools**（如 `gitnexus_list_sims`）输出**全量显示**，不受 `mcpOutputMode` 控制

---

## 根因分析

### 1. pi-mcp-adapter 的两种 MCP 暴露模式

| 模式 | 注册方式 | 工具名示例 | `label` | `description` |
|------|---------|-----------|---------|--------------|
| **Proxy** | 统一注册一个 `mcp` 工具 | `"mcp"` | `"MCP"` | 含 "MCP gateway" 字样 |
| **Direct** | 逐个注册为 Pi 原生工具 | `"server_toolname"` | `"MCP: toolname"` | 来自 MCP server（通常**不含** "mcp"） |

### 2. pi-tool-display 的识别逻辑缺陷

**源码位置**: `pi-tool-display/src/tool-metadata.ts`

```typescript
const MCP_DESCRIPTION_PATTERN = /\bmcp\b/i;

export function isMcpToolCandidate(tool: unknown): boolean {
    const name = getTextField(tool, "name");
    if (name === "mcp") {
        return true;  // ← 仅 Proxy Tool 能命中
    }
    const description = getTextField(tool, "description");
    return typeof description === "string" && MCP_DESCRIPTION_PATTERN.test(description);
    // ← Direct Tool 的 description 来自 MCP server，通常不含 "mcp"，识别失败
}
```

**问题**: `isMcpToolCandidate()` 只检查 `name` 和 `description`，**完全不检查 `label`**。

- Proxy Tool `mcp`: `name === "mcp"` → ✅ 识别成功 → 被包装 `renderResult` → 折叠生效
- Direct Tool `gitnexus_list_sims`: `name` ≠ `"mcp"`，`description` = "List all simulators..."（不含 mcp）→ ❌ **识别失败** → 不会被 `pi-tool-display` 包装 → 输出全量显示

### 3. `registerMcpToolOverrides()` 的执行时机

**源码位置**: `pi-tool-display/src/tool-overrides.ts`（约 line 1450+）

```typescript
const registerMcpToolOverrides = (): void => {
    let allTools: unknown[] = [];
    try {
      allTools = pi.getAllTools();
    } catch (error) { ... }

    for (const candidate of allTools) {
      if (!isMcpToolCandidate(candidate)) {
        continue;  // ← Direct Tools 在这里被跳过
      }
      // ... wrap and register override
    }
};

pi.on("session_start", async () => {
    clearWriteExecutionMeta(...);
    registerMcpToolOverrides();  // ← 只在 session_start / before_agent_start 执行
});
```

### 4. 次要问题：`formatMcpCallLine` 的 label 解析也失效

**源码位置**: `pi-tool-display/src/tool-overrides.ts`（约 line 850）

```typescript
const target =
    toolName === "mcp"
      ? resolveMcpProxyCallTarget(args)
      : toolLabel.startsWith("MCP ")   // ← 注意是 "MCP "（空格）
        ? toolLabel.slice("MCP ".length)
        : toolLabel;
```

但 pi-mcp-adapter 的 label 格式是 `"MCP: toolname"`（**冒号**），`startsWith("MCP ")` 永远返回 `false`。

---

## 修复方案

### 修复 1：识别 Direct Tools（核心）

**文件**: `pi-tool-display/src/tool-metadata.ts`

```typescript
export function isMcpToolCandidate(tool: unknown): boolean {
    const name = getTextField(tool, "name");
    if (name === "mcp") {
        return true;
    }

    // 新增：检查 label，以识别 MCP Direct Tools
    const label = getTextField(tool, "label");
    if (typeof label === "string" && MCP_DESCRIPTION_PATTERN.test(label)) {
        return true;
    }

    const description = getTextField(tool, "description");
    return typeof description === "string" && MCP_DESCRIPTION_PATTERN.test(description);
}
```

### 修复 2：`formatMcpCallLine` 兼容 `MCP:` 格式（次要）

**文件**: `pi-tool-display/src/tool-overrides.ts`

```typescript
const target =
    toolName === "mcp"
        ? resolveMcpProxyCallTarget(args)
        : toolLabel.startsWith("MCP ") || toolLabel.startsWith("MCP:")
            ? toolLabel.replace(/^MCP[:\s]+/, "")
            : toolLabel;
```

---

## 影响范围

- **所有通过 `directTools` 模式暴露的 MCP 工具**均受此 bug 影响
- 在 `pi-mcp-adapter` 配置中，`settings.directTools = true` 或某个 server 的 `directTools` 非空时，该 server 的工具都会以 Direct 模式注册
- 这意味着大部分实际使用中的 MCP 工具（如 `gitnexus_*`、`mcp-server_*` 等）都不会被折叠

---

## 待办

- [x] 确认 pi-config 仓库对 npm 包的本地修改管理方式（已采用 fork 管理模式）
- [x] 应用上述修复到 `pi-tool-display` 源码（通过 globalThis 桥接方案）
- [ ] 运行 `pi -e` ephemeral 测试验证 Direct Tools 折叠生效
- [ ] 考虑是否向上游 `pi-tool-display` 提交 PR

---

## 补充说明

> **深入调查发现更底层问题**：`getAllTools()` 返回的 `ToolInfo` 不包含 `execute` 字段，因此即使识别逻辑修复后，`registerMcpToolOverrides()` 仍无法获取原始 `execute` 函数来完成重新注册。
>
> 最终修复方案采用 `globalThis.__mcpToolRegistry` 桥接模式，详见：
> - [Pi Tool API Dependency 参考文档](../reference/pi-tool-api-dependency.md)
> - OpenSpec change: `mcp-direct-tool-rendering-fix`
