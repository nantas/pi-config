# Verification

## 验证结论

通过。spec delta 与运行时现实一致；`pi-mcp-shared-bridge` 移除条件成立；无缺口。

Closeout 记录：
- repo-settings：`repo-settings-unchanged`（项目 `.pi/settings.json` 未触及；managed 面改动为 `.pi/agents/unity-worker.md`、`.pi/agent/mcp.json`、`.pi/agent/AGENTS.md`、`.pi/capabilities.yaml`）
- global-sync：`global-sync-confirmed-and-run`（2026-10-19 用户确认后执行 `scripts/sync-pi-agent.sh`；含后续 `-builtin:mcp` 残留修复）

## Spec-to-Implementation Coverage

| Requirement | 覆盖证据 |
| --- | --- |
| global-mcp-config / mcp-server-entries | `~/.pi/agent/mcp.json` 与 `.pi/agent/mcp.json` 一致，恰含 serena + gitnexus；`pi --print` 实测 gitnexus 8 个 direct 工具声明、serena 在 mcp_servers 段 |
| global-mcp-config / native-entry-format | `.pi/agent/mcp.json` 中 gitnexus 有 `"exposure": "direct"`，serena 无 exposure 字段，无适配器专属字段 |
| global-mcp-config / no-adapter-shadowing | `~/.pi/agent/settings.json` 的 `extensions: ["-builtin:mcp"]` 已删除；`pi list`/settings 无 pi-mcp-adapter 残留 |
| global-mcp-config / project-level-configs | neonspark `pi mcp list`：mcp-unity（direct, 78 tools）、gitnexus（direct, 8 tools）、cloudbase（codemode, 42 tools）全部连接 |
| pi-mcp-shared-bridge / 整体移除 | 六条 requirement 前提均失效：适配器已卸载（removed 43 packages）、原生不读仓库根 `.mcp.json`（官方 mcp.md）、`.pi/agent/mcp.json` 已纳入 sync（capabilities `mcp_config: true`） |

## Task-to-Evidence Coverage

| Task | 证据 |
| --- | --- |
| 1.1 / 1.2 spec 核对 | specs/ 下两份 delta，requirement 与运行时一一对照 |
| 2.1 运行时迁移 | `openspec/pkg-backlog.md` 2026-10-19 removal 记录；neonspark/neonnew/art-data `.pi/mcp.json` |
| 2.2 `-builtin:mcp` 修复 | 修复前 `extensions: ["-builtin:mcp"]` → 修复后键不存在；`pi --print` 恢复 MCP 工具声明 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 官方文档 | `repo://pi-mono` packages/coding-agent/docs/mcp.md | native-entry-format、pi-mcp-shared-bridge 移除依据 |
| 运行时验证 | `pi mcp list`（/tmp + neonspark）、`pi --print`（2026-10-19） | mcp-server-entries、project-level-configs |
| 决策记录 | `openspec/pkg-backlog.md`（2026-10-19 npm:pi-mcp-adapter 移除） | no-adapter-shadowing |
| 配置真源 | `.pi/agent/mcp.json`、`.pi/capabilities.yaml` | mcp-server-entries |

## 缺口与阻塞项

无。注：neonspark 报障源于修复前启动的 session，重启即恢复，非缺口。
