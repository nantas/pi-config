# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `.pi/skills/pi-extension-dev/SKILL.md`（Pi extension 开发规范）
- `project_page_ref`:
  - `repo://neonspark/.pi/extensions/trellis-analytics.ts`（目标扩展部署路径）
  - `repo://neonspark/.trellis/.analytics/`（遥测数据持久化目录）
- `additional_context_refs`:
  - `repo://neonspark/.agents/skills/trellis/trellis-start/SKILL.md`（目标工作流）
  - `repo://neonspark/.agents/skills/trellis/trellis-brainstorm/SKILL.md`
  - `repo://neonspark/.agents/skills/close-task/SKILL.md`

## Source of Truth

- 行为规范真源：`specs/trellis-analytics/spec.md`
- 项目页面角色：
  - `binding.md`：治理边界与回写协议
  - `design.md`：架构设计与决策记录
  - `tasks.md`：可执行任务列表
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.trellis/.analytics/tasks/<task-slug>/events.jsonl`（流式写入遥测事件）
  - `.trellis/.analytics/orphans/<pi-session-id>.jsonl`（无活跃 task 时的事件）
- `writeback_owner`: trellis-analytics extension（自动流式写入，无需人工介入）
- `writeback_timing`: 每次事件触发时即时追加写入，session 级别无需手动同步

## 同步约束

- 遥测 JSONL 文件的 schema 以 spec.md 的定义为准，不允许随意扩展字段
- extension 代码变更必须经过 pi-config 的标准 change 流程
- 回写只同步遥测事件记录，不复制 spec/design/tasks 内容
- 若扩展的行为与 spec delta 不一致，以 spec.md 为准

## 待确认项

- [x] 已确认标准页引用（pi-extension-dev skill）
- [x] 已确认项目页引用（neonspark 仓库的扩展部署路径）
- [x] 已确认回写目标与权限（extension 进程内写入，无权限限制）
- [ ] 已确认异常处理与冲突策略（待 design.md 中明确：JSONL 文件轮转策略、写入失败处理）
