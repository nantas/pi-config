# Proposal

## 问题定义

当前 Pi TUI 中，加载和调用 skill 的语法是 `/skill:name`，与内置系统命令（`/settings`、`/model` 等）使用相同的前缀 `/`，导致以下问题：

1. **语义混淆**：skill 加载与系统命令混在同一命名空间，用户无法直观区分「这是执行系统功能」还是「加载 skill 上下文」
2. **自动补全噪音**：输入 `/` 时，builtin commands、extension commands、prompt templates、skill commands 全部列出，不利于快速定位
3. **缺少专用的 skill 调用语法**：用 `$skill-name` 作为独立触发前缀，可清晰表达「注入 skill 上下文」的语义

## 范围边界

- **在范围内**：通过 Pi extension 实现 `$skill-name` 语法，提供自动补全和输入 transform
- **在范围内**：`/` 自动补全中过滤掉 skill 条目（仅本 extension 控制）
- **在范围内**：`/skill:name` 仍可正常使用（向后兼容）
- **不在范围内**：修改 pi-mono 源码、改变内置命令的行为、支持非 skill 的 `$` 调用

## Capabilities

### New Capabilities

- `dollar-skill-autocomplete`: 输入 `$` 时触发 skill 自动补全，仅列出可用 skill（含 disableModelInvocation），支持模糊匹配和任意位置触发
- `dollar-skill-invoke`: 提交文本中包含 `$skill-name` 时，将匹配到的 skill 展开为 `<skill>` block 前置插入，原 `$skill-name` token 从文本中移除
- `slash-skill-filter`: `/` 前缀自动补全中过滤掉 skill 条目（`skill:xxx`），仅保留 builtin/extension/template 命令

### Modified Capabilities

- 无：本 extension 仅新增行为，不修改现有核心逻辑

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **新增文件**：`.pi/extensions/dollar-skill-invoke.ts` — 单文件 extension
- **新增文件**：`docs/reference/pi-extension-autocomplete-internals.md` — 技术调研知识点记录
- **更改文件**：无（不修改 pi-mono 源码或现有配置文件）
- **依赖**：仅依赖 `@mariozechner/pi-coding-agent` 和 `@mariozechner/pi-tui`（`fuzzyFilter`、`AutocompleteProvider` 等类型），均为已安装的 bundled 依赖

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
