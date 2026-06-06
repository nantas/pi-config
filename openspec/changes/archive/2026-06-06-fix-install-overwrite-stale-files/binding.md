# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无（本次修改范围仅限 pi-config 仓库内的 SKILL.md 文件，不涉及跨仓标准页）
- `project_page_ref`: `.pi/skills/install-from-pi-config/SKILL.md`（被修改的 skill 文件）
- `additional_context_refs`: `~/.pi/agent/catalog/pi-config.yaml`（install-from-pi-config 运行时读取的 catalog）

## Source of Truth

- 行为规范真源：无独立 spec（本次为单文件 SKILL.md bug 修复，SKILL.md 本身既是规范也是实现指导）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无需跨仓回写
- `writeback_owner`: pi-config 仓库维护者
- `writeback_timing`: 实施完成后即生效

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本次修改不需要跨仓同步，`scripts/sync-pi-agent.sh` 会将 `.pi/skills/` 目录整体同步到 `~/.pi/agent/skills/`

## 待确认项

- [x] 已确认标准页引用（无跨仓标准页）
- [x] 已确认项目页引用（`.pi/skills/install-from-pi-config/SKILL.md`）
- [x] 已确认回写目标与权限（无需跨仓回写）
- [x] 已确认异常处理与冲突策略（覆盖前先删除目标目录，确保干净安装）
