# Writeback

## 回写摘要

- change：`fix-dollar-skill-new-session-stale`
- 回写结论：修复 `/new` 后 `$skill-name` 注入失败的回归问题，通过在 `getSkills()` 中增加 stale runtime 防御
- 关键结果：`getSkills()` try-catch `pi.getCommands()` 失败时降级到 `_fileSystemSkillIndex`

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| dollar-skill-invoke | Modified | `openspec/specs/dollar-skill-invoke/spec.md` | "Skill Discovery with Filesystem Fallback" → "Skill Discovery with Stale Runtime Defense"，新增 stale runtime 异常降级 scenario |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | ✅ 6/6 scenario 有实现路径 | `verification.md` |
| Task-to-Evidence | ✅ 核心任务完成，运行时验证待下次 session | `verification.md` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `openspec/specs/dollar-skill-invoke/spec.md` | "Skill Discovery with Filesystem Fallback" requirement | 更新 requirement 名称为 "Skill Discovery with Stale Runtime Defense"，新增 stale runtime 异常 scenario |
| `repo://pi-config:.pi/extensions/dollar-skill-invoke.ts` | `getSkills()` 函数 | 已直接修改并同步 |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明 |
| --- | --- | --- | --- | --- |
| `.pi/extensions/dollar-skill-invoke.ts` | ✅ 成功 | 2026-05-29 | agent | `getSkills()` 增加 try-catch，已 sync |
| `openspec/specs/dollar-skill-invoke/spec.md` | ⏳ 待执行 | — | agent | 需更新 "Skill Discovery" requirement |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
