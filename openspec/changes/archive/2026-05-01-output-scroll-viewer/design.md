# Design

## Context

本 change 实现一个 Pi Extension，解决 Agent 长篇输出后用户需要手动滚屏的问题。核心矛盾是：Pi 使用终端原生 scrollback（无应用层视口偏移 API），无法直接编程滚动终端视图。可行的替代方案是在 Agent 完成后，通过 Overlay 模式提供一个可键盘导航的文本查看器。

## Goals / Non-Goals

**Goals:**
- Agent 完成后检测最后一条 assistant 消息是否多屏
- 多屏时弹出确认对话框，让用户选择是否从开头查看
- 用 `ctx.ui.custom({ overlay: true })` 提供全屏可滚动 overlay 查看器
- 支持 Markdown 渲染（使用 pi-tui 的 `Markdown` 组件）
- 支持翻滚/翻页/跳转/关闭等键盘导航
- 包含全局 dedup + `session_shutdown` 生命周期处理

**Non-Goals:**
- 不修改终端原生 scrollback
- 不处理 tool call / tool result
- 不聚合多条消息
- 不修改 pi 核心代码
- 不引入外部 npm 依赖

## Decisions

### D1 事件订阅策略

使用两个事件钩子协作：

| 事件 | 用途 | 时序 |
|------|------|------|
| `session_start` | 初始化：捕获 `tui` 引用和 `terminal.rows` | 启动时 |
| `agent_end` | 触发点：提取文本、计算行数、弹确认、开 overlay | 每轮 Agent 完成时 |

为什么不用 `message_end`：`message_end` 在 streaming 过程中每类消息都会触发，而 assistant `message_end` 和 `agent_end` 本质上是顺序发生的。在 `agent_end` 中通过 `sessionManager.getBranch()` 读取最后一条消息更加简洁可靠，避免在 streaming 中维护中间状态。

为什么不用 `turn_end`：turn_end 在 tool call 完成后就触发，而最终的文本响应可能还在 streaming。`agent_end` 确保所有内容已完成。

### D2 文本提取 — 从 SessionManager 读取

在 `agent_end` handler 中：
1. 调用 `ctx.sessionManager.getBranch()` 获取当前分支全部 entry
2. 从尾部向前遍历，找到 `entry.type === "message" && entry.message.role === "assistant"` 的最后一个条目
3. 提取 `entry.message.content` 中的 text block 拼接成纯文本
4. 如果找不到 assistant 消息，直接返回（no-op）

文本内容可能以 `content` 数组或单一字符串形式存在，需兼容两种格式。

### D3 多屏检测 — 两步判断

```
第一步：快速估算
  textLines = assistantText.split('\n').length
  if textLines <= terminal.rows → 不触发（肯定不多屏）

第二步：精确检测（仅在快速估算提示多屏时）
  用 pi-tui 的 Markdown 组件渲染文本
  统计渲染后行数
  if renderedLines > terminal.rows → 多屏 → 弹确认
```

这种两阶段设计避免了对短文本做无谓的 Markdown 渲染。

### D4 确认对话框

使用 `ctx.ui.confirm()` 并返回 `Promise<boolean>`：
- 标题: `"Output Scroll Viewer"`
- 消息: `"The response spans approximately X screens. View from the beginning?"`
- 用户确认 → 显示 overlay
- 用户取消或超时 → 无操作

### D5 Overlay Viewer 组件

**架构**：在 `agent_end` handler 中调用 `ctx.ui.custom({ overlay: true })`，传递组件工厂函数。组件参考 `overlay-qa-tests.ts` 中的 `StreamingOverflowComponent` 模式。

**组件内部状态**：
- `lines: string[]` — Markdown 渲染后的行列表
- `scrollOffset: number` — 当前视口在 `lines` 中的起始索引
- `maxVisibleLines: number` — 根据 `tui.terminal.rows - 2`（减去边框）计算

**渲染流程**：
1. 首次进入 overlay 时，用 `Markdown` 组件渲染文本获取 `lines`
2. 每次 `render()` 时，截取 `lines[scrollOffset..scrollOffset+maxVisibleLines]` 作为可见行
3. 添加边框、标题栏、滚动指示器

**键盘映射**：

| 按键 | 效果 |
|------|------|
| `↑` / `k` | 上滚一行 |
| `↓` / `j` | 下滚一行 |
| `PageUp` / `Ctrl+u` | 上翻一页 |
| `PageDown` / `Ctrl+d` | 下翻一页 |
| `Home` / `g` | 跳转到开头 |
| `End` / `G` / `Shift+g` | 跳转到结尾 |
| `Escape` / `q` / `Ctrl+c` | 关闭 overlay |

使用 `matchesKey(data, keyName)` 进行按键匹配（来自 pi-tui 的工具函数）。

### D6 文件结构

```
.pi/extensions/
  output-scroll-viewer.ts    # 单文件扩展，~200-300 行
```

单文件模式已足够，无外部 npm 依赖，所有依赖（`Markdown`、`matchesKey`、`Component`、`Container`）来自 pi-tui 和 pi-coding-agent。

### D7 Dedup + Lifecycle

按照 pi-extension-dev 技能的强制要求：

```typescript
export default function (pi: ExtensionAPI) {
  const _key = "__pi_ext_output_scroll_viewer_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi.on("session_shutdown", () => {
    delete (globalThis as any)[_key];
  });

  // ... handler registrations
}
```

## Risks / Migration

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Overlay 覆盖了编辑器，用户无法输入 | 若用户拒绝 overlay 后想输入 | `agent_end` 后编辑器自然恢复焦点；overlay 关闭后立即回到编辑器 |
| 超长文本（100KB+）Markdown 渲染耗时 | 首次进入 overlay 轻微卡顿 | 检测阶段用 `agent_end` 期间预渲染，避免在 overlay 工厂中首次渲染 |
| 终端尺寸变化时 overlay 未适配 | 内容偏移 | `overlayOptions` 可传工厂函数动态获取 `tui.terminal.rows` |
| 与使用 `setEditorComponent` 的扩展冲突 | `setEditorComponent` 是互斥 API | 本扩展不使用 `setEditorComponent`，仅用 `ctx.ui.custom`，无冲突 |
