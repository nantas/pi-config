# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: 无（pi-config 仓库无独立的 Obsidian 项目页面）
- `additional_context_refs`:
  - `repo://pi-config/openspec/specs/pi-runtime-bootstrap-sync/spec.md`（本次 change 修改的目标 spec）
  - `repo://pi-config/.pi/capabilities.yaml`（全局配置清单）
  - `repo://pi-config/scripts/sync-pi-agent.sh`（同步脚本）

## Source of Truth

- 行为规范真源：`specs/pi-runtime-bootstrap-sync/spec.md`
- 项目页面角色：无项目页面，治理信息直接在仓库 AGENTS.md + capabilities.yaml 中维护
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://pi-config/openspec/specs/pi-runtime-bootstrap-sync/spec.md`（更新 sync 规范）
  - `repo://pi-config/.pi/capabilities.yaml`（扩展 global.settings 字段）
  - `repo://pi-config/scripts/sync-pi-agent.sh`（重写 render_settings_file）
  - `repo://pi-config/.pi/agent/AGENTS.md`（更新 capability manifest governance 描述）
- `writeback_owner`: nantas
- `writeback_timing`: change 实现完成并验证后回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- pi-runtime-bootstrap-sync/spec.md 中的 Requirement 3（whitelist/exclude_keys 过滤）需要更新为新模式

## 待确认项

- [x] 已确认标准页引用
- [ ] 已确认项目页引用（无独立项目页面）
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
