# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无（本次变更为仓库内部文档改进，不涉及外部标准规范变更）
- `project_page_ref`: `repo://pi-config/README.md`、`repo://pi-config/.pi/agent/AGENTS.md`
- `additional_context_refs`:
  - `repo://pi-config/.pi/capabilities.yaml`
  - `repo://pi-config/.pi/agent/AGENTS.d/pi-provider-model.md`
  - `repo://pi-config/.pi/settings.json`

## Source of Truth

- 行为规范真源：`specs/`（本次变更不涉及新增 capability spec，为文档结构优化）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://pi-config/README.md` — 在最开头增加「新手上路」章节引用
  - `repo://pi-config/.pi/agent/AGENTS.md` — 增加使用情景描述和链接
  - `repo://pi-config/docs/getting-started.md` — 新手上路独立文档（新建）
- `writeback_owner`: 当前仓库维护者
- `writeback_timing`: 变更实现完成并通过 verification 后

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用（无外部标准页，已声明）
- [x] 已确认项目页引用（README.md、AGENTS.md）
- [x] 已确认回写目标与权限（仓库内部文件，有写权限）
- [x] 已确认异常处理与冲突策略（文档级变更，无技术冲突）
