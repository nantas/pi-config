# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/specs/fusion-harness-integration/spec.md`（本仓 pi-config，capability = `fusion-harness-integration`）
- `project_page_ref`:
  - `forks/manifest.yaml`（fusion-harness fork 条目，记录变更摘要与版本）
  - `docs/plans/fusion-harness-followup-roadmap.md`（后续 roadmap，本 change 属其中一条未开列项的延伸）
- `additional_context_refs`:
  - 实地证据：`repo://my-wiki .scratch/fusion-harness/fusion-harness-aYwYMb/`（问题 run）+ `20-synthesis/digest/slay-the-spire-ARCHITECT-kimi-coding-k3/`、`slay-the-spire-BUILDER-grok-build/`（被污染的 canonical 位）
  - 触发工作流：`repo://my-wiki .agents/skills/ingest/game-wiki-ingest/SKILL.md`

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md`（本次 change 在其下新增 spec delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`forks/manifest.yaml` 仅记录 fork 变更摘要与版本，不替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://fusion-harness` → `extensions/fusion-harness/fusion-harness.ts`（`workerPrompt()` 签名 + Stage 1 spawn 传参）
  - `repo://fusion-harness` → `extensions/fusion-harness/USER_PROMPT_FUSION_WORKER.md`（核心 prompt 重写）
  - `repo://fusion-harness` → `extensions/fusion-harness/USER_PROMPT_FUSION_MERGE.md`（L3 对齐 + 报告结构 section）
- `writeback_owner`: 本 change 实现者（pkg-fork-dev 工作流）
- `writeback_timing`: Phase E（Commit & Ship）—— fork 仓库提交后，通过 `git:` 源回写；pi-config 侧通过 `forks/manifest.yaml` 同步 changes_summary

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- fork 版本号在 Phase E 由实现者追加（沿用 `v0.x.y` 序列，紧接当前 fork 最新版本之后）
- 本仓 `~/.pi/agent/git/github.com/nantas/fusion-harness/`（全局安装副本）在 fork ship 后由 managed sync 更新，不在本 change 直接处理

## 待确认项

- [x] 已确认标准页引用（`openspec/specs/fusion-harness-integration/spec.md`）
- [x] 已确认项目页引用（`forks/manifest.yaml` + roadmap）
- [x] 已确认回写目标与权限（`repo://fusion-harness`，已注册于 repo_registry）
- [ ] 已确认异常处理与冲突策略 —— worker override 可行性待实测验证（见 design.md「关键不确定点」），验证结果决定是否需退到工具层拦截
