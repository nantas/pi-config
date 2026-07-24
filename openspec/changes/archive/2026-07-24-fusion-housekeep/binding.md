# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `openspec/specs/fusion-harness-integration/spec.md`（已落地的 fusion-harness 正式集成行为规范）
  - `https://github.com/nantas/fusion-harness`（当前 active fork，实现改动目标仓）
- `project_page_ref`:
  - `openspec/changes/archive/2026-07-24-fusion-harness-formal-integration/handoff-to-fusion-housekeep.md`（正式集成 → housekeep 交付 handoff，含 artifact 分类与命令草图）
  - `openspec/changes/archive/2026-07-23-fusion-harness-trial/handoff-to-formal-integration.md`（trial 遗留：artifacts 生命周期不明）
  - `forks/manifest.yaml`（fusion-harness fork 注册条目）
- `additional_context_refs`:
  - `repo://fusion-harness` → `/Users/nantasmac/projects/forks/fusion-harness`（fork clone，extension 源码）
  - `repo://fusion-harness` `extensions/fusion-harness/fusion-harness.ts`（三命令 handler 与 `summary.json` 写入点）
  - `.scratch/fusion-harness/`（当前 cwd 下真实 run 样本，用于 reconcile / clean 行为验收）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md`（本 change 的 delta 扩展既有 capability）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：handoff 与 grilling 纪要不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://fusion-harness`（实现：`/fusion-housekeep`、run-index 双写、reconcile）
  - pi-config `forks/manifest.yaml`（`changes_summary` 追加 housekeep 能力摘要）
  - 如本 change 触及包版本：pi-config `.pi/settings.json` / `capabilities.yaml` 中 fusion-harness 包引用（仅版本或摘要变更时）
- `writeback_owner`: pi-config 仓库（治理与 OpenSpec）；代码真源在 `repo://fusion-harness`
- `writeback_timing`:
  - 实现与本地验证通过后：更新 fork `changes_summary` 与（如有）版本
  - ship 时：fork 推送 + pi-config 包引用对齐
- 本次 change 不回写 my-wiki、不管理 `fusion-harness-sessions/`

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 实现编辑根：`repo://fusion-harness`；pi-config 仅持 OpenSpec 产物与 fork 元数据
- 跨仓路径一律 `repo://` 解析，禁止写死机器绝对路径作为规范真源
- artifact 生命周期仅覆盖 `<cwd>/.scratch/fusion-harness/fusion-harness-*` run dir，不含 sessions 缓存

## 待确认项

- [x] 已确认标准页引用（既有 fusion-harness-integration spec + nantas fork）
- [x] 已确认项目页引用（housekeep handoff + trial handoff + manifest）
- [x] 已确认回写目标与权限（fork clone 本地可写；pi-config 元数据本地可写）
- [x] 已确认异常处理与冲突策略（index 丢失则 reconcile 重建；archived 标记随 index 丢失需重新 archive）
