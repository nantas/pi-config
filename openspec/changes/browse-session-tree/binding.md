# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-mono/packages/coding-agent/docs/extensions.md` — Pi ExtensionAPI 官方文档
- `project_page_ref`:
  - `docs/plans/pi-customization-reference.md` — pi-config 扩展系统参考
  - `.pi/skills/pi-extension-dev/SKILL.md` — pi-extension-dev skill 工作流
- `additional_context_refs`:
  - `repo://pi-mono/packages/coding-agent/src/modes/interactive/components/tree-selector.ts` — 内置 /tree 实现参考
  - `repo://pi-mono/packages/coding-agent/docs/keybindings.md` — 快捷键绑定参考

## Source of Truth

- 行为规范真源：`specs/browse-session-tree/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/extensions/browse-session-tree.ts` — 扩展实现文件
  - `.pi/capabilities.yaml` — 能力清单（全局 extensions 列表）
- `writeback_owner`: @nantasmac
- `writeback_timing`: 扩展验证通过后，同步至全局前

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
