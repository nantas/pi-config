# Writeback

## 回写摘要

- change：`remove-pi-snap-edit-global`
- 回写结论：成功完成，无外部回写目标
- 关键结果：`pi-snap-edit` 从全局能力彻底移除（manifest + settings.json + node_modules）；AGENTS.md 恢复原生 edit 指导；ADR 0010 撤销 0009

## Capability / Spec 增量摘要

| Capability | 变更类型（New/Modified/Removed/Renamed） | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `global-agent-guidance` | Modified | `specs/global-agent-guidance/spec.md` | AGENTS.md 编辑工具指导从 snap-edit 回退到原生 edit（三项自检硬约束），fff 编辑工作流表恢复原生映射；snap-edit 指导 REMOVED |
| `capability-manifest` | Modified | `specs/capability-manifest/spec.md` | 从 global.settings.packages 移除 npm:pi-snap-edit；新增 node_modules 清理 requirement |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 全部 requirement 已实现并验证 | `verification.md` Spec-to-Implementation Coverage 表 |
| Task-to-Evidence | 17/17 task 完成 | `verification.md` Task-to-Evidence Coverage 表 |
| Runtime 同步 | sync + pi remove 均成功 | settings.json 无 snap-edit；`find ~/.pi -iname "*snap-edit*"` 空 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| 无外部回写目标 | — | 本次为仓库内全局配置变更，所有变更已在 pi-config 仓库内完成并提交 |

## 回写执行结果

| 目标页 | 执行结果（成功/失败/跳过） | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `~/.pi/agent/settings.json`（runtime 同步） | 成功 | 2026-07-03 | agent | `scripts/sync-pi-agent.sh` 执行，settings.json packages 数组无 snap-edit |
| `~/.pi/agent/npm/node_modules`（runtime 清理） | 成功 | 2026-07-03 | agent | `pi remove npm:pi-snap-edit` 执行，"removed 1 package"，find 无残留 |
| `~/.pi/agent/AGENTS.md`（runtime 同步） | 成功 | 2026-07-03 | agent | sync 脚本同步，全局 AGENTS.md 无 snap-edit 残留 |
| 外部项目页回写 | 跳过 | — | — | binding 声明无外部回写目标 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（无外部标准页）
- [x] `verification.md` 已生成且无阻塞项（新 session 工具列表验证为待用户执行项，不阻塞）
- [x] 回写目标页已确认存在且可编辑（runtime 路径已确认）
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
