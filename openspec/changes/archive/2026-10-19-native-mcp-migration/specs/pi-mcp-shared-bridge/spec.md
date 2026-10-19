# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-mcp-shared-bridge`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: removed
- 用户确认摘要: 适配器桥接前提全部失效（pi 1.3.0 原生 MCP、适配器已卸载、原生 Pi 不读仓库根 `.mcp.json`），整体移除

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- 项目页面回写不得替代本文件

## REMOVED Requirements

### Requirement: MCP Baseline Must Use Repository Root Shared Config
**Reason**: 原生 Pi 只读 `~/.pi/agent/mcp.json`（用户级）与 `.pi/mcp.json`（项目级），不读仓库根 `.mcp.json`
**Migration**: 用户级真源见 `global-mcp-config` 的 MODIFIED `mcp-server-entries`；仓库根 `.mcp.json` 降级为其他客户端的共享配置，不再是 Pi 配置来源

### Requirement: MCP Baseline Must Bridge Pi Through Pi MCP Adapter
**Reason**: `pi-mcp-adapter` 已卸载；任何注册 `/mcp` 的扩展都会遮蔽内建支持
**Migration**: Pi 直接消费 mcp.json，无桥接层；见 `global-mcp-config` 的 ADDED `no-adapter-shadowing`

### Requirement: MCP Baseline Must Start With A Minimal GitNexus Sample
**Reason**: gitnexus 已从"样例验证"转为正式条目，治理收敛进用户级配置
**Migration**: 见 `global-mcp-config` 的 MODIFIED `mcp-server-entries`（gitnexus, exposure: direct）

### Requirement: MCP Baseline Must Keep Shared Resources Outside Phase 1 Sync
**Reason**: `.pi/agent/mcp.json` 现已纳入 sync 管理（capabilities manifest `mcp_config: true`），该边界要求被现实反转
**Migration**: sync 边界以 `.pi/capabilities.yaml` `global.settings`/`mcp_config` 声明为准

### Requirement: MCP Baseline Must Prefer Proxy Tool Access First
**Reason**: 适配器 `mcp({})` proxy 工具随卸载消失；原生按 exposure 语义直调或经 tool_search/codemode
**Migration**: 见 `global-mcp-config` 的 ADDED `native-entry-format`

### Requirement: MCP Baseline Must Define A Verifiable Pi Usability Loop
**Reason**: 原验证环（经适配器桥接验证 gitnexus）失效；原生下验证方式更直接
**Migration**: 验证 = 新 session 中 `mcp__gitnexus__*` 工具声明可见（`pi --print` 或 `pi mcp list`，注意后者始终走内建实现、不能反映 session 内加载状态）
