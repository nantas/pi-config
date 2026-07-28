# Writeback

> 状态：**骨架待填**（实现 + verification 完成后由 `/opsx-verify` 或手动补全执行结果）。本文件预先固化回写目标与字段映射，回写内容密度规则已内化。

## 回写摘要

- change：`fusion-output-scratch-confinement`
- 回写结论：_TBD（实现完成后填）_
- 关键结果：收紧 `/fusion` worker + fuser 产出契约 —— 所有写操作限定 `.scratch/fusion-harness/<run-id>/`，repo canonical 位禁区；worker 跑 publish-capable 工作流时按 `{{ARTIFACTS_DIR}}/{{ROLE}}/` 前缀重定位根，保留工作流内部结构与 slug；fused report 含 publish manifest 供手动 promote

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `fusion-harness-integration` | Modified | `specs/fusion-harness-integration/spec.md` | 5 个 MODIFIED Requirement：Worker Output Confinement、Worker Prompt Override Contract（删旧 identity-in-path + 删踢皮球暗示 + A/B 混合 override）、Output Boundary Statement（worker+fuser 一致）、Fusion Report Contains Publish Manifest、Non-Regression |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | _TBD_ | `verification.md` §spec-to-implementation coverage |
| Task-to-Evidence | _TBD_ | `verification.md` §task-to-evidence coverage |
| R1 override 可行性（关键） | _TBD_ | `verification.md` §R1 关键判定（before `fusion-harness-aYwYMb` / after 重跑对照） |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://fusion-harness` `extensions/fusion-harness/fusion-harness.ts` | `workerPrompt()` 函数 + Stage 1 两处 spawn | 签名新增 `artifactsDir`，spawn 传参 |
| `repo://fusion-harness` `extensions/fusion-harness/USER_PROMPT_FUSION_WORKER.md` | 整份核心段 | 删旧措辞 + 加 A/B override + slug 净化 + 分区目录模型 |
| `repo://fusion-harness` `extensions/fusion-harness/USER_PROMPT_FUSION_MERGE.md` | OUTPUT CONTRACT + 边界声明 | 加输出边界对齐 + OUTPUT CONTRACT 第 3 项 publish manifest |
| pi-config `forks/manifest.yaml` | fusion-harness 条目 `changes_summary` | 追加本 change 版本摘要（沿用 v0.x.y 序列，紧接 v0.2.3） |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `repo://fusion-harness` 三处文件 | _TBD_ | _TBD_ | _TBD_ | fork commit + push 后填 commit hash |
| pi-config `forks/manifest.yaml` | _TBD_ | _TBD_ | _TBD_ | 版本摘要追加后填 |

## 回写前置条件

- [ ] 已读取 `spec_standard_ref`（`openspec/specs/fusion-harness-integration/spec.md`）
- [ ] `verification.md` 已生成且无阻塞项（R1 override 实测结论为成功）
- [ ] 回写目标页已确认存在且可编辑（`repo://fusion-harness` 本地克隆 `/Users/nantasmac/projects/forks/fusion-harness` 可写）
- [ ] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
- 不处理全局安装副本 `~/.pi/agent/git/github.com/nantas/fusion-harness/`（由 managed sync 后续更新，不在本 change 范围）
