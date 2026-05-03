# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/specs/pi-subagent-dispatch-baseline/spec.md` — dispatch 基线规范，本次 change 扩展其契约
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md` — Pi Config 项目页面
- `additional_context_refs`:
  - `.pi/extensions/subagent-dispatch/index.ts` — dispatch 扩展入口
  - `.pi/extensions/subagent-dispatch/core.js` — dispatch 工具函数
  - `.pi/extensions/subagent-dispatch/package.json` — 扩展 package 配置
  - `repo://pi-mono/packages/pi-subagents/index.ts` — pi-subagents 底层引擎
  - `.pi/capabilities.yaml` — capability 清单
  - `.pi/agent/AGENTS.md` — 全局 agent 指导
  - `docs/pi-change-closeout-governance.md` — 变更关闭治理规则

## Source of Truth

- 行为规范真源：`specs/` 下本 change 各工件
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/extensions/subagent-dispatch/index.ts` — dispatch 扩展入口
  - `.pi/extensions/subagent-dispatch/core.js` — dispatch 工具函数
  - `.pi/capabilities.yaml` — 如果新增扩展或变更全局同步清单
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` — 项目进度回写
- `writeback_owner`: pi-config change owner
- `writeback_timing`: 实现完成、verification 通过后回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明
- 本次 change 不修改 `pi-subagents` 底层引擎，仅扩展 `subagent-dispatch` 的上层契约

## 待确认项

- [x] 已确认标准页引用：基于 `pi-subagent-dispatch-baseline` 扩展
- [x] 已确认项目页引用：Pi_Config 项目页面
- [x] 已确认回写目标与权限：pi-config 仓库内文件 + repo://orbitos 回写
- [x] 已确认异常处理与冲突策略：spec 与项目页面冲突时以 `specs/` 为准，回写仅同步摘要
