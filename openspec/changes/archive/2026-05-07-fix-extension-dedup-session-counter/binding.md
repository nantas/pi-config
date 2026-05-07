# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 本次变更为扩展代码修改，不涉及新增 capability spec
- `project_page_ref`: `repo://pi-config`
- `additional_context_refs`: 本次诊断过程中分析的 Pi 源码 — `interactive-mode.js` 的 `/new` 链路、`agent-session-runtime.js` 的 `newSession()`/`teardownCurrent()`、`extensions/loader.js` 的 `loadExtensions()`、`resource-loader.js` 的 `mergePaths()`/`detectExtensionConflicts()`

## Source of Truth

- 行为规范真源：本 change 为已有扩展的代码级修复，不涉及新的 capability，行为规范由 Pi Extension API 合约保证
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 所有修改的扩展文件（每个扩展的 default export 函数中的去重逻辑）
- `writeback_owner`: pi-config change owner
- `writeback_timing`: 验证所有扩展在 `/new` 和 `/reload` 后正确加载后，归档前

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本次变更涉及 7 个扩展文件的修改，需要部署后全局同步（`scripts/sync-pi-agent.sh`）

## 待确认项

- [x] 已确认标准页引用 — 本次不涉及新 capability
- [x] 已确认项目页引用 — `repo://pi-config`
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
