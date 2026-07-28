# Verification

> 状态：**骨架待填**（实现后由 `/opsx-verify` 补全证据）。本文件预先固化验证结构与 R1 判定标准，确保实现阶段有据可循。

## spec-to-implementation coverage

| Spec Requirement | 实现落点 | 状态 | 证据 |
|---|---|---|---|
| Fusion Worker Output Confinement | `USER_PROMPT_FUSION_WORKER.md`（路径重写规则 + 分区目录模型）+ `fusion-harness.ts` `workerPrompt()` 签名传 ARTIFACTS_DIR | 待实现 | _TBD_ |
| Fusion Worker Prompt Override Contract | `USER_PROMPT_FUSION_WORKER.md`（B 优先级 + A 规则 + slug 净化 + 删旧措辞） | 待实现 | _TBD_ |
| Fusion Output Boundary Statement | `USER_PROMPT_FUSION_WORKER.md` + `USER_PROMPT_FUSION_MERGE.md` 两端一致声明 | 待实现 | _TBD_ |
| Fusion Report Contains Publish Manifest | `USER_PROMPT_FUSION_MERGE.md` OUTPUT CONTRACT 第 3 项 | 待实现 | _TBD_ |
| Non-Regression For Pure-Analysis Fusion Calls | 纯分析 `/fusion` 跑通，无分区树，manifest 缺省 | 待验证 | _TBD_ |

## task-to-evidence coverage

| Task | 完成标准 | 状态 | 证据 |
|---|---|---|---|
| T2.1.1 workerPrompt 签名 | 函数新增 artifactsDir 参数 | 待实现 | _TBD_ |
| T2.1.2 Stage1 spawn 传参 | 两处 spawn 传 artifactsDir，无裸 {{ARTIFACTS_DIR}} 残留 | 待实现 | _TBD_ |
| T2.2.1-2.2.6 worker prompt 重写 | 6 个子项全绿，渲染后含两类写位置 + ≥2 例子 | 待实现 | _TBD_ |
| T2.3.1-2.3.2 fuser 边界对齐 | worker+fuser 边界声明 diff 一致 | 待实现 | _TBD_ |
| T2.4.1-2.4.2 publish manifest | OUTPUT CONTRACT 3 项，第 3 项含 inventory + promote | 待实现 | _TBD_ |
| T2.5 非回归 | 纯分析跑无 `architect/`/`builder/` 子目录 | 待验证 | _TBD_ |

## R1 关键判定：worker override 可行性（design R1）

**判定标准**（before/after 对照）：

- **before**：`fusion-harness-aYwYMb` run → repo `20-synthesis/digest/` 出现 `slay-the-spire-ARCHITECT-kimi-coding-k3/` + `slay-the-spire-BUILDER-grok-build/` 两棵污染树，canonical `slay-the-spire/` 缺失
- **after（预期）**：重跑同 game-wiki-ingest prompt → repo `20-synthesis/digest/slay-the-spire/` 不存在；scratch `.scratch/fusion-harness/<run>/architect/synthesis/digest/slay-the-spire/` + `builder/.../slay-the-spire/` 两棵镜像树完整

**实测结论**：_TBD（实现后填）_

- ✅ override 成功 → 本 change 达标，可归档
- ❌ override 失败（repo 仍污染）→ 本 change 不达标，暂停，开 `fusion-write-path-interception` 后续 change

## 缺口

- _TBD_（实现后由 /opsx-verify 审查；当前无实现，全部为待填）
