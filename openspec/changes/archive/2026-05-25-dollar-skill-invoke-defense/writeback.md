# Writeback

## 回写摘要

- change：`dollar-skill-invoke-defense`
- 回写结论：Extension 已增加防御性修复，3 层 skill 发现 fallback + 改进的 dedup 逻辑。代码已同步到 `~/.pi/agent/`，主规范已更新。
- 关键结果：
  - 消除 `pi.getCommands()` 单点依赖
  - 新增独立文件系统 skill 索引
  - Dedup 扫描范围从 1 条扩大到 5 条

## Capability / Spec 增量摘要

| Capability | 变更类型（New/Modified/Removed/Renamed） | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| dollar-skill-invoke | Modified | `openspec/specs/dollar-skill-invoke/spec.md` | 将原 "Skill List from ResourceLoader" requirement 替换为 3 个新 requirement：Skill Discovery with Filesystem Fallback、Filesystem Skill Index Build on Session Start、Improved Dedup Scanning |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 7/7 requirements 覆盖 | `verification.md` § Spec-to-Implementation Coverage |
| Task-to-Evidence | 14/14 tasks 完成或已验证 | `verification.md` § Task-to-Evidence Coverage |
| 运行时验证 | 正常注入已验证 | `verification.md` § 3.1，`/tmp/pi-dis-debug.log` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://pi-config:.pi/extensions/dollar-skill-invoke.ts` | 完整文件 | 已修改的 extension 源代码（含 3 层 fallback 逻辑） |
| `repo://pi-config:openspec/specs/dollar-skill-invoke/spec.md` | Requirements 章节 | 3 个 MODIFIED requirements |
| `repo://pi-config:~/.pi/agent/extensions/dollar-skill-invoke.ts` | 完整文件 | 同步后的部署文件 |

## 回写执行结果

| 目标页 | 执行结果（成功/失败/跳过） | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `.pi/extensions/dollar-skill-invoke.ts` | 成功（已在本地修改） | 2026-05-25 | nantas | 本次 session 中实现 |
| `~/.pi/agent/extensions/dollar-skill-invoke.ts` | 成功（已同步） | 2026-05-25 | nantas | `scripts/sync-pi-agent.sh` 执行成功 |
| `openspec/specs/dollar-skill-invoke/spec.md` | 成功（已更新） | 2026-05-25 | nantas | 本地已更新 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/dollar-skill-invoke/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
