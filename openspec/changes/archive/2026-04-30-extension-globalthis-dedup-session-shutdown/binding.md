# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: repo://orbitos (OpenSpec governance rules)
- `project_page_ref`: docs/reference/pi-extension-session-shutdown-dedup.md (新建)
- `additional_context_refs`:
  - repo://pi-mono/packages/coding-agent/src/core/extensions/runner.ts (ExtensionRunner.invalidate, emit, hasHandlers)
  - repo://pi-mono/packages/coding-agent/src/core/extensions/loader.ts (loadExtension, createExtensionAPI, jiti moduleCache)
  - repo://pi-mono/packages/coding-agent/src/core/agent-session-runtime.ts (newSession, teardownCurrent)
  - .pi/skills/pi-extension-dev/SKILL.md (extension development workflow, dedup requirement section)

## Source of Truth

- 行为规范真源：`specs/extension-globalthis-dedup-session-shutdown/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - docs/reference/pi-extension-session-shutdown-dedup.md (新建)
  - .pi/skills/pi-extension-dev/SKILL.md (更新 dedup 章节，添加 session_shutdown 要求)
- `writeback_owner`: pi-config repository
- `writeback_timing`: verification 通过后执行回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
