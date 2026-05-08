# Design

## Context

Pi 的扩展工具系统涉及三层：

```
扩展注册           运行时聚合            扩展查询
┌─────────┐      ┌───────────────┐      ┌──────────────┐
│ ext A   │      │ getAllRegistered │      │ getAllTools() │
│ tools:  │───→  │ Tools()        │───→  │ → ToolInfo   │
│  foo    │      │ first-write-wins│      │ (裁剪后)     │
├─────────┤      └───────────────┘      └──────────────┘
│ ext B   │               │
│ tools:  │               ↓
│  foo    │      _refreshToolRegistry()
│ (覆写)  │      → _toolDefinitions Map
└─────────┘      → _toolRegistry (渲染用)
```

问题出在两个隔离点：

1. **`getAllTools()` 裁剪了 `label` 和 `execute`** — 扩展无法获取完整工具定义
2. **`getAllRegisteredTools()` 使用 first-write-wins** — 即使 `registerTool()` 成功，扩展 B 的覆盖版本也被丢弃

## Goals / Non-Goals

**Goals:**
- `getAllTools()` 返回 `label` 和 `execute`，使扩展能识别工具来源和获取执行函数
- `getAllRegisteredTools()` 改为 last-write-wins，使 `session_start` 时的工具覆盖生效
- 无需修改 pi-mcp-adapter 或 pi-tool-display fork 即可修复 MCP 工具渲染

**Non-Goals:**
- 不改变 Pi 的 `_baseToolDefinitions`（built-in 工具）加载逻辑
- 不改变 `ToolDefinition` 或 `ToolInfo` 的其他字段
- 不涉及 package manager 或资源加载层

## Decisions

**1. `ToolInfo` 增加 `label` 和 `execute`**

```typescript
// before
export type ToolInfo = Pick<ToolDefinition, "name" | "description" | "parameters"> & {
    sourceInfo: SourceInfo;
};

// after
export type ToolInfo = Pick<ToolDefinition, "name" | "description" | "label" | "parameters" | "execute"> & {
    sourceInfo: SourceInfo;
};
```

**理由**：`ToolInfo` 是扩展了解所有已注册工具的唯一通道。缺少 `label` 导致 `isMcpToolCandidate()` 无法识别 Direct Tool；缺少 `execute` 导致覆盖注册无法获取原始执行函数。增加这两个字段是对 `getAllTools()` 输出不完整的修复。

**风险**：`execute` 被暴露后，扩展可以调用其他扩展注册的工具执行函数。但 `execute` 本身已经在 `ToolDefinition` 中，扩展通过其他方式（如直接 import）也能获取。当前所有使用 `ToolInfo` 的代码只访问 `.name`/`.description`/`.parameters`，新增字段不影响现有行为。

**2. `getAllTools()` 返回新字段**

```typescript
// before
getAllTools(): ToolInfo[] {
    return Array.from(this._toolDefinitions.values()).map(({ definition, sourceInfo }) => ({
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
        sourceInfo,
    }));
}

// after
getAllTools(): ToolInfo[] {
    return Array.from(this._toolDefinitions.values()).map(({ definition, sourceInfo }) => ({
        name: definition.name,
        label: definition.label,
        description: definition.description,
        execute: definition.execute,
        parameters: definition.parameters,
        sourceInfo,
    }));
}
```

**3. `getAllRegisteredTools()` 改为 last-write-wins**

```typescript
// before
if (!toolsByName.has(tool.definition.name)) {
    toolsByName.set(tool.definition.name, tool);
}

// after
toolsByName.set(tool.definition.name, tool);  // 最后注册的赢
```

**理由**：first-write-wins 的设计假设是"先注册的是权威"和"扩展不应覆盖其他扩展的工具"。但 pi-tool-display 的 `registerMcpToolOverrides()` 是一个合法的覆盖场景：它保留原工具的 `execute` 函数不变，仅附加 `renderCall`/`renderResult` 来修改渲染行为。last-write-wins 允许这种覆盖，同时不破坏扩展系统的其他约束（同名工具的合法性仍由 `registerTool()` 调用方负责）。

**与 built-in 工具的交互**：`_refreshToolRegistry()` 先加载 `_baseToolDefinitions`（built-in），再用 `allCustomTools` 中的扩展工具覆盖。这确保扩展工具始终优先于 built-in 工具，且其中使用 last-write-wins。

## Risks / Migration

- **不兼容风险**：如果已有扩展依赖 first-write-wins 阻止其他扩展覆盖其工具，则 last-write-wins 会破坏此假设。但在 Pi 的扩展生态中未发现此类用例。`registerMcpToolOverrides()` 是已知的唯一覆盖场景。
- **测试覆盖**：`getAllTools()` 的测试仅检查 `.name` 和 `.sourceInfo`，新增字段不会导致失败。`getAllRegisteredTools()` 的单元测试在 `extensions-runner.test.ts` 中，需要验证 last-write-wins 行为。
