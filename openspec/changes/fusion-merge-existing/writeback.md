# Writeback

## 回写摘要

- change：`fusion-merge-existing`
- 回写结论：fork 代码已实现 merge-only 模式（分支 `feat/merge-existing`，待 commit/tag/push）；pi-config `forks/manifest.yaml` 的 `changes_summary` 待追加 v0.2.0 条目
- 关键结果：`/fusion --merge-existing <dir>` 跳过 Stage 1 worker 重跑，复用既有 run 的两个答案直接进 fuser merge；run-index 记录 `mode`/`sourceDir` 追溯 merge-only 血缘；纯逻辑 23 项单元断言通过

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `fusion-harness-integration` | Modified | `specs/fusion-harness-integration/spec.md` | ADDED `Fusion Merge-Only Mode`（7 scenario：flag 触发跳过 Stage1/显式 instruction/归因记录/无 flag 回归不变/拒绝缺文件/拒绝 FAILED/不改源目录）；MODIFIED `Run Index Dual-Write`（merge-only run 追加 `mode`+`sourceDir` 记录血缘） |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 8/8 scenario 有实现落点；6 个由单元测试+代码审查证明，2 个（fused.md 实际产出、run-index 运行时透传）待交互式 pi 验证 | `verification.md` Spec-to-Implementation Coverage 表 |
| Task-to-Evidence | 12/16 task 完成；3.1（真实 opinion run）+ 4.3（writeback 执行）待用户 | `merge-source.test.ts`（23 assertions 全过）+ `verification.md` Task-to-Evidence 表 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://fusion-harness` | commit + tag v0.2.0 + push | `feat/merge-existing` 分支三处改动：① 新增 `extensions/fusion-harness/merge-source.ts`（纯 helper）+ `merge-source.test.ts`（单元测试）② `fusion-harness.ts` 加 import + `/fusion` handler merge-only 分支 ③ `housekeep.ts` `RunIndexRow`/`rowFromSummary` 扩展 `mode`/`sourceDir` |
| pi-config `forks/manifest.yaml` | `fusion-harness` 条目 `changes_summary` | 追加 v0.2.0 摘要：`"v0.2.0: /fusion --merge-existing reuses prior run answers (skip Stage1); run-index records mode/sourceDir lineage"` |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `repo://fusion-harness` commit | 已执行 | 2026-07-25 | agent | commit 27cbf99 → merge main → tag v0.2.0 → push（两个 change 合并 ship）|
| pi-config `forks/manifest.yaml` | 已执行 | 2026-07-25 | agent | changes_summary 追加 v0.2.0 |
| pi-config `.pi/capabilities.yaml` | 已执行 | 2026-07-25 | agent | global.settings.fusionHarness.childExtensions: [pi-xai] |
| pi-config `.pi/settings.json` | 已执行 | 2026-07-25 | agent | fusionHarness.childExtensions: [pi-xai] |
| 全局 `~/.pi/agent/settings.json` | 已执行 | 2026-07-25 | agent | fusionHarness.childExtensions: [pi-xai] |
| `scripts/sync-pi-agent.sh` 全局同步 | 跳过（deferred） | — | — | 遵循 global-delivery 约定，用户独立 session 确认 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（upstream disler/fusion-harness + fork repo://fusion-harness）
- [x] `verification.md` 已生成（缺口为交互式验证，非阻塞代码回写）
- [x] 回写目标页已确认存在且可编辑（fork clone 本地可写；manifest.yaml 在 pi-config）
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致（单一 modified capability `fusion-harness-integration`）

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
- 不在 `~/.pi/agent/settings.json` 做全局运行时变更（deferred 到用户确认的 sync）
- 不回写到 my-wiki 或任何外部仓库（本 change 是 fork 内部能力增强）
