# Tasks

## 1. Pi-mono 源码修改（pi/mcp-direct-tool-rendering-fix）

### 1.1 `getAllTools()` 返回 `label` 和 `execute`

- [x] 修改 `agent-session.ts` 的 `getAllTools()`：在返回对象中加入 `label: definition.label` 和 `execute: definition.execute`
- [x] 修改 `types.ts` 的 `ToolInfo` 类型：`Pick` 中加入 `"label"` 和 `"execute"`

### 1.2 `getAllRegisteredTools()` 改为 last-write-wins

- [x] 修改 `runner.ts` 的 `getAllRegisteredTools()`：移除 `if (!toolsByName.has(...))` 守卫，直接 `toolsByName.set()`
- [x] 更新 JSDoc 注释从 "first registration" 改为 "last registration"

### 1.3 验证

- [x] 使用本地 `./pi-test.sh` 运行 pi-mono
- [x] 测试 `gitnexus` Direct Tool 输出是否按 `mcpOutputMode` 折叠
- [x] 验证 Proxy Tool `mcp` 不受影响

## 2. 知识沉淀

### 2.1 更新 `docs/reference/pi-tool-api-dependency.md`

- [x] 补充 `getAllRegisteredTools()` first-write-wins → last-write-wins 的机制说明
- [x] 补充修复方案：Pi 运行时源码修改而非 fork 绕过
- [x] 更新"Future Improvements"章节

### 2.2 更新 `openspec/pkg-backlog.md`

- [x] 更新 pi-tool-display 条目：记录 MCP 工具渲染问题通过 pi-mono 源码修改解决，不再需要 fork

## 3. 回写

- [x] 生成 writeback.md
- [x] 变量记录本次修改的 pi-mono 文件路径和改动摘要
- [x] 记录 PR 提交信息
