# Proposal

## 问题定义

pi-tool-display 通过 `registerMcpToolOverrides()` 机制为 MCP 工具注册自定义渲染（`renderCall`/`renderResult`），以控制工具输出的折叠/隐藏行为。此前已发现 `isMcpToolCandidate()` 不检查 `label` 字段的问题并尝试修复，但修复后仍然无效果。

深入调查后发现**两个更底层的问题**：

### 问题 1：`getAllTools()` 返回的 ToolInfo 被过度裁剪

`agent-session.ts:804` 中实现：
```typescript
getAllTools(): ToolInfo[] {
    return Array.from(this._toolDefinitions.values()).map(({ definition, sourceInfo }) => ({
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
        sourceInfo,
    }));
}
```

`ToolInfo` 类型定义为 `Pick<ToolDefinition, "name" | "description" | "parameters">`，**不包含 `label` 和 `execute`**。这导致：
- `isMcpToolCandidate()` 无法通过 label 识别 MCP Direct Tool（label 不在返回中）
- `registerMcpToolOverrides()` 无法获取原始 `execute` 函数

### 问题 2：`getAllRegisteredTools()` 使用 first-write-wins

`runner.ts:373` 中实现：
```typescript
/** Get all registered tools from all extensions (first registration per name wins). */
getAllRegisteredTools(): RegisteredTool[] {
    const toolsByName = new Map<string, RegisteredTool>();
    for (const ext of this.extensions) {
        for (const tool of ext.tools.values()) {
            if (!toolsByName.has(tool.definition.name)) {  // ← 第一个注册的赢
                toolsByName.set(tool.definition.name, tool);
            }
        }
    }
}
```

pi-tool-display 在 `session_start` 时通过 `pi.registerTool()` 重新注册带 `renderResult` 的工具，但其版本被 `getAllRegisteredTools()` 的 first-write-wins 丢弃，最终 `_refreshToolRegistry()` 使用的是 pi-mcp-adapter 在 init 时注册的原始版本。

### 综合效果

两个问题叠加：`registerMcpToolOverrides()` 既无法通过 `getAllTools()` 获取 `label`/`execute`，即使获取到并调用 `registerTool()` 重新注册，覆盖也被 `getAllRegisteredTools()` 丢弃。该机制**对任何工具（包括 Proxy Tool `mcp`）均未生效**。

## 范围边界

**纳入范围：**
- 修改 Pi 运行时源码 `pi-coding-agent` 的三个文件：
  - `agent-session.ts`: `getAllTools()` 返回 `label` 和 `execute`
  - `extensions/types.ts`: `ToolInfo` 类型增加 `label` 和 `execute`
  - `extensions/runner.ts`: `getAllRegisteredTools()` 改为 last-write-wins
- 更新 `docs/reference/pi-tool-api-dependency.md`：补充 `getAllRegisteredTools()` first-write-wins 机制和修复方案

**不纳入范围：**
- 不修改 pi-mcp-adapter fork
- 不修改 pi-tool-display fork
- 不涉及 `.pi/settings.json` 或 `capabilities.yaml`

## Capabilities

### New Capabilities
- `mcp-tool-rendering-fix`: 修复 pi-tool-display 无法为 MCP 工具（含 Direct Tool）注册渲染覆盖的问题。根因在 Pi 运行时：`getAllTools()` 未返回 `label`/`execute`，且 `getAllRegisteredTools()` 使用 first-write-wins 丢弃覆盖注册。

### Modified Capabilities
- (无)

## Impact

- pi-tool-display 的 `mcpOutputMode` 配置将对所有 MCP 工具（含 Direct Tool）生效
- `getAllTools()` 新增 `label` 和 `execute` 字段，现有扩展自动获得更多工具信息，无破坏性变更
- `getAllRegisteredTools()` 从 first-write-wins 改为 last-write-wins，对同名工具最后注册的扩展获胜，更符合预期（覆盖策略）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认项目页 / 回写目标：
  - `repo://pi-config` — 当前仓库
  - `repo://pi-mono` — Pi 运行时源码
  - 回写目标：`docs/reference/pi-tool-api-dependency.md`, `openspec/pkg-backlog.md`
