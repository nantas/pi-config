# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-config` — pi-config 仓库自身为扩展治理标准
- `project_page_ref`: N/A（纯工程清理，无关联项目页面）
- `additional_context_refs`:
  - `repo://pi-mono` — Pi 扩展生命周期 API 参考（`session_start` / `session_shutdown` hooks）

## Source of Truth

- 行为规范真源：`specs/obsidian-tools/spec.md`
- 项目页面角色：不适用（无外部项目页面参与）
- 非真源说明：无项目页面，不涉及 spec delta 覆盖

## 回写目标

- `writeback_targets`: N/A（本次变更为技术清理，不产生需回写的外部结论）
- `writeback_owner`: nantas
- `writeback_timing`: N/A

## 同步约束

- 本次变更仅涉及 `pi-config` 仓库内 `.pi/extensions/obsidian-tools/` 目录
- 变更完成后需确认 `capabilities.yaml` 中该扩展的条目无变化（功能集未变）
- 全局同步（`scripts/sync-pi-agent.sh`）在确认后运行

## 待确认项

- [x] 已确认标准页引用：`repo://pi-config`
- [x] 已确认项目页引用：N/A
- [x] 已确认回写目标与权限：N/A（无外部回写）
- [x] 已确认异常处理与冲突策略：变更范围限定在 `obsidian-tools/`，不涉及外部依赖
