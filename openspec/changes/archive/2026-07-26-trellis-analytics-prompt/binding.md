# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-config/openspec/changes/trellis-analytics-prompt` (specs, design, tasks)
- `project_page_ref`: `repo://neonspark/.pi/prompts/trellis-analytics.md`
- `additional_context_refs`:
  - `repo://neonspark/.pi/extensions/trellis-analytics.ts` — 已有扩展实现，prompt 指导其数据分析
  - `repo://neonspark/.trellis/workflow.md` — Trellis 工作流定义，prompt 联动引用
  - `repo://neonspark/.agents/skills/trellis/trellis-start/SKILL.md` — 8 步工作流 SSOT
  - `repo://neonspark/.trellis/spec/guides/rule-phase-gate-map.md` — 门禁规则
  - `repo://neonspark/.trellis/.analytics/` — 遥测数据目录

## Source of Truth

- 行为规范真源：`specs/trellis-analytics-prompt/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面（`repo://neonspark/.pi/prompts/trellis-analytics.md`）是 agent 使用指导，不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://neonspark/.pi/prompts/trellis-analytics.md` — prompt 文件本体
- `writeback_owner`: pi-config 仓库（作业提交者），neonspark 仓库（目标部署方）
- `writeback_timing`: change 实现完成、验证通过后，通过 `scripts/sync-pi-agent.sh` 同步（如涉及全局部署）或直接写入 neonspark 仓库

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用：pi-config 仓库中的 change 目录
- [x] 已确认项目页引用：neonspark 仓库 `.pi/prompts/trellis-analytics.md`
- [x] 已确认回写目标与权限：neonspark 仓库可写
- [x] 已确认异常处理与冲突策略：以 spec 为准
