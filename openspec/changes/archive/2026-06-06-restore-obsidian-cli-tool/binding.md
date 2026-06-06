# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无外部标准页引用（本 change 恢复 obsidian-tools 扩展内的 obsidian_cli tool，不涉及 orbitos 规范页）
- `project_page_ref`: `openspec/specs/obsidian-cli-tool/spec.md`（已有 live spec，需更新 Command Execution requirement）
- `additional_context_refs`:
  - `openspec/changes/archive/2026-05-01-obsidian-tools/`（原始创建 change，含首次实现的设计与验证）
  - `openspec/changes/archive/2026-06-04-remove-obsidian-cli-dependency/`（删除 change，需理解哪些模块被移除及其原因）

## Source of Truth

- 行为规范真源：`specs/obsidian-cli-tool/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无外部回写目标（变更限定在 `.pi/extensions/obsidian-tools/` 内）
- `writeback_owner`: nantasmac
- `writeback_timing`: 实现验证完成后

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 实现完成后需执行 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用（`openspec/specs/obsidian-cli-tool/spec.md`）
- [x] 已确认回写目标与权限（无外部回写，仅全局同步）
- [x] 已确认异常处理与冲突策略（与现有 obsidian_search tool 无冲突，两个 tool 独立注册）
