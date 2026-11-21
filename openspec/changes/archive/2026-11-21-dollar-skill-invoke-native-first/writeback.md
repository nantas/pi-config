# Writeback

## 回写摘要

- change：`dollar-skill-invoke-native-first`
- 回写结论：完成并归档（`repo-settings-unchanged`、`global-sync-confirmed-and-run`）
- 关键结果：首个 `$skill-name` 通过 `input` 事件原生重写为 `/skill:<name>`（句首单 skill 移除句首 token），第 2..N 个及绕过 `input` 路径的 `$skill-name` 通过 `context` 事件配合 `parseSkillBlock()` 去重注入；补齐按需扫描、包 skill 回退索引、`parseFrontmatter()` YAML 解析与 Pi 1.6.0 `triggerCharacters: ["$"]` 自动触发补全，并已同步至全局 `~/.pi/agent/extensions/dollar-skill-invoke.ts`。

## Capability / Spec 增量摘要

| Capability | 变更类型（New/Modified/Removed/Renamed） | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `dollar-skill-invoke` | Modified | `openspec/specs/dollar-skill-invoke/spec.md` | 新增 `First Dollar Skill Native Rewrite via Input Event` 与 `Dollar Autocomplete Auto-Trigger Characters`；更新 `Dollar Skill Token Expansion`、`Context Event Message Injection`、`Skill Discovery with Stale Runtime Defense`、`Filesystem Skill Index Build on Session Start` |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | PASS（6/6 Requirements 全覆盖） | `verification.md`（Pi 1.6.0 真实运行时 6 组端到端验证 PASS 1–6） |
| Task-to-Evidence | PASS（全部实现、验证与全局同步任务完成） | `verification.md` + `.pi/extensions/dollar-skill-invoke.ts` + `./scripts/sync-pi-agent.sh`（`diff -q` 一致） |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `openspec/specs/dollar-skill-invoke/spec.md` | Requirements（ADDED / MODIFIED） | 通过 `openspec archive` 将 delta spec 合并至主规范文件 |

## 回写执行结果

| 目标页 | 执行结果（成功/失败/跳过） | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `openspec/specs/dollar-skill-invoke/spec.md` | 成功 | 2026-11-21 | agent | 随 `openspec archive dollar-skill-invoke-native-first --yes` 合并 delta spec 到主 spec |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（`openspec/specs/dollar-skill-invoke/spec.md`）
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
