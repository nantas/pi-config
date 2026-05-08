# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无外部标准页引用（本 change 为 pi-config 仓库内部 extension 修改）
- `project_page_ref`: `.pi/extensions/obsidian-tools/`（obsidian-tools extension 源码目录）
- `additional_context_refs`:
  - `.pi/extensions/obsidian-tools/index.ts`（extension 入口，session_start 事件注册）
  - `.pi/extensions/obsidian-tools/vault-resolver.ts`（vault 解析与 preload 逻辑）
  - `.pi/extensions/obsidian-tools/cli-runner.ts`（CLI 执行层）

## Source of Truth

- 行为规范真源：`specs/obsidian-tools-lazy-preload/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部回写目标（change 完全在 pi-config 仓库内闭环）
- `writeback_owner`: nantas-agent
- `writeback_timing`: change 实施验证通过后

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用（obsidian-tools extension 目录）
- [x] 已确认回写目标与权限（仓库内闭环，无外部回写）
- [x] 已确认异常处理与冲突策略（preload 失败时静默降级，不影响工具可用性）
