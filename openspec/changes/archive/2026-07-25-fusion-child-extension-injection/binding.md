# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `https://github.com/disler/fusion-harness`（upstream）
  - `repo://fusion-harness`（fork active 源，本次改动落地目标）
- `project_page_ref`:
  - `openspec/changes/fusion-merge-existing/design.md`（同期 change，同改 runChild spawn 路径，需协调）
  - `forks/manifest.yaml`（fusion-harness fork 条目，changes_summary 追加 v0.2.1）
- `additional_context_refs`:
  - `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts:466-484`（runChild args 组装段，`--no-extensions` 所在）
  - `repo://pi-xai xai-provider.ts:125`（`api.registerProvider("grok-build")`，证明 grok-build 是扩展运行时注册）
  - `repo://pi-mono packages/ai/src/utils/oauth/index.ts:45`（内置 OAuth provider 只有 anthropic/github-copilot/openai-codex，grok-build 不在其中）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-integration/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://fusion-harness`（fork 源码：runChild args 追加 `-e` 注入逻辑 + 扩展路径解析）
  - pi-config `forks/manifest.yaml`（changes_summary 追加 v0.2.1）
  - pi-config `.pi/capabilities.yaml`（global.settings.fusionHarness 追加 `childExtensions` 默认值）
  - pi-config `.pi/settings.json`（项目级 fusionHarness 追加 `childExtensions`）
- `writeback_owner`: pi-config 仓库 + repo://fusion-harness
- `writeback_timing`:
  - 实现 + 测试：fork clone 修改
  - ship：fork commit/push/tag + pi-config 配置更新
- 本次 change 不回写到 my-wiki 或外部仓库

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接
- fork 代码改动真源在 `repo://fusion-harness`
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明
- 本 change 与 `fusion-merge-existing` 同改 fusion-harness.ts 的 spawn 区域，需在同一分支累积或协调 commit 顺序

## 待确认项

- [x] 已确认标准页引用（upstream + fork + pi-xai + pi-mono 证据）
- [x] 已确认项目页引用（merge-existing design + manifest）
- [x] 已确认回写目标与权限（fork clone + pi-config 配置文件）
- [x] 已确认异常处理与冲突策略（扩展未安装/路径不存在 → 静默跳过，不阻断 spawn）
