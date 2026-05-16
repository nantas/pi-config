# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/specs/dollar-skill-invoke/spec.md`
- `project_page_ref`: `openspec/specs/dollar-skill-invoke/spec.md`（pi-config 项目内，标准页即项目页）
- `additional_context_refs`:
  - `openspec/specs/dollar-skill-autocomplete/spec.md`
  - `repo://pi-mono/packages/coding-agent/src/core/agent-session.ts`（input 管线）
  - `repo://pi-mono/packages/coding-agent/src/core/extensions/runner.ts`（context 事件）
  - `repo://pi-mono/packages/coding-agent/src/core/extensions/types.ts`（事件签名）
  - `repo://pi-mono/packages/coding-agent/src/core/messages.ts`（消息转换）

## Source of Truth

- 行为规范真源：`specs/dollar-skill-invoke/spec.md`（本次 change 的 spec delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `openspec/specs/dollar-skill-invoke/spec.md`（capability 主 spec，追加 MODIFIED requirements）
- `writeback_owner`: `pi-config` 维护者
- `writeback_timing`: apply 后，verification 通过时执行

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本次 change 修改 `.pi/extensions/dollar-skill-invoke.ts`，需同步部署至 `~/.pi/agent/extensions/`
- 同步路径：`scripts/sync-pi-agent.sh`（由 Phase F 流程触发）

## 待确认项

- [x] 已确认标准页引用（`openspec/specs/dollar-skill-invoke/spec.md`）
- [x] 已确认项目页引用（同上，pi-config 内联）
- [x] 已确认回写目标与权限（本地仓库，无权限限制）
- [x] 已确认异常处理与冲突策略（spec delta 以本 change 的 `specs/` 为准）
