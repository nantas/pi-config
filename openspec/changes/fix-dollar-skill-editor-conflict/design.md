# Design

## Context

`dollar-skill-invoke.ts` 依赖于 `DollarSkillEditor`（extends `CustomEditor`）通过 `ctx.ui.setEditorComponent()` 注册，以在用户输入 `$` 时自动触发 skill autocomplete。`pi-powerline-footer` 扩展（npm 包）也在 `session_start` 中调用 `ctx.ui.setEditorComponent()`，创建 `BashModeEditor`（也 extends `CustomEditor`）。由于 Pi 扩展加载顺序是 `.pi/extensions/` 先于 `packages` 数组，`pi-powerline-footer` 的 `setEditorComponent` 后执行，覆盖了 `DollarSkillEditor`。

此外，`pi.on("input", ...)` 注册在 `session_start` 回调内部，导致每次 session 启动时累积一个新的 `input` handler。

本次 change 移除 `setEditorComponent` 调用和 `DollarSkillEditor` 类的依赖，改为纯 `addAutocompleteProvider` 方式。`$` 自动补全通过 Tab 触发（已有 provider chain），`$skill-name` 展开通过顶层注册的 `input` handler 实现。

## Goals / Non-Goals

**Goals:**
- 移除 `DollarSkillEditor` 类和 `ctx.ui.setEditorComponent()` 调用
- 将 `pi.on("input", ...)` 从 `session_start` 内提到顶层
- 保持 `addAutocompleteProvider` chain 不变（`$` 前缀检测 + `/` 过滤）
- 整理 `CustomEditor` import，仅保留 `ExtensionAPI` 所需
- 更新 main spec 中 auto-trigger requirement
- 新增 `docs/reference/pi-extension-editor-conflict.md` 文档

**Non-Goals:**
- 不修改 `pi-powerline-footer` 源码
- 不修改 Pi 框架的 editor API
- 不改变 `$skill-name` 展开的 `input` event 行为
- 不改变 `/` 前缀过滤逻辑
- 不改变 `/skill:name` 兼容性

## Decisions

### D1: 移除 setEditorComponent，使用 addAutocompleteProvider + Tab 触发

| 机制 | 实现方式 | 兼容性 |
|------|---------|--------|
| `addAutocompleteProvider` (保留) | 包装 autocomplete chain，检测 `$` 前缀 | ✅ 兼容所有 editor |
| `setEditorComponent` (移除) | 替换整个 editor，添加 `$` 触发逻辑 | ❌ 被后加载 extension 覆盖 |
| Tab 触发 | 用户按 Tab 调用 `getSuggestions` → wrapper 检测 `$` | ✅ 兼容所有 editor |

`addAutocompleteProvider` 注册的 wrapper 会通过 Pi 框架的 `setupAutocompleteProvider()` 设置在当前的 editor 上。当用户按 Tab 时，Pi 框架调用 provider chain 的 `getSuggestions()`。dollar-skill-invoke 的 wrapper 在最外层检测 `$` 前缀，命中后返回 skill 列表。

这个 chain 在 pi-powerline-footer 的 BashModeEditor 上仍然有效：
```
ModeAwareAutocompleteProvider (pi-powerline-footer)
  → DollarSkillWrapper (addAutocompleteProvider) ← $ 检测在此层
    → CombinedAutocompleteProvider (Pi 内置)
```

### D2: 将 input handler 提到顶层

```typescript
// Before (bug):
export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => {
    pi.on("input", handler); // 每次 session_start 累积注册
  });
}

// After (fix):
export default function (pi: ExtensionAPI) {
  pi.on("input", handler); // 注册一次，全局生效

  pi.on("session_start", () => {
    ctx.ui.addAutocompleteProvider(...);
  });
}
```

`pi.on("input", ...)` 是全局的 ExtensionAPI 方法，handler 不受 session 生命周期约束。注册在顶层的 `input` handler 会在每次用户提交时被调用，其内部的 `getSkills(pi)` 通过 `pi.getCommands()` 惰性获取当前已加载的 skill 列表，包括 reload 后的变更。

自去重标记（`globalThis` + `session_shutdown` clear）保留不变，确保 `/new` 和 `/reload` 正常工作。

### D3: CustomEditor import 精简

移除后不再需要 `CustomEditor` import，但保留 `type ExtensionAPI` import 和 `@mariozechner/pi-tui` 的 `AutocompleteProvider` 等类型。删除 `DollarSkillEditor` 类的全部代码。

### D4: 参考文档结构

`docs/reference/pi-extension-editor-conflict.md` 包含：
1. `setEditorComponent` 独占替换原理解释
2. 冲突诊断线索（症状 + 排查方法）
3. 兼容策略矩阵
4. 推荐的扩展开发模式（`addAutocompleteProvider` + 顶层 event handler）
5. 代码示例

## Risks / Migration

- **风险**：用户已习惯 `$` 自动触发补全。**缓解**：Tab 触发是 TUI 标准交互模式（path 补全、`@` attach 等也需 Tab 确认）；在 `/new` 或 `/reload` 后仍可正常使用。
- **风险**：其他 extension 后续还会调用 `setEditorComponent`。**缓解**：本次 change 消除了 `dollar-skill-invoke` 对 `setEditorComponent` 的依赖，使其完全免疫 editor 覆盖冲突。参考文档中的策略指南可帮后续 extension 开发者避免同类问题。
- **迁移**：无。本次 change 仅修改 `dollar-skill-invoke` 自身代码和 main spec、新增参考文档，不影响其他 extension 或配置。
- **副作用**：由于 `$` autocomplete 依赖 Tab 而非自动触发，新用户可能需要短暂适应。已有的 `input` 展开功能不受影响。
