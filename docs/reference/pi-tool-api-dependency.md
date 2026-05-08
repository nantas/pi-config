# Pi Tool API Dependency — Extension Interface Boundary

> Last updated: 2026-05-07
> Related: [pi-tool-display MCP Direct Tools Bug Analysis](../plans/pi-tool-display-mcp-direct-tools-bug-analysis.md)
> Fix PR: `pi-mono/packages/coding-agent` — `fix/mcp-tool-rendering-override`

## Overview

This document describes the tool-related API boundary exposed by Pi's `ExtensionAPI` and the constraints it imposes on extensions that need to interact with tools registered by other extensions. It is intended as a reference for developers working on Pi extensions that modify or wrap existing tool behavior.

## Type Definitions

### ToolDefinition (internal, full)

Pi internally maintains a `ToolDefinition` type containing **all** tool metadata:

```typescript
interface ToolDefinition {
  name: string;
  label?: string;
  description?: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: unknown;
  execute: (toolCallId, params, signal, onUpdate, ctx) => Promise<unknown>;
  prepareArguments?: (args: unknown) => unknown;
  renderCall?: (args, theme) => string;
  renderResult?: (result, options, theme) => string;
  sourceInfo?: { ... };
}
```

**Location**: Pi runtime internal (`ToolManager` / `_toolDefinitions` Map).

### ToolInfo (exposed via ExtensionAPI — fixed)

`getAllTools()` returns a **picked** subset:

```typescript
type ToolInfo = Pick<ToolDefinition, "name" | "description" | "label" | "parameters" | "execute"> & {
  sourceInfo: { ... };
};
```

Previously `label` and `execute` were omitted, which prevented extensions from identifying tools by label or accessing the execute function for re-registration. Fixed in `pi-mono` PR `fix/mcp-tool-rendering-override`: `ToolInfo` type and `getAllTools()` implementation were updated to include both fields.

### getToolDefinition(name) (internal, not exposed)

Pi has an internal `getToolDefinition(name)` method that returns the **full** `ToolDefinition` from `this._toolDefinitions` Map. However, this method is **not exposed** on `ExtensionAPI`. Extensions cannot access it.

## API Boundary Summary

| Method | Returns | Has `execute` | Has `label` | Accessible |
|--------|---------|:---:|:---:|:---:|
| `pi.getAllTools()` | `ToolInfo[]` | ✓ (fixed) | ✓ (fixed) | ✓ Public API |
| `pi.getToolDefinition(name)` | `ToolDefinition` | ✓ | ✓ | ✗ Internal only |
| `pi.registerTool(spec)` | void (side-effect) | — | — | ✓ Public API |

> **2026-05-07 fix**: `label` and `execute` were added to `ToolInfo` type and `getAllTools()` implementation.

## registerTool() Semantics (extension-level)

`pi.registerTool()` uses **Map.set** semantics — registering a tool with the same `name` as an existing tool **replaces** it entirely within the calling extension's `extension.tools` Map. This is the mechanism pi-tool-display uses to inject custom `renderCall`/`renderResult`.

### The getAllRegisteredTools() gate

When `_refreshToolRegistry()` is called, it aggregates tools from ALL extensions via `getAllRegisteredTools()`, which previously used **first-write-wins**:

```typescript
// ExtensionRunner, runner.ts (before fix)
getAllRegisteredTools(): RegisteredTool[] {
    const toolsByName = new Map<string, RegisteredTool>();
    for (const ext of this.extensions) {
        for (const tool of ext.tools.values()) {
            if (!toolsByName.has(tool.definition.name)) {
                toolsByName.set(tool.definition.name, tool);
            }
        }
    }
}
```

Even if pi-tool-display successfully called `pi.registerTool()` to add a version with `renderResult` to its own extension's tools, `getAllRegisteredTools()` would skip it because pi-mcp-adapter's earlier registration already claimed that tool name. The override was **silently discarded**.

### Fix: last-write-wins

```typescript
// ExtensionRunner, runner.ts (after fix)
getAllRegisteredTools(): RegisteredTool[] {
    const toolsByName = new Map<string, RegisteredTool>();
    for (const ext of this.extensions) {
        for (const tool of ext.tools.values()) {
            toolsByName.set(tool.definition.name, tool);  // last write wins
        }
    }
}
```

Fixed in `pi-mono` PR `fix/mcp-tool-rendering-override`. The last extension to register a tool name wins, enabling `session_start`-time re-registration with render overrides to take effect.

## getActiveTools()

`getActiveTools()` returns currently active tools with their full metadata. It is used internally by Pi but has the same field limitations when exposed through `ExtensionAPI`.

## Tool Registration Lifecycle

```
Extension init
  └─ pi-mcp-adapter: registerTool({ name: "gitnexus_query", label: "MCP: query", execute, ... })
       └─ extension.tools.set("gitnexus_query", { definition: {...}, sourceInfo })
       └─ _refreshToolRegistry()
            └─ getAllRegisteredTools() → collects tools from all extensions
            └─ builds _toolDefinitions Map
            └─ builds ToolInfo[] for getAllTools() (now includes label + execute)

Session start
  └─ pi-tool-display: registerMcpToolOverrides()
       └─ pi.getAllTools()         → ToolInfo[] with label + execute ✓
       └─ isMcpToolCandidate()     → label matches "MCP:" → true ✓
       └─ pi.registerTool(...)     → re-register with renderResult
            └─ extension.tools.set(...) (pi-tool-display's extension)
            └─ _refreshToolRegistry()
                 └─ getAllRegisteredTools()
                      → last-write-wins: pi-tool-display's version wins ✓
                 └─ _toolDefinitions has renderResult ✓

Agent runtime
  └─ Tool call dispatched
       └─ _toolRegistry.get("gitnexus_query")
       └─ Calls tool.execute(...)
       └─ renderResult exists → custom rendering by pi-tool-display ✓
```

## Extension Dependency: pi-mcp-adapter ↔ pi-tool-display

```
pi-mcp-adapter                    pi-tool-display
    │                                   │
    ├─ registerTool(proxy "mcp")        │
    ├─ registerTool(direct tools)       │
    │                                   │
    │         ┌─────────────────────────┤
    │         │  getAllTools()           │
    │         │  → ToolInfo[]           │
    │         │  → no execute!          │
    │         └─────────────────────────┤
    │                                   │
    │       Cannot get execute ─────────┘
    │       → Cannot re-register with renderResult
```

## 2026-05-07 Fix: Pi Runtime Changes

### Two Root Causes Identified

| Layer | Problem | Fix |
|-------|---------|-----|
| `ToolInfo` type + `getAllTools()` | Omitted `label` and `execute` | Added both fields to `Pick` and `map()` return |
| `getAllRegisteredTools()` | First-write-wins discards re-registration | Changed to last-write-wins |

### Affected Files (`pi-mono/packages/coding-agent/src/core/`)

| File | Change |
|------|--------|
| `extensions/types.ts` | `ToolInfo` Pick includes `"label"` and `"execute"` |
| `agent-session.ts` | `getAllTools()` returns `label` and `execute` from definitions |
| `extensions/runner.ts` | `getAllRegisteredTools()` uses last-write-wins |

### How It Works Now

1. `pi.getAllTools()` returns `{ name, label, description, execute, parameters, sourceInfo }`
2. `isMcpToolCandidate()` finds Direct Tools via `label` field ("MCP:" pattern match) ✓
3. `registerMcpToolOverrides()` gets `execute` directly from `toolRecord.execute` ✓
4. `pi.registerTool()` re-registers with `renderCall`/`renderResult` ✓
5. `getAllRegisteredTools()` (last-write-wins) picks the re-registered version ✓
6. `renderResult` is used at runtime → MCP output is folded/hidden ✓

### Why the globalThis Bridge Was Not Enough

The initial attempt used a `globalThis.__mcpToolRegistry` bridge to pass `execute` from
pi-mcp-adapter to pi-tool-display. Debug logs confirmed the bridge worked (15 tools registered
and read), but the re-registration was silently discarded by `getAllRegisteredTools()`
first-write-wins. This made the bridge approach insufficient — the Pi runtime itself needed
changes to support tool re-registration with render overrides.

## Future Improvements

- **Expose `getToolDefinition(name)` on ExtensionAPI**: If Pi exposes this method, extensions like pi-tool-display can access the full `ToolDefinition` (including `execute`, `label`, `renderResult`) without relying on `getAllTools()` having the right fields. This would be a cleaner API-level addition.
- **Consider adding `getAllToolDefinitions()`**: An alternative to modifying `ToolInfo` — a separate method that returns the full tool definitions for tool management use cases.
