# Writeback

## Writeback Targets

### 1. `docs/reference/pi-tool-api-dependency.md`

**Action**: Updated — 补充 `getAllRegisteredTools()` first-write-wins 机制、两个 root cause 分析、修复方案说明

### 2. `openspec/pkg-backlog.md`

**Action**: Updated — pi-tool-display 的 MCP 工具渲染问题已通过 pi-mono 源码修改解决，fork 修复不再需要

## Execution Evidence

- [x] `agent-session.ts`: `getAllTools()` 返回 label 和 execute
- [x] `types.ts`: `ToolInfo` Pick 包含 label 和 execute
- [x] `runner.ts`: `getAllRegisteredTools()` last-write-wins
- [x] `docs/reference/pi-tool-api-dependency.md` updated
- [x] `openspec/pkg-backlog.md` updated

## PR 提交信息（pi-mono 仓库）

**Branch**: `fix/mcp-tool-rendering-override`

**Commit 信息**:

```
fix(coding-agent): expose label/execute in ToolInfo and switch tool registry to last-write-wins

Two changes to enable pi-tool-display's registerMcpToolOverrides() to work:

1. ToolInfo type and getAllTools() now include label and execute fields.
   Previously ToolInfo was narrowly typed as Pick<ToolDefinition, 
   "name" | "description" | "parameters">, omitting label and execute.
   This prevented extensions from identifying tools by label or accessing
   the execute function for re-registration with render overrides.

2. getAllRegisteredTools() switched from first-write-wins to last-write-wins.
   The previous first-write-wins policy silently discarded tool registrations
   from extensions that re-register a tool (e.g., at session_start) to add
   renderCall/renderResult. Last-write-wins allows extensions like
   pi-tool-display to apply rendering overrides while preserving the original
   execute function.

Fixes: pi-tool-display MCP tool output folding not working for Direct Tools.
```

**影响文件**：
- `packages/coding-agent/src/core/agent-session.ts` — `getAllTools()` 增加 label/execute
- `packages/coding-agent/src/core/extensions/types.ts` — `ToolInfo` 类型扩展
- `packages/coding-agent/src/core/extensions/runner.ts` — `getAllRegisteredTools()` last-write-wins
