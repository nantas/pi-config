# Writeback

## 回写摘要

- change：fff-replace-serena-grep-find
- 回写结论：所有变更均在 pi-config 仓库内完成，无外部回写目标
- 关键结果：serena MCP 全局移除，fff 成为默认检索工具，4 个 agent tools 已适配

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| fff-retrieval | New | specs/fff-retrieval/spec.md | 基于 ffgrep/fffind 的全局默认检索指导：决策表、使用原则、反模式、编辑工作流 |
| global-agent-guidance | Modified | specs/global-agent-guidance/spec.md | AGENTS.md 删除 Grep/Find+LSP sections，新增 fff section，委派表改为信息掌握度驱动 |
| global-mcp-config | Modified | specs/global-mcp-config/spec.md | mcp.json 移除 serena 条目 |
| global-agent-definitions | Modified | specs/global-agent-definitions/spec.md | 4 个 agent tools: grep→ffgrep, find→fffind |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 全部 requirements 实现并通过 | verification.md Spec-to-Implementation Coverage 表 |
| Task-to-Evidence | 23/23 tasks 完成 | verification.md Task-to-Evidence Coverage 表 |

## 回写目标与字段映射

无外部回写目标。所有变更文件均在 pi-config 仓库内：

| 变更文件 | 同步方式 |
| --- | --- |
| `.pi/agent/AGENTS.md` | sync-pi-agent.sh → `~/.pi/agent/AGENTS.md` |
| `.pi/agent/mcp.json` | sync-pi-agent.sh → `~/.pi/agent/mcp.json` |
| `.pi/capabilities.yaml` | sync-pi-agent.sh 读取清单 |
| `.pi/agents/*.md` | sync-pi-agent.sh → `~/.pi/agent/agents/` |

## 回写执行结果

| 目标 | 执行结果 | 执行时间 | 执行人 | 结果说明 |
| --- | --- | --- | --- | --- |
| ~/.pi/agent/ (全局同步) | 成功 | 2026-06-06 | agent | sync-pi-agent.sh 执行成功，自动 Removed stale skill |
| git commit | 成功 | 2026-06-06 | agent | commit 623bc85 |

## 回写前置条件

- [x] 已确认无外部标准页引用（binding.md 已声明）
- [x] `verification.md` 已生成且无阻塞项
- [x] 全局同步已执行并验证通过
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 proposal.md、design.md、specs/*/spec.md、tasks.md 正文
- 不写与本次 change 无关的历史信息
