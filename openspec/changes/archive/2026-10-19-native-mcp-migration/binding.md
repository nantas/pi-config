# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`:
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`（项目主页，治理判断与索引入口）
- `additional_context_refs`:
  - `repo://pi-mono` → `packages/coding-agent/docs/mcp.md`（Pi 1.3.0 原生 MCP 行为真源）
  - `openspec/specs/pi-mcp-shared-bridge/spec.md`、`openspec/specs/global-mcp-config/spec.md`（待修改的现有 spec）
  - `openspec/pkg-backlog.md` 2026-10-19 removal 记录（本次变更的决策依据）
  - `.pi/capabilities.yaml`（capability manifest 真源）
  - `docs/pi-change-closeout-governance.md`（verification 阶段 closeout 依据）

## Source of Truth

- 行为规范真源：`specs/global-mcp-config/spec.md`（本次 change 的 spec delta，归档后升级为正式 spec；`pi-mcp-shared-bridge` 整体移除）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目主页与 CONTEXT.md 索引不替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `CONTEXT.md`（OpenSpec 索引「MCP 配置」域：移除 `pi-mcp-shared-bridge`，保留 `global-mcp-config`）
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`（项目页摘要回写：原生 MCP 迁移结论）
- `writeback_owner`: agent
- `writeback_timing`: archive 阶段（`/opsx-archive` 后按仓库规则更新 CONTEXT.md 索引，再按 orbitos 回写协议写项目页摘要）

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- orbitos 项目页回写须经 `repo-registry` 解析 `repo://orbitos` 路径后直接编辑目标文件

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用（repo://orbitos 已解析到 `/Users/nantas-agent/projects/obsidian-mind`）
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略（spec 与页面不一致时以 spec 为准）
