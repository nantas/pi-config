# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `openspec/specs/fusion-harness-integration/spec.md`（fusion-harness 行为规范真源；本次新增 Boot Banner 上下文卫生要求）
  - `openspec/specs/capability-manifest/spec.md`（包注册与能力表语义）
- `project_page_ref`:
  - `forks/manifest.yaml`（fusion-harness fork 注册条目：`fork_url`、`upstream_source`、`changes_summary`）
  - `~/.pi/agent/git/github.com/nantas/fusion-harness/extensions/fusion-harness/fusion-harness.ts`（本次实现编辑目标，fork clone 路径）
  - `~/.pi/agent/settings.json`（`global.settings.packages` 中 `git:github.com/nantas/fusion-harness` 的全局分发形态）
- `additional_context_refs`:
  - `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/messages.d.ts`（pi 本体 `CustomMessage` / `convertToLlm` 语义：`display` 仅控 TUI 渲染，不阻断上下文注入）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md`（本 change 的 delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：fork clone 源码、pi 本体类型定义、manifest 条目不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - fork 源码：`~/.pi/agent/git/github.com/nantas/fusion-harness/extensions/fusion-harness/fusion-harness.ts`（boot banner 消息 content 改为空字符串）
  - fork 元数据：`forks/manifest.yaml` 追加一行 `changes_summary`（记录本次修复）
  - 不回写 pi-config 能力表（`global.settings.packages` 源字符串不变）
  - 不执行全局 `scripts/sync-pi-agent.sh`（源码修复随下次 `pi install` / 包刷新自然生效；全局 sync 延后）
- `writeback_owner`: pi-config 仓库（fork 治理方）
- `writeback_timing`:
  - apply 完成并在 fork clone 内验证 boot banner 不再注入上下文后写入源码
  - manifest `changes_summary` 与源码同 commit 更新

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 实现编辑根：仅 fusion-harness fork clone 源码 + forks/manifest.yaml；禁止本 change 改 pi 本体、pi-config 能力表或全局 settings.json
- package 源字符串保持 `git:github.com/nantas/fusion-harness`（无版本 pin）
- 全局运行时同步需用户显式确认；本 change 仅修源码，不代跑 sync

## 待确认项

- [x] 已确认标准页引用（fusion-harness-integration + capability-manifest）
- [x] 已确认项目页引用（manifest + fork clone 路径 + pi 本体 convertToLlm 语义）
- [x] 已确认回写目标与权限（fork clone 本地可写；全局 sync 延后）
- [x] 已确认异常处理与冲突策略（源码修复随包刷新生效；不触碰 pi 本体）
