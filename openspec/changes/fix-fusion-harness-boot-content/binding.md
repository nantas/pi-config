# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/specs/fusion-harness-integration/spec.md`（现有能力域 `fusion-harness-integration`，本 change 修订其 "Boot Banner Context Hygiene" requirement）
- `project_page_ref`: `forks/manifest.yaml`（fork 变更记录）、`openspec/pkg-backlog.md`（fork 修改记录）
- `additional_context_refs`: `CONTEXT.md`（OpenSpec 索引，归档后如新增能力域需更新）；`.pi/skills/pkg-fork-dev/SKILL.md`（开发过程约束来源，非行为规范）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据；`pkg-fork-dev` skill 文件仅约束开发流程（Phase C0/D0/E 门禁、dedup、回写时序），不定义产品行为

## 回写目标

- `writeback_targets`:
  - `repo://fusion-harness` → fork 仓库（commit + tag + push，由 pkg-fork-dev Phase E 执行）
  - `forks/manifest.yaml` → `changes_summary` 追加本次修改描述
  - `openspec/pkg-backlog.md` → 追加 fork modification 记录
- `writeback_owner`: 执行 `/opsx-apply` 的 agent session
- `writeback_timing`: pkg-fork-dev Phase E（Commit & Ship）完成、门禁通过后；fork 仓库回写走 git push，pi-config 内回写走文件编辑

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用（fusion-harness-integration spec 现存 "Boot Banner Context Hygiene" requirement 即修订对象）
- [x] 已确认项目页引用（manifest + backlog 均为既有 fork 治理页面）
- [x] 已确认回写目标与权限（fork push 需要用户 GitHub 凭据；git push 失败时按 pkg-fork-dev E3a 门禁中断）
- [x] 已确认异常处理与冲突策略（门禁失败 → 中断并报告；push 失败 → 重试或中断）
