# Verification

## 实现结果 vs Design 决策

### Decision 1: label 检查位置 ✅

- **Design**: 在 `name === "mcp"` 之后、`description` 检查之前插入 `label` 检查
- **实现**: `src/tool-metadata.ts` — 在 `name === "mcp"` 返回后、`description` 检查前新增 `getTextField(tool, "label")` + `MCP_DESCRIPTION_PATTERN.test(label)`
- **验证**: 测试覆盖 Proxy Tool (`name: "mcp"` → true), label 匹配, description 回退

### Decision 2: label 匹配模式 ✅

- **Design**: 复用 `MCP_DESCRIPTION_PATTERN`（`/\bmcp\b/i`）
- **实现**: 使用 `MCP_DESCRIPTION_PATTERN.test(label)` 保持一致语义
- **验证**: `"MCP: list"` → true, `"MCP list"` → true, `"grep"` → false

### Decision 3: formatMcpCallLine 格式兼容 ✅

- **Design**: `replace(/^MCP[:\s]+/, "")` 处理三种变体
- **实现**: `tool-overrides.ts:858` — 替换原 `startsWith("MCP ")` + `slice("MCP ".length)` 为 `toolLabel.replace(/^MCP[:\s]+/, "") || toolLabel`
- **验证**: `"MCP: toolname"` → `"toolname"`, `"MCP toolname"` → `"toolname"`, fallback 到 `toolLabel`

### Decision 4: 测试策略 ✅

- **Design**: 新建 `tests/tool-metadata.test.ts`，使用 `node:test` + `node:assert/strict`
- **实现**: 8 个测试用例全部通过，覆盖：
  - Proxy Tool (`name: "mcp"`) → true
  - Direct Tool via `"MCP: xxx"` label → true
  - Direct Tool via `"MCP xxx"` label → true
  - Normal tool → false
  - Description 含 "MCP" → true（回归）
  - null → false
  - undefined → false
  - `{}` → false
- **结果**: 8/8 pass

### Decision 5: 注册时机 ✅

- **Design**: 修复后下次 session 重启即可生效
- **实现**: 未修改 `registerMcpToolOverrides()` 的调用时机，仅修改了 `isMcpToolCandidate()` 的判断逻辑

## 代码审查

### pi-mcp-adapter Label 格式确认

- Direct Tool 注册: `label: \`MCP: ${spec.originalName}\`` (index.ts:71)
- Proxy Tool 注册: `label: "MCP"` (index.ts:236)
- 所有 Direct Tool 统一使用 `"MCP: xxx"` 格式 ✅

### opencode Preset 确认

- opencode preset 继承 `DEFAULT_TOOL_DISPLAY_CONFIG.mcpOutputMode = "hidden"`
- 修复后 Direct Tool 将被正确识别，其输出将被 `mcpOutputMode: "hidden"` 控制 ✅

## 回归测试

- `tests/tool-metadata.test.ts`: 8/8 pass
- `tests/capabilities.test.ts`: 2/2 pass（capabilities 检测 + config guards）
- 预存 4 个失败测试（workspace path detection）未受影响

## Fork 提交

- Commit: `bd352d4` on `main` branch
- Message: "fix: recognize MCP Direct Tools via label field"
- Files changed: 4 (CHANGELOG.md, tool-metadata.ts, tool-overrides.ts, tool-metadata.test.ts)

## 结论

所有 design 决策均已正确实现，测试覆盖完整，无回归问题。变更已提交到 fork。
