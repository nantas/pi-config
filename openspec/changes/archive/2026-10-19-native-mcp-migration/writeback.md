# Writeback

## 回写摘要

- change：`native-mcp-migration`（Pi 原生 MCP 规范收敛）
- 回写结论：通过——适配器时代两份 spec 归一为 `global-mcp-config` 原生行为规范，`pi-mcp-shared-bridge` 移除
- 关键结果：pi 1.3.0 原生 MCP 接管；gitnexus 迁入用户级（direct）；`-builtin:mcp` 残留修复；下游项目 `.pi/mcp.json` 落地

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `global-mcp-config` | Modified | `openspec/specs/global-mcp-config/spec.md` | 重写为原生规范：mcp-server-entries（serena+gitnexus 真源+sync）、native-entry-format（exposure 语义、禁 directTools）、no-adapter-shadowing（禁 `/mcp` 注册扩展与 `-builtin:mcp` 残留排查）、project-level-configs（项目 `.pi/mcp.json`） |
| `pi-mcp-shared-bridge` | Removed | `openspec/specs/pi-mcp-shared-bridge/`（目录移除） | 六条 requirement 全部失效：适配器桥接、仓库根共享真源、proxy tool、Phase 1 sync 边界反转 |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 全覆盖 | `verification.md` 覆盖表；`pi mcp list` + `pi --print` 实测（2026-10-19） |
| Task-to-Evidence | 全覆盖 | `verification.md` 任务表；pkg-backlog 2026-10-19 removal 记录 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `CONTEXT.md` | OpenSpec 索引「代码检索与 MCP」表 | 「MCP 配置」行：`pi-mcp-shared-bridge`, `global-mcp-config` → 仅 `global-mcp-config` |
| `repo://orbitos` `20_项目/Pi_Config/Pi_Config.md` | 治理判断/能力位摘要 | MCP 能力位已由原生支持承接（一段结论 + 本 change 追溯入口） |

## 回写执行结果

| 目标 | 结果 | 说明 |
| --- | --- | --- |
| CONTEXT.md 索引 | 成功 | 2026-10-19「MCP 配置」行改为仅 `global-mcp-config`，执行人 agent |
| orbitos 项目页 | 成功 | 2026-10-19「当前判断」追加迁移结论段，执行人 agent |

## 回写前置条件

- verification.md 结论为通过（已满足）
- orbitos 目标路径经 `repo://orbitos` 解析（已确认：`/Users/nantas-agent/projects/obsidian-mind`）

## 不回写的内容

- spec delta 全文、design、tasks（只回写摘要与链接）
- 下游项目 `.pi/mcp.json` 条目明细（项目事务）
- pkg-backlog 记录（已有独立入口）
