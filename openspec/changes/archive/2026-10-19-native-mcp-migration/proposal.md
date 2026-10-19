# Proposal: native-mcp-migration

## 问题定义

pi 1.3.0 起内建原生 MCP 支持。曾作为 Pi 侧 MCP 桥接方案的 `npm:pi-mcp-adapter` 已于 2026-10-19 卸载（见 `openspec/pkg-backlog.md` removal 记录），但两份现有 spec 仍描述适配器时代的行为：

- `pi-mcp-shared-bridge`：规定以仓库根 `.mcp.json` 为共享真源、经 `pi-mcp-adapter` 桥接、proxy tool 优先——全部前提已失效，原生 Pi 不读仓库根 `.mcp.json`，适配器不再安装。
- `global-mcp-config`：现行文本是一份陈旧 delta（要求"移除 serena、只留 web-search-prime"），与运行时现实完全相反（serena 在用，web-search-prime 未配置）。

spec 与现实的偏差会误导后续变更与读者，需要将 MCP 配置治理规范收敛到原生实现的真实行为上。

## 范围边界

- 覆盖：Pi 原生 MCP 的配置真源（用户级 `~/.pi/agent/mcp.json` 由仓内 `.pi/agent/mcp.json` 同步、项目级 `.pi/mcp.json`）、server 条目治理、exposure 语义、适配器能力（跨客户端导入、`mcp({})` gateway、npx 缓存、project-approval）正式废弃。
- 不覆盖：各下游项目（neonspark 等）`.pi/mcp.json` 的具体条目内容（已在迁移时落地，属于项目事务）；`mcp.json` 条目与 capabilities manifest 的同步机制（由 `global-mcp-config` 现有 sync 边界约束承接）。

## Capabilities

- New Capabilities:（无）
- Modified Capabilities:
  - `global-mcp-config`: 全局 MCP 配置以 Pi 原生 `mcpServers` 格式为真源，覆盖适配器时代的旧 delta；含 gitnexus 迁入与 exposure 约定
  - `pi-mcp-shared-bridge`: 整体移除——共享桥接前提（适配器、仓库根 `.mcp.json` 为 Pi 所读）不复存在

## Impact

- `openspec/specs/global-mcp-config/spec.md`：重写为原生行为规范
- `openspec/specs/pi-mcp-shared-bridge/`：目录移除
- `CONTEXT.md`：OpenSpec 索引「MCP 配置」域 slug 更新（archive 阶段回写）
- `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`：项目页摘要回写（archive 阶段）
- 运行时与配置文件（`.pi/agent/mcp.json`、capabilities.yaml、其他项目 `.pi/mcp.json` 等）已在 2026-10-19 迁移完成，本 change 只收敛规范文档，不产生新的运行时变更。

## 关联绑定

见 `binding.md`：spec standard `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`；行为规范真源为 specs delta；回写目标 CONTEXT.md 与 orbitos 项目页。

## 待确认项

- 无（capability 归属明确：一个修改、一个移除）
