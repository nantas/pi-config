# Proposal

## 问题定义

在 pi-mcp-adapter 的 `directTools` 模式下，MCP 工具通过 `pi.registerTool()` 逐个注册为 Pi 原生工具，其 `label` 格式为 `"MCP: <originalName>"`，但 `description` 来自 MCP server（不含 "mcp" 字样）。pi-tool-display 的 `isMcpToolCandidate()` 函数只检查工具对象的 `name` 和 `description` 字段，**完全不检查 `label`**，导致 Direct Tool 无法被识别为 MCP 工具。

识别失败后，Direct Tool 不会被 `renderMcpResult` 覆盖注册，其输出不受 `mcpOutputMode` 控制。即使 preset 将 `mcpOutputMode` 设为 `"hidden"`，Proxy Tool `mcp` 的输出被正确折叠，但 Direct Tool（如 `gitnexus_list_sims`）的输出仍然全量显示。

次要问题：`formatMcpCallLine()` 使用 `toolLabel.startsWith("MCP ")`（空格）提取显示名，而 pi-mcp-adapter 的 label 格式为 `"MCP: xxx"`（冒号），导致显示名提取失效。

## 范围边界

**纳入范围：**
- 在 nantas/pi-tool-display fork 中修改 `src/tool-metadata.ts` 的 `isMcpToolCandidate()`，新增 `label` 字段检查
- 在 nantas/pi-tool-display fork 中修改 `src/tool-overrides.ts` 的 `formatMcpCallLine()`，兼容 `"MCP:"` 冒号格式
- 新增 `tests/tool-metadata.test.ts` 覆盖 label 检查场景
- 更新 `forks/manifest.yaml` 中的 `changes_summary`

**不纳入范围：**
- 不修改 pi-mcp-adapter（label 格式、description 生成、注册逻辑均不改）
- 不修改 Proxy Tool `mcp` 的行为或渲染
- 不修改 pi-tool-display 的渲染控制逻辑（`renderMcpResult` 行为不变）
- 不修改 `.pi/settings.json` 或 `capabilities.yaml`（配置无变更）
- 不涉及全局 sync

## Capabilities

### New Capabilities
- (无 — 本 change 为 fork 内缺陷修复，不引入新能力)

### Modified Capabilities
- (无 — 本 change 为 fork 内缺陷修复，不修改既有能力)

> 注：此处的 capability 列表为空，因为本次 change 属于 fork 仓库内的缺陷修复，不涉及能力层定义。按 schema 仅此一次例外。

## Impact

- 所有通过 `directTools` 暴露的 MCP 工具都将被 `mcpOutputMode` 正确控制
- Proxy Tool `mcp` 零影响（走 `name === "mcp"` 路径不变）
- 非 MCP 工具零影响（其 label 不含 "MCP" 字样）
- 用户无需改变配置或预设

## 关联绑定

- 关联 binding: `binding.md`
- 已确认项目页 / 回写目标：
  - `repo://pi-config` — 当前仓库
  - 回写目标：`forks/manifest.yaml`, `openspec/pkg-backlog.md`
