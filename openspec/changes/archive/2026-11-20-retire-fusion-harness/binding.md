# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `openspec/specs/fusion-harness-integration/spec.md`（capability = `fusion-harness-integration`）
  - `openspec/specs/capability-manifest/spec.md`（capability = `capability-manifest`，其中 fusion 专属 requirement 一并移除）
- `project_page_ref`:
  - `forks/manifest.yaml`（fusion-harness fork 条目状态从 `active` 改为 `archived`）
  - `CONTEXT.md`（OpenSpec 索引中 `fusion-harness-integration` 行）
  - `openspec/pkg-backlog.md`（2026-11-10 fusion-harness 停用记录，保留并追加本次清理结果）
- `additional_context_refs`:
  - `docs/plans/fusion-harness-followup-roadmap.md`（历史 roadmap，本次不改写，只在其中标注已退役）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md` 与 `specs/capability-manifest/spec.md` 两份 delta
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`forks/manifest.yaml` 与 backlog 只记录状态与决策，不替代 spec delta

## 回写目标

- `writeback_targets`:
  - `openspec/pkg-backlog.md`（2026-11-10 条目追加清理完成说明）
  - `forks/manifest.yaml`（fusion-harness 条目 `status: archived`）
  - `CONTEXT.md`（移除 `fusion-harness-integration` 索引引用）
- `writeback_owner`: 本 change 实现者
- `writeback_timing`: 实现与验证完成后、归档前

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态与摘要，不复制 spec 正文
- 本 change 不触碰 `docs/plans/fusion-harness-followup-roadmap.md` 的历史内容

## 待确认项

- [x] 已确认标准页引用（两份 capability spec）
- [x] 已确认项目页引用（forks manifest、CONTEXT.md、pkg-backlog）
- [x] 已确认回写目标与权限（本仓内文件）
- [x] 已确认异常处理与冲突策略：恢复路径写入 `openspec/pkg-backlog.md`，可从 `git:github.com/nantas/fusion-harness` 重装
