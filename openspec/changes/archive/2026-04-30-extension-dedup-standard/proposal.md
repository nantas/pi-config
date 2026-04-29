# Proposal

## 问题定义

`dollar-skill-invoke.ts` 扩展与 `planner-toggle.ts` 一样，同时存在于 `.pi/extensions/`（项目本地）和 `~/.pi/agent/extensions/`（全局同步）。两副本各自加载后，`session_start` 中：

- `ctx.ui.addAutocompleteProvider()` 被调用两次，autocomplete 链被双重包装
- `ctx.ui.setEditorComponent()` 被调用两次，editor 被创建两个实例

这会导致不确定的行为，且目前没有任何保护机制。同时，`pi-extension-dev` 技能工作流中未明确要求扩展必须具备自去重能力，未来新增的扩展可能重复同样的错误。

## 范围边界

**In scope:**
- 为 `dollar-skill-invoke.ts` 添加 `globalThis` 去重标记
- 更新 `.pi/skills/pi-extension-dev/SKILL.md`，在 Implementation Guidance 中增加自去重要求

**Out of scope:**
- 已修复的 `planner-toggle.ts`（不重复修改）
- Pi 核心层的扩展加载去重
- 其他非 pi-config 仓库中的扩展

## Capabilities

### New Capabilities
- `extension-dedup-standard`: 为 `dollar-skill-invoke.ts` 添加运行时自去重，并在 `pi-extension-dev` 技能中标准化自去重要求，明确所有需要全局同步的扩展必须在入口处添加 `globalThis` 去重标记。

### Modified Capabilities

（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（对话中已提出需要修复 dollar-skill-invoke.ts 并更新 skill）

## Impact

- **修改文件**: `.pi/extensions/dollar-skill-invoke.ts` — 添加 `globalThis` 去重标记
- **修改文件**: `.pi/skills/pi-extension-dev/SKILL.md` — 在 Implementation Guidance 中增加自去重要求

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页: `repo://orbitos`
  - 项目页: `openspec/pkg-backlog.md`
  - 技能: `.pi/skills/pi-extension-dev/SKILL.md`
