# Writeback

## 回写摘要

- change：`notion-skill-safe-replace`
- 回写结论：notion skill 增加子页面安全的全量内容替换路径，并修正文档误导；实现已验证，全局 sync 待确认
- 关键结果：`ntn-write --safe-replace` 走 `update_content`；SKILL.md 三处引导；在线 identical 回归通过

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `notion` | Modified | `openspec/changes/notion-skill-safe-replace/specs/notion/spec.md` | 扩展 `ntn-write-props-and-content`（`--safe-replace` 与边界）；新增 `skill-docs-replace-guidance`、`ntn-write-safe-replace-implementation-constraints` |

归档后将 sync 入主 spec：`openspec/specs/notion/spec.md`。

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | PASS | `verification.md` 覆盖表 |
| Task-to-Evidence | PASS（sync 待用户） | `verification.md` task 表；在线 `changes:0` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` | 当前阶段摘要 / change 记录 | 结论、状态、交付物、验证结果（不复制整份 artifact） |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| 项目进度总览.md | 成功 | 2026-07-24 | pi-config agent | 追加 change 摘要条目 |
| `~/.pi/agent` sync | 跳过 | 2026-07-24 | — | 需用户确认后执行 `scripts/sync-pi-agent.sh` |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（binding 已绑定）
- [x] `verification.md` 已生成且无阻塞实现缺口（仅 sync 待确认）
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 proposal/design/specs/tasks
- 不写 handoff/fusion 原始全文
- 不在本回写中声明全局 skill 已同步
