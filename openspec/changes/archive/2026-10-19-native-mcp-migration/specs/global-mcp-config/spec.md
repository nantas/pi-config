# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-mcp-config`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 重写为 Pi 1.3.0 原生 MCP 行为规范；含 gitnexus 迁入（direct）、serena 保留（codemode）、`-builtin:mcp` 残留修复经验

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: mcp-server-entries
`.pi/agent/mcp.json` MUST 是用户级 MCP server 配置的唯一仓内真源，MUST 使用 Pi 原生 `mcpServers` 格式，并经 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/mcp.json`。当前条目集 MUST 为 `serena` 与 `gitnexus`，条目增删属于 capabilities manifest 治理范围内的变更。

#### Scenario: sync 后全局配置与仓内一致
- **WHEN** `scripts/sync-pi-agent.sh` 运行完成
- **THEN** `~/.pi/agent/mcp.json` 与 `.pi/agent/mcp.json` 内容一致，`mcpServers` 恰含 `serena` 与 `gitnexus`

#### Scenario: 新 Pi session 加载原生 MCP
- **WHEN** 全局配置未包含禁用内建 MCP 的 settings 键，且一个新 Pi session 启动
- **THEN** 内建 MCP 扩展加载，`gitnexus` 工具以 `mcp__gitnexus__*` 直调形式声明，`serena` 出现在系统提示 mcp_servers 段

## ADDED Requirements

### Requirement: native-entry-format
每个 server 条目 MUST 使用 Pi 原生字段（`command`/`args`/`env` 或 `url`/`headers`）；工具可见性 MUST 用 `exposure`（`codemode` 为默认、`direct`/`deferred`/`hidden` 显式声明）表达，MUST NOT 使用适配器专属字段（如 `directTools`）。`gitnexus` MUST 为 `exposure: "direct"`；`serena` 保持默认 codemode。

#### Scenario: exposure 审查
- **WHEN** 审查者检查 `.pi/agent/mcp.json`
- **THEN** `gitnexus` 条目含 `"exposure": "direct"`，`serena` 条目无 exposure 字段（默认 codemode），且无任何适配器专属字段

### Requirement: no-adapter-shadowing
全局运行时 MUST NOT 安装任何注册 `/mcp` 命令或以 `-builtin:mcp` 之类条目禁用内建 MCP 的扩展；`~/.pi/agent/settings.json` MUST NOT 含禁用内建 MCP 的 `extensions` 条目。

#### Scenario: settings 残留审计
- **WHEN** MCP 不加载或 `pi mcp list` 与 session 内工具集不一致
- **THEN** 首查 `~/.pi/agent/settings.json` 的 `extensions` 键是否残留禁用条目（适配器卸载不自动还原）；存在即删除，manifest 无需声明该键（sync 对未声明键保留目标现状，删除后不会回填）

#### Scenario: 阻止适配器回装
- **WHEN** 有人提议重新安装 `pi-mcp-adapter` 或任何提供 `/mcp` 的扩展
- **THEN** 该提议被拒绝，因为它会整体遮蔽内建 MCP 支持

### Requirement: project-level-configs
项目级 MCP server MUST 定义在各项目自己的 `.pi/mcp.json`（原生格式，需项目 trust）；仓库根 `.mcp.json` 仅供其他客户端消费，Pi MUST NOT 依赖它。下游项目的迁移状态见 `openspec/pkg-backlog.md` 2026-10-19 removal 记录。

#### Scenario: 项目 session 加载项目级 server
- **WHEN** 在已授予 project trust 的项目（如 neonspark）启动 Pi session
- **THEN** 该项目 `.pi/mcp.json` 中的 server（如 mcp-unity、gitnexus、cloudbase）按各自 exposure 连接并可调用

## REMOVED Requirements

### Requirement: web-search-prime-only
**Reason**: 旧 delta 要求"只保留 web-search-prime、移除 serena"与现实相反且从未落地为现行规范
**Migration**: 以 MODIFIED `mcp-server-entries`（serena + gitnexus）为准
