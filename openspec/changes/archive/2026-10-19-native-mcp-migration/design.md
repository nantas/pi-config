# Design

## Context

2026-10-19 已完成 pi-mcp-adapter 卸载与原生 MCP 迁移（运行时 + 配置 + 文档，见 `openspec/pkg-backlog.md` removal 记录）。本 change 只收敛规范文档：重写 `global-mcp-config`、移除 `pi-mcp-shared-bridge`。迁移过程中发现并修复了一处运行时残留（`~/.pi/agent/settings.json` 的 `"extensions": ["-builtin:mcp"]` 禁用内建 MCP，适配器卸载不还原），该经验已写入 spec delta 的 `no-adapter-shadowing` requirement。

## Goals / Non-Goals

**Goals:**

- spec 与运行时现实一致：两份 spec 归一为一份原生行为规范（`global-mcp-config`）
- 记录 `-builtin:mcp` 残留的排查路径，防止回退
- archive 后同步 CONTEXT.md OpenSpec 索引与 orbitos 项目页

**Non-Goals:**

- 不改任何运行时行为、配置文件或 manifest（迁移已在前一阶段完成并验证）
- 不治理下游项目 `.pi/mcp.json` 的具体条目（项目事务）

## Decisions

- **移除而非标注过时**：`pi-mcp-shared-bridge` 六条 requirement 的前提（适配器、仓库根共享真源、proxy tool）全部失效，保留只会制造"哪个是真源"的歧义。
- **验证方式写入 REMOVED 迁移说明**：`pi mcp list` 始终走内建实现，不能反映 session 内加载状态；session 级验证用 `pi --print`（本次已实测：gitnexus 8 个 direct 工具声明可见）。
- **manifest 不声明 `extensions` 键**：sync 对未声明键保留目标现状；残留已从目标删除，声明空值反而会阻止将来合法的按需禁用。

## Risks / Migration

- **风险**：将来误装注册 `/mcp` 的扩展会静默遮蔽内建支持（症状：MCP 工具消失）。已由 `no-adapter-shadowing` requirement 与 pkg-backlog "勿回装" 警示覆盖。
- **迁移**：无调用方迁移成本——spec 变更不触及运行时；`pi-mcp-shared-bridge` 的读者（历史 change 引用）在归档摘要中可追溯。
