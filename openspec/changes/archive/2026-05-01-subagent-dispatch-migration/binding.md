# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `.pi/extensions/obsidian-tools/` — Extension 子目录模式（有 npm 依赖）的先例参考
  - `.pi/packages/subagent-dispatch/` — 当前待迁移包的位置与结构
  - `.pi/capabilities.yaml` — 能力清单 Manifest（迁移后需更新 global 声明）
  - `scripts/sync-pi-agent.sh` — Sync 脚本（迁移后需调整 `ensure_local_package_dependencies` 和 settings 渲染逻辑）
  - `.pi/settings.json` — 当前 package 注册位置（迁移后需移除 packages 条目）

## Source of Truth

- 行为规范真源：`specs/subagent-dispatch-migration/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner（当前仓库）
- `writeback_timing`: verification 完成、change 进入 archival 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 涉及 `scripts/sync-pi-agent.sh` 的修改，需通过 sync 确认规则走用户确认流程
- 本 change 涉及 `.pi/capabilities.yaml` 的修改（从 `global.settings.packages` 移至 `global.extensions`），不需要额外全局 sync，随下次 sync 生效

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
