# Tasks

## 1. 实现准备

- [x] 1.1 确认 nantas/pi-tool-display fork 的 dev clone 路径与分支状态
- [x] 1.2 确认 dev clone 中现有测试全部通过：`npm test`

## 2. 核心实现任务

### 2.1 修改 `src/tool-metadata.ts` — `isMcpToolCandidate()`

- [x] 2.1.1 在 `name === "mcp"` 检查之后新增 `label` 字段检查，使用 `MCP_DESCRIPTION_PATTERN` 匹配
- [x] 2.1.2 验证逻辑：label 含有 "MCP" 字样的工具返回 `true`，不影响其他路径

### 2.2 修改 `src/tool-overrides.ts` — `formatMcpCallLine()`

- [x] 2.2.1 将 `toolLabel.startsWith("MCP ")` 替换为兼容 `"MCP:"` 格式的检查
- [x] 2.2.2 使用 `replace(/^MCP[:\s]+/, "")` 一次性处理多种 label 前缀变体
- [x] 2.2.3 验证逻辑：`"MCP: toolname"` 和 `"MCP toolname"` 都被正确提取为 `"toolname"`

### 2.3 新增测试文件 `tests/tool-metadata.test.ts`

- [x] 2.3.1 创建测试文件，导入 `isMcpToolCandidate` 函数
- [x] 2.3.2 Proxy Tool case：`{ name: "mcp" }` → `true`
- [x] 2.3.3 Direct Tool case（冒号 label）：`{ name: "x_list", label: "MCP: list" }` → `true`
- [x] 2.3.4 Direct Tool case（空格 label）：`{ name: "x_list", label: "MCP list" }` → `true`
- [x] 2.3.5 Normal tool case：`{ name: "grep" }` → `false`
- [x] 2.3.6 Description case（回归）：`{ name: "foo", description: "MCP gateway" }` → `true`
- [x] 2.3.7 Edge cases：`null`, `undefined`, `{}` → `false`
- [x] 2.3.8 运行 `npm test` 确认所有测试通过

## 3. 收敛与验证准备

- [x] 3.1 代码审查：grep pi-mcp-adapter 确认所有 Direct Tool 注册统一使用 `"MCP: xxx"` label 格式
- [x] 3.2 准备 ephemeral 测试环境：确认 opencode preset 的 `mcpOutputMode: "hidden"` 配置
- [x] 3.3 更新 CHANGELOG.md 记录修复

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md（基于实现结果 vs design 决策 vs 任务完成情况）
- [x] 4.2 生成 writeback.md（更新 forks/manifest.yaml + openspec/pkg-backlog.md）
- [x] 4.3 执行 writeback 回写，记录证据
