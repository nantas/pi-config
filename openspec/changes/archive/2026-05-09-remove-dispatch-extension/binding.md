# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `openspec/schemas/orbitos-change-v1` — change 工件的治理标准
  - `openspec/specs/pi-subagent-dispatch-baseline/spec.md` — 当前 dispatch extension 的行为规范（将被取代）
  - `openspec/specs/pi-subagent-agent-contract/spec.md` — agent 文件契约标准（不受影响，dispatch-planner 移除后原有规则仍适用）
- `project_page_ref`:
  - `docs/plans/dispatch-removal-migration-plan.md` — 前置分析与迁移方案文档
- `additional_context_refs`:
  - `README.md` — 需更新 dispatch 能力描述
  - `docs/getting-started.md` — 需更新 subagent 配置指引
  - `.pi/capabilities.yaml` — 需移除 dispatch 相关条目
  - `.pi/agents/dispatch-planner.md` — 将被删除的 agent 定义
  - `.pi/extensions/subagent-dispatch/` — 将被删除的 extension 目录
  - `.pi/prompts/subagent.md` — 将创建的新 prompt（替代 dispatch 编排入口）

## Source of Truth

- 行为规范真源：`openspec/specs/`（本次 change 将在 specs/ 创建新的 capability spec）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `README.md` — 更新能力描述（移除 dispatch 引用，添加 subagent prompt 入口）
  - `docs/getting-started.md` — 更新 subagent 模型配置指引
  - `.pi/capabilities.yaml` — 移除 `subagent-dispatch` 和 `dispatch-planner` 条目
  - `.pi/agents/dispatch-planner.md` — 删除 agent 文件
  - `.pi/extensions/subagent-dispatch/` — 删除整个 extension 目录
  - `.pi/prompts/subagent.md` — 创建新的编排 prompt 文件
- `writeback_owner`: `pi-config` 仓库所有者
- `writeback_timing`: 在 change 验证通过后，通过 `tasks.md` 中的同步步骤执行

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用：`pi-subagent-dispatch-baseline` 和 `pi-subagent-agent-contract` 为本 change 相关标准
- [ ] 已确认项目页引用：`docs/plans/` 作为项目方案文档目录，非 Obsidian 项目页（无对应 vault）
- [x] 已确认回写目标与权限：`pi-config` 仓库内所有回写目标均有写权限
- [x] 已确认异常处理与冲突策略：先创建新 prompt，确认可用后再删除旧的 extension/agent
