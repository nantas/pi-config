# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 本 change 为 skill 工作流优化 + 参考文档新增，不涉及新 capability spec
- `project_page_ref`: `repo://pi-config`
- `additional_context_refs`: `.pi/skills/pkg-fork-dev/SKILL.md`, `forks/manifest.yaml`, `docs/reference/pi-tool-api-dependency.md`

## Source of Truth

- 行为规范真源：`specs/` — 本次变更不涉及新的 capability，无需新增 spec
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `.pi/skills/pkg-fork-dev/SKILL.md`, `docs/reference/pi-package-loading.md`
- `writeback_owner`: pi-config change owner
- `writeback_timing`: 验证通过后、归档前

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本次变更涉及 `.pi/skills/pkg-fork-dev/SKILL.md` 修改，需要全局 sync（`scripts/sync-pi-agent.sh`）

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
