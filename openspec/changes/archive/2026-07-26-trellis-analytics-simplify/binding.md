# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `.pi/skills/pi-extension-dev/SKILL.md`（Pi extension 开发规范）
- `project_page_ref`:
  - `repo://neonspark/.pi/extensions/trellis-analytics.ts`（目标扩展文件）
- `additional_context_refs`:
  - `repo://neonspark/.trellis/.analytics/`（遥测数据目录）
  - `repo://neonspark/.pi/prompts/trellis-analytics.md`（配套分析 prompt）
  - `repo://neonspark/.agents/skills/trellis/`（Trellis 工作流上下文）

## Source of Truth

- 行为规范真源：`specs/trellis-analytics-recording/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://neonspark/.pi/extensions/trellis-analytics.ts`（扩展文件本体）
- `writeback_owner`: pi-config 仓库，neonspark 仓库为部署目标
- `writeback_timing`: 实现完成、验证通过后通过 change 流程回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用（pi-extension-dev skill）
- [x] 已确认项目页引用（neonspark 仓库扩展路径）
- [x] 已确认回写目标与权限（neonspark 仓库可写）
- [x] 已确认异常处理与冲突策略（以 spec 为准）
