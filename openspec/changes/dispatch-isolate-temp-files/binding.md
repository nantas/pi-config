# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 不适用（本次 change 不涉及已有 spec 标准修订）
- `project_page_ref`: 不适用（本次 change 不涉及项目级功能页变更）
- `additional_context_refs`:
  - `openspec/specs/pi-subagent-dispatch-baseline/spec.md` — dispatch 基线规范
  - `.pi/packages/subagent-dispatch/index.ts` — dispatch 扩展入口实现
  - `.pi/packages/subagent-dispatch/core.js` — dispatch 工具函数

## Source of Truth

- 行为规范真源：当前 change 的 `openspec/changes/dispatch-isolate-temp-files/` 下各工件
- 项目页面角色：不适用，本次为 `subagent-dispatch` 扩展的维护性修复
- 非真源说明：本次 change 不涉及 spec delta，不依赖项目页面回写

## 回写目标

- `writeback_targets`:
  - `.pi/packages/subagent-dispatch/index.ts` — 修改 dispatch executor 调用参数
- `writeback_owner`: 自维护（pi-config 仓库）
- `writeback_timing`: 实现完成后由 openspec-verify-change 验证后 > openspec-archive-change

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认本次为自包含 change，不涉外部标准页或项目页
- [x] 已确认回写目标在 pi-config 仓库内，无权限限制
- [x] 已确认修改范围仅限于 `subagent-dispatch/index.ts` 的 `cwd: PROJECT_ROOT` 参数
