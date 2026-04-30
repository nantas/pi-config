# Pi Extension Editor Conflict Reference

> 记录 `ctx.ui.setEditorComponent()` 独占替换模式的原理、冲突痕迹、兼容策略和后续 extension 开发约束。
> 创建日期：2026-04-30
> 相关 change：`fix-dollar-skill-editor-conflict`

## 1. 问题背景

Pi 的 Extension API 提供 `ctx.ui.setEditorComponent(editorFactory)` 方法，允许扩展替换 TUI 编辑器组件。该 API 是**独占替换**模式 —— 每次调用都会完全替换当前编辑器，最后一个调用者胜出。

当多个扩展各自调用 `setEditorComponent` 时，前一个扩展的编辑器定制功能会被无声覆盖。这是 Pi 框架的设计约束：editor API 是**替换式**而非**组合式/装饰式**。

## 2. `setEditorComponent` 独占替换原理

```
┌─────────────────────────────────────────────────────────┐
│                 Editor 注册链                            │
└─────────────────────────────────────────────────────────┘

Pi 启动 → 创建 CustomEditor（默认）
    │
    ├── Extension A 调用 setEditorComponent(factoryA)
    │   → 编辑器被替换为 EditorA
    │
    └── Extension B 调用 setEditorComponent(factoryB)
        → 编辑器被替换为 EditorB
        → EditorA 的全部定制逻辑丢失 ❌
```

**关键限制**：
- 没有 "get current editor" API，无法保存或包装已有 editor
- 没有 "editor plugin/hook" API，无法注入 `handleInput` 逻辑而不替换整个编辑器
- `setEditorComponent` 的 factory 必须从零创建 editor 实例，无法感知现有 editor

## 3. 冲突诊断线索

当出现 editor 覆盖冲突时，以下症状可以帮助定位：

| 症状 | 说明 | 排查方向 |
|------|------|---------|
| 扩展部分功能失效 | `$` 自动补全不触发（但 Tab 触发正常） | `setEditorComponent` 被覆盖 |
| 某个扩展的 UI 定制消失 | 编辑器样式、状态栏等功能丢失 | 后加载的扩展调用了 `setEditorComponent` |
| 多个扩展同时启用时功能异常 | 单独启用各扩展都正常 | 加载顺序导致 `setEditorComponent` 覆盖 |

**排查步骤**：

1. 在 `.pi/` 目录中搜索 `setEditorComponent`：
   ```bash
   grep -rn "setEditorComponent" .pi/extensions/ .pi/npm/
   ```
2. 确认扩展加载顺序：
   - `.pi/extensions/` 中的文件优先加载
   - `.pi/settings.json` 的 `packages` 数组按顺序加载（数组中越靠后越晚加载）
3. 通过逐一排除法确认冲突对：
   - 只启用 Extension A → 是否正常？
   - 只启用 Extension B → 是否正常？
   - 同时启用 → 哪个功能失效？

## 4. 兼容策略矩阵

| 策略 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **A: 避免 setEditorComponent** | 只需要 autocomplete 定制/输入转换 | 完全兼容所有 editor；无需管理加载顺序 | 失去 editor 级别的定制能力（如 auto-trigger） |
| **B: 接受 Tab 触发** | custom autocomplete prefix | 兼容所有 editor；用户按 Tab 触发 | 不如 auto-trigger 方便 |
| **C: 协调加载顺序** | 必须替换 editor 的场景 | 最后一个加载的扩展的 editor 生效 | 强耦合加载顺序；仍只能有一个 editor 生效 |
| **D: 修改 Pi 框架** | 需要组合多个 editor 定制 | 理论上最完美 | 不在 extension 能力范围内；不适用于当前版本 |

### 推荐策略

**对于只定制度 autocomplete chain 的扩展**，优先使用 `ctx.ui.addAutocompleteProvider()` 而非 `setEditorComponent()`。这是 Pi 框架提供的装饰式 API，多个扩展可以安全地叠加自己的 wrapper：

```
addAutocompleteProvider chain:
  Extension C wrapper (outermost)
    → Extension B wrapper
      → Extension A wrapper
        → CombinedAutocompleteProvider (base)
```

每个 extension 的 wrapper 只处理自己关心的前缀/模式，不匹配时 delegate 给下一个 provider。

## 5. 推荐的扩展开发模式

### ✅ 推荐：addAutocompleteProvider + 顶层 event handler

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { type AutocompleteProvider, fuzzyFilter } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI): void {
  const _key = "__pi_ext_my_autocomplete_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi.on("session_shutdown", () => {
    delete (globalThis as any)[_key];
  });

  // ---- 顶层注册 event handler（仅一次） ----
  pi.on("input", async (event) => {
    // 自定义输入转换逻辑
    if (event.text.includes("$")) {
      // ... transform
    }
    return { action: "continue" };
  });

  // ---- session_start 中注册 autocomplete provider ----
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.addAutocompleteProvider((current) => ({
      async getSuggestions(lines, cursorLine, cursorCol, options) {
        const line = lines[cursorLine] ?? "";
        const beforeCursor = line.slice(0, cursorCol);

        // 检测自定义前缀
        const match = beforeCursor.match(/YOUR_PATTERN/);
        if (!match) {
          return current.getSuggestions(lines, cursorLine, cursorCol, options);
        }

        // 返回自定义补全项
        return {
          prefix: match[0],
          items: [{ value: "result", label: "result" }],
        };
      },
      applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
        return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
      },
      shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
        return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
      },
    }));
  });
}
```

**关键点**：
- `addAutocompleteProvider` 在 `session_start` 中注册（session-scoped，每个 session 重建）
- `pi.on("input", ...)` 在顶层注册（仅一次，跨 session 有效）
- 不使用 `ctx.ui.setEditorComponent()`，避免覆盖冲突
- 保持 `globalThis` 自去重标记 + `session_shutdown` clear 模式

### ❌ 不推荐：依赖 setEditorComponent

```typescript
// ❌ 以下模式会导致 editor 覆盖冲突：
pi.on("session_start", async (_event, ctx) => {
  ctx.ui.setEditorComponent((tui, theme, keybindings) => {
    // 自定义编辑器
    return new MyCustomEditor(tui, theme, keybindings);
  });
});
```

除非你是唯一调用 `setEditorComponent` 的扩展，否则这个模式不可靠。

## 6. 已知冲突案例

| 场景 | 扩展对 | 根因 | 修复 |
|------|-------|------|------|
| `$` auto-trigger 失效 | dollar-skill-invoke + pi-powerline-footer | 两个扩展都调用 `setEditorComponent`，后者覆盖前者 | dollar-skill-invoke 改为 `addAutocompleteProvider` 方式（见 change `fix-dollar-skill-editor-conflict`） |

---

**参考**：`docs/reference/pi-extension-autocomplete-internals.md` — Pi autocomplete chain 和 input pipeline 的底层技术细节。
