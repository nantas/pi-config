# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `https://github.com/disler/fusion-harness`（Dan Eisler 开源 fusion harness 参考实现，本次 fork 的 upstream）
  - `20-synthesis/digest/讲座/IndyDevDan/stop-picking-fuse-them-model-fusion.md`（my-wiki 内部对 fusion harness 模式的综合提炼）
- `project_page_ref`:
  - `openspec/changes/archive/2026-07-23-fusion-harness-trial/handoff-to-formal-integration.md`（trial handoff 文档，含三个正式引入疑问与建议方案）
  - `~/scratch/fusion-trial/00-trial-index.md`（trial 测试产出总索引）
  - `~/scratch/fusion-trial/runs/04-auto-validate-stop-picking/builder-glm-5.2-final-output.md`（trial 高质量产出，含原作者设计意图陈述）
  - `forks/manifest.yaml`（pi-config fork registry，本次新增 fusion-harness 条目）
- `additional_context_refs`:
  - `~/scratch/fusion-trial/fusion-harness/extensions/fusion-harness/fusion-harness.ts`（upstream 源码，fork 改动基线）
  - `~/scratch/fusion-trial/fusion-harness/extensions/fusion-harness/USER_PROMPT_FUSION_MERGE.md`（上游融合 prompt 模板）
  - `~/scratch/fusion-trial/launch-fusion-trial.sh`（trial 期间 launch 脚本，显示原 launch 方式）
  - `openspec/changes/archive/2026-07-23-fusion-harness-trial/verification.md`（trial 验证记录，含 gate 分析修正）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - pi-config `forks/manifest.yaml`（新增 fusion-harness 条目）
  - pi-config `.pi/settings.json`（新增 fusion-harness 包引用）
  - pi-config `~/.pi/agent/settings.json`（必要时清理旧全局条目）
- `writeback_owner`: pi-config 仓库
- `writeback_timing`:
  - Phase A（fork 注册）：manifest.yaml、.pi/settings.json（开发模式 local path）
  - Phase E（ship）：.pi/settings.json 切换为 git URL；如需清理全局冲突条目则同步修改 `~/.pi/agent/settings.json`
- 本次 change 不回写到 my-wiki 或任何外部仓库

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- fork 修改的代码真源在 `repo://fusion-harness`，pi-config 仅记录 fork 元数据与包引用
- `~/.pi/agent/settings.json` 的修改需同步到 pi-config `capabilities.yaml` 的 global.settings.packages
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用（upstream disler/fusion-harness + my-wiki digest）
- [x] 已确认项目页引用（trial handoff + trial index + trial 源码）
- [x] 已确认回写目标与权限（pi-config repo，本地操作无需外部权限）
- [x] 已确认异常处理与冲突策略（全局包冲突：D1a 移除并持久化覆盖记录）
