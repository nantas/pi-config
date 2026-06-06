# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-mcp-config`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 从 .pi/agent/mcp.json 中移除 serena MCP server 条目

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: mcp-server-entries
`.pi/agent/mcp.json` 的 `mcpServers` MUST 只包含 `web-search-prime` 条目。`serena` 条目 MUST 被移除。

#### Scenario: Pi session 启动时加载 MCP 配置
- **WHEN** Pi session 启动并读取全局 mcp.json
- **THEN** 只有 `web-search-prime` 作为可用 MCP server
- **THEN** 不存在 serena 相关的进程启动或 lazy lifecycle 管理

## REMOVED Requirements

### Requirement: serena-mcp-server
**Reason**: serena LSP 功能被 fff 工具替代，不再需要 MCP server 进程
**Migration**: ffgrep/fffind 是 Pi 内置工具，无需外部进程
