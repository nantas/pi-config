# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `https://github.com/disler/fusion-harness`（upstream，fork 行为真源由本 change 的 spec delta 定义）
  - `repo://fusion-harness`（pi-config 已 fork 的 active 源，本次改动的落地目标）
- `project_page_ref`:
  - `openspec/changes/archive/2026-07-23-fusion-harness-trial/handoff-to-formal-integration.md`（trial handoff，疑问 2「跨命令 artifact 流转」的发源）
  - `forks/manifest.yaml`（fusion-harness fork 条目，`changes_summary` 需追加本次 v0.2.0）
- `additional_context_refs`:
  - `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts`（fork 主体实现，含 `/fusion` handler、`fuserPrompt`、`mkArtifacts`、per-role session 机制）
  - `repo://fusion-harness extensions/fusion-harness/USER_PROMPT_FUSION_MERGE.md`（fuser merge 模板，merge-only 模式直接复用）
  - `repo://fusion-harness extensions/fusion-harness/housekeep.ts`（run-index.jsonl 写入逻辑，路径解析约定来源）
  - `openspec/changes/archive/2026-07-24-fusion-housekeep/`（housekeep change，`run-index.jsonl` + archive 生命周期，路径命名的上下游约定）

## Source of Truth

- 行为规范真源：`specs/fusion-merge-existing/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据；fusion-harness 仓库源码是 spec 的落地形态，但行为边界由本 change 的 spec 定义

## 回写目标

- `writeback_targets`:
  - `repo://fusion-harness`（fork 源码：`/fusion` handler 增加 merge-only 分支、相关 banner/panel 语义、`summary.json` 记录 merge-only run）
  - pi-config `forks/manifest.yaml`（`fusion-harness` 条目的 `changes_summary` 追加本次改动摘要，`last_upstream_sync` 保持不变）
  - pi-config `.pi/settings.json`（若 fork 版本 pin 需更新——当前无 pin，按 global-delivery 约定维持无 pin）
- `writeback_owner`: pi-config 仓库（fork 元数据）+ repo://fusion-harness（代码落地）
- `writeback_timing`:
  - Phase A-D（实现 + 本地测试）：fork clone 内修改 + 测试
  - Phase E（ship）：fork commit + push + tag（v0.2.0），pi-config manifest.yaml 更新摘要；若用户确认执行 `scripts/sync-pi-agent.sh` 则同步到 `~/.pi/agent/`
- 本次 change 不回写到 my-wiki 或任何外部仓库

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- fork 代码改动真源在 `repo://fusion-harness`，pi-config 仅记录 fork 元数据与包引用
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明
- merge-only 模式复用 `fuserPrompt` 既有逻辑，若 fuser 模板后续变更（见 change 2 `fusion-dual-stage-gate` 计划），需评估对 merge-only 路径的影响

## 待确认项

- [x] 已确认标准页引用（upstream disler/fusion-harness + fork active 源）
- [x] 已确认项目页引用（trial handoff + manifest + fork 源码关键路径）
- [x] 已确认回写目标与权限（fork clone 可写 + pi-config manifest）
- [x] 已确认异常处理与冲突策略（见 design 异常处理节：缺失文件、半成功 run、路径歧义）
