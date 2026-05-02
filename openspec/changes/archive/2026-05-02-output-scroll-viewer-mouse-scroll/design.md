# Design

## Context

`ScrollableOutputViewer` 组件目前通过 `handleInput(data)` 接收原始终端输入，并使用 `matchesKey()` 处理键盘事件。pi-tui 的 `StdinBuffer` 已将 SGR 鼠标序列（`\x1b[<B;X;Y{M,m}`）识别为完整序列，但 TUI 层面没有鼠标抽象层 — raw data 直接透传到 `handleInput()`。

因此，鼠标滚轮支持可在组件内部通过以下方式实现：

1. **启用 SGR mouse mode**：覆层打开时通过 `tui.terminal.write()` 发送 DECSET 序列，关闭时发送 DECRST 序列
2. **解析 raw data**：在 `handleInput()` 中检测 SGR 鼠标序列格式，提取 button code
3. **映射为滚动动作**：button code 64 → 上滚 3 行，65 → 下滚 3 行

## Goals / Non-Goals

**Goals:**
- 在 overlay 覆层获得焦点时，鼠标滚轮上滚/下滚可滚动内容
- 覆层关闭后自动恢复终端原始鼠标模式
- 与现有键盘操作完全兼容，不冲突

**Non-Goals:**
- 不支持鼠标点击跳转到某一行或选中文本（需要 motion tracking，会增加复杂度与流量）
- 不支持鼠标拖拽选择
- 不修改 pi-tui 的架构或添加全局鼠标事件 API
- 不处理其他鼠标按钮（左键/右键/中键）

## Decisions

### D1 — SGR mouse mode 生命周期

| 阶段 | terminal.write 序列 | 说明 |
|------|---------------------|------|
| 覆层 constructor | `\x1b[?1000h\x1b[?1006h` | 启用 button events + SGR 扩展坐标 |
| done() 关闭覆层前 | `\x1b[?1000l\x1b[?1006l` | 禁用 mouse mode，恢复终端默认 |

- **仅启用 mode 1000（button events）**，不启用 1002（motion tracking），避免数据洪流
- **1006（SGR extended）** 确保坐标格式兼容 223+ 行列的终端

### D2 — 滚轮事件解析

SGR 鼠标序列格式：`ESC[<B;X;Y{M,m}`

| Button Code | 含义 | 动作 |
|-------------|------|------|
| 64 | 滚轮上滚 (0 + 64) | `scrollOffset -= 3` |
| 65 | 滚轮下滚 (1 + 64) | `scrollOffset += 3` |

- 仅响应 `m` 结尾（press 事件），忽略 `M` 结尾（release 事件）
- 每次滚轮 tick 滚动 3 行 — 兼顾自然手感与浏览效率
- 非 64/65 的 button code 直接忽略

### D3 — 解析策略（在 handleInput 中）

在现有键盘事件分发之前，增加一段 SGR 检测分支：

```
handleInput(data):
  if data starts with \x1b[< and matches /^\x1b\[<(64|65);\d+;\d+m$/:
    extract button code (64 or 65 from capture group)
    apply scroll offset change
    requestRender()
    return  // consumed
  // fall through to existing keyboard handling
```

### D4 — 代码结构

在 `ScrollableOutputViewer` 中封装两个辅助方法：
- `enableMouseMode()` — 发送 DECSET 序列
- `disableMouseMode()` — 发送 DECRST 序列

constructor 中调用 `enableMouseMode()`，并将 `done()` 包装以调用 `disableMouseMode()`。

## Risks / Migration

- **终端不支持 SGR mouse**：序列被静默忽略，不影响键盘操作。所有终端模拟器（iTerm2, Kitty, Terminal.app, Windows Terminal, tmux）均支持 SGR mouse mode，风险低
- **快速连续滚轮**：每个 tick 单独发送，逐个处理，不会丢失事件
- **与 ^ 和 v 键盘操作的手感差异**：键盘按 1 行，滚轮按 3 行。这是有意设计 — 滚轮 tick 的触感比键盘按键粗，3 行在长文本浏览中更自然
- **多覆层嵌套**：如果其他覆层也启用 mouse mode，后打开的会覆盖前一个的状态。但在当前使用场景中（ScrollableOutputViewer 是唯一的 overlay 使用方），不会出现冲突
- **session 异常退出**：mouse mode 是终端级别的设置，session 退出后终端自动恢复到默认状态，无泄漏风险
