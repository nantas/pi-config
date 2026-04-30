# Proposal

## 问题定义

`dollar-skill-invoke` 扩展和 `pi-powerline-footer` 扩展同时启用时，后者的 `setEditorComponent` 调用覆盖了前者的 `DollarSkillEditor`，导致 `$` 键入自动触发补全功能失效。

根因：两个扩展都在 `session_start` 中调用 `ctx.ui.setEditorComponent()`，而 Pi 的 editor API 是**独占替换**模式，最后调用者胜出。`dollar-skill-invoke` 从 `.pi/extensions/` 自动发现（先加载），`pi-powerline-footer` 从 packages 数组加载（后加载），后者覆盖前者。

此外，`dollar-skill-invoke` 内部将 `pi.on("input", ...)` 注册在 `session_start` 回调内，每次 session 开始时都会注册一个新的 `input` handler，导致 handler 累积。

## 范围边界

- **在范围内**：修改 `dollar-skill-invoke.ts`，移除 `setEditorComponent` 调用和 `DollarSkillEditor` 类
- **在范围内**：将 `pi.on("input", ...)` 从 `session_start` 内提到顶层，修复 handler 累积
- **在范围内**：更新 `openspec/specs/dollar-skill-autocomplete/spec.md` 中 `Editor Auto-Trigger on $` 的 auto-trigger 要求
- **在范围内**：新增 `docs/reference/pi-extension-editor-conflict.md`，记录 `setEditorComponent` 独占覆盖模式与约束指南
- **不在范围内**：修改 `pi-powerline-footer` 源码（外部 npm 包）
- **不在范围内**：修改 Pi 框架的 editor API 行为
- **不在范围内**：改变 `/` / `@` / `#` 内置触发器的行为

## Capabilities

### New Capabilities

- `editor-conflict-reference`: 新增参考文档 `docs/reference/pi-extension-editor-conflict.md`，记录 `setEditorComponent` 独占替换模式的原理、冲突痕迹、兼容策略和后续扩展开发约束

### Modified Capabilities

- `dollar-skill-autocomplete`: 移除 `DollarSkillEditor` 自定义 editor 和 `setEditorComponent` 调用；`$` 自动补全改为通过 `addAutocompleteProvider` chain 由 Tab 触发；更新 main spec 中 `Editor Auto-Trigger on $` requirement 为 Tab 触发
- `dollar-skill-invoke`: 修复 `input` handler 在 `session_start` 内累积注册的 bug，改为在顶层注册

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **更改文件**：`.pi/extensions/dollar-skill-invoke.ts` — 移除 `CustomEditor` import、`DollarSkillEditor` 类、`setEditorComponent` 调用；将 `input` handler 提到顶层
- **更改文件**：`openspec/specs/dollar-skill-autocomplete/spec.md` — 更新 `Editor Auto-Trigger on $` requirement（auto-trigger → Tab trigger）
- **新增文件**：`docs/reference/pi-extension-editor-conflict.md` — 记录 `setEditorComponent` 独占覆盖模式与 extension 开发约束
- **无依赖变更**：不新增 npm 依赖

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
