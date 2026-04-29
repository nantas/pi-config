# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos` (OrbitOS 治理框架)
- `project_page_ref`:
  - `openspec/pkg-backlog.md` (pi-config 项目 backlog 页面)
- `additional_context_refs`:
  - `AGENTS.md` (项目行为规范与工作流约束)
  - `scripts/sync-pi-agent.sh` (全局同步脚本)

## Source of Truth

- 行为规范真源：`specs/global-agent-md-tool-guide/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://pi-config` → `openspec/pkg-backlog.md` (记录 change 结论、状态与交付物摘要)
- `writeback_owner`: pi-config 仓库维护者
- `writeback_timing`: OpenSpec 验证通过后、archive 前执行

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用 (repo://orbitos)
- [x] 已确认项目页引用 (openspec/pkg-backlog.md)
- [x] 已确认回写目标与权限 (pi-config 仓库内写入，无需额外授权)
- [x] 已确认异常处理与冲突策略 (以 specs/ 为准)
