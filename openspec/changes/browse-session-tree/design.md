# Design

## Context

Pi 内置 `/tree` 命令使用 `TreeSelectorComponent`（`packages/coding-agent/src/modes/interactive/components/tree-selector.ts`）实现 session 树导航。本 change 通过注册新命令 `/browse` 提供独立的增强浏览器，在 session 树的基础上添加详情预览面板。

## 最终架构（经历多轮迭代后确定）

### 树渲染：复用内置 TreeList 内核

经过多轮自研 TreePanel 失败（缩进错误、diff 不稳定、escape codes 导致渲染混乱），最终方案是**直接复用内置 `/tree` 的 TreeList 类**：
- 创建 `TreeSelectorComponent` 实例以获取其内部 `TreeList`
- 调用 `treeList.render()` 和 `treeList.handleInput()` —— 与内置 `/tree` **完全相同的渲染和交互逻辑**
- **不**将 TreeSelectorComponent 加入 Container 子节点链（避免其 chrome 挤占空间）

### 渲染模式：inline（与内置 /tree 一致）

使用 `ctx.ui.custom()` **不传 `overlay` 选项**，TUI 将 editorContainer 替换为组件。

尝试过 overlay 模式发现的问题：
- overlay compositing 需要两次渲染再 diff，导致视觉"跳"
- 差分渲染器在处理大量 escape codes 时不稳定

### DetailPanel：固定高度 scrollview

- 高度 = `3 + maxLines`（2 边框 + 1 指示器 + maxLines 内容行），始终不变
- 折叠时显示占位文字 "Press Space for detail"
- 展开时内容超过 maxLines 通过 scroll offset 控制可见范围
- 键盘滚动：↑/↓ (±1)、PageUp/PageDown (±page)
- 鼠标滚轮：SGR mouse mode，±3 行/次
- 内容提取：`allText()` 支持 `type: "text"` 和 `"input_text"`，`wrapLines()` 按 100 字符换行

## Goals / Non-Goals

**Goals:**
- 注册 `/browse` 命令，启动自定义 TUI 浏览器
- 实现完整子树折叠（任意有子节点的节点均可折叠）
- 实现 DetailPanel 预览（默认折叠，Space 展开/折叠）
- 支持搜索过滤和 filter mode 循环
- 支持 Enter 跳转导航和 Escape/q 取消
- 包含 `globalThis` dedup 和 `session_shutdown` 清理
- 单文件扩展模式（`.pi/extensions/browse-session-tree.ts`）
- 全局同步（通过 `scripts/sync-pi-agent.sh` + `capabilities.yaml`）

**Non-Goals:**
- 不修改或替换内置 `/tree`
- 不支持 label 编辑（已有 `/bookmark`）
- 不引入新 npm 依赖
- 不修改 session 数据格式
- 不实现分支总结（branch summary）生成

## Decisions

### D1: 单文件扩展模式
（保持）

### D2: 树渲染 — 复用内置 TreeList 内核

**Decision**: 不自行实现树渲染。通过创建 `TreeSelectorComponent` 获取其内部 `TreeList` 实例，直接使用 `treeList.render()` / `treeList.handleInput()`。

**Rationale**: 多轮自研 TreePanel 均失败——缩进计算、escape codes、TUI diff 稳定性等问题反复出现。内置 `/tree` 的 TreeList 已经过充分验证，直接复用是唯一可靠的方案。

### D3: 渲染模式 — inline

**Decision**: `ctx.ui.custom()` 不传 `overlay`。

**Rationale**: Overlay compositing 导致两次渲染 + diff 开销，视觉不稳定。Inline 模式与内置 `/tree` 的 `showSelector()` 架构一致。

### D4: DetailPanel — 固定高度 scrollview

**Decision**: DetailPanel 始终返回固定行数（`3 + maxLines`），折叠时显示占位文字。内容通过 scroll offset 控制可见范围。

**Rationale**: 避免面板扩展/折叠时改变整体布局高度，防止挤占树区域或 TUI 布局不稳定。

### D5: 鼠标滚轮 — SGR mouse mode

**Decision**: DetailPanel 展开时 `DECSET 1000+1006`，滚轮 ±3 行。折叠/关闭时禁用。

**Rationale**: 参考 `output-scroll-viewer.ts`。

### D6: 输入路由

**Decision**: BrowseComponent.handleInput 先检查 Space（toggle detail），再路由详情展开时的 scroll/mouse 键到 DetailPanel，其余委托给 TreeList。

## 遇到的问题与经验

| 问题 | 根因 | 解决 |
|------|------|------|
| 自研 TreePanel 线性链缩进过深 | 子节点固定 `depth+1`，未处理 single-child chain | 改用 TreeList 内置 flatten 逻辑 |
| 光标移动时列表文字"跳" | overlay compositing + escape codes 干扰 TUI diff | 回退到 inline 模式 + 复用 TreeList |
| escape codes 导致 raw string 超宽 | 手写 truncation 未限制 raw byte 长度 | 统一用 `truncateToWidth` 截断所有渲染行 |
| 命令自动补全为 `//browse` | 命令名包含 `/` 前缀 + `applyCompletion` 自动加 `/` | `registerCommand("browse", ...)` 不加 `/` |
| `/browse` 执行无效果 | handler 参数签名错误：缺少 `args` 参数 | `handler: async (_args, ctx) => {...}` |
| 初始光标在 model_change 条目上 | default filter 未过滤系统类型 entry | filter mode 添加 `isSettingsEntry` 检查 |
| 详情面板高度不稳定 | 折叠时 `render()` 返回空数组，展开返回内容 | 改为始终返回固定行数，折叠时显示占位文字 |
| 滚动键未路由到 DetailPanel | handleInput 只委托给 treeList | 添加详情展开时的 scroll/mouse 键路由 |

## Risks / Migration

### Risk 1: `pi-tui` API 变化

**Risk**: Pi TUI 组件 API 可能在后续版本中变化，导致扩展报错。

**Mitigation**: 仅使用稳定的基础组件（`Container`, `Text`, `Spacer`, `DynamicBorder`, `TruncatedText`, `Input`），避免使用实验性功能。扩展代码保持简洁，便于后续适配。

### Risk 2: `SessionTreeNode` 类型未导出

**Risk**: `SessionTreeNode` 类型可能未从 `@mariozechner/pi-coding-agent` 导出，导致 TypeScript 编译错误。

**Mitigation**: 源码调研确认 `SessionTreeNode` 在 `session-manager.ts` 中定义。若未导出，使用 `Parameters<typeof ctx.sessionManager.getTree>[0]` 或 `any` 类型降级。实现时先验证类型可用性。

### Risk 3: 与内置 `/tree` 快捷键冲突

**Risk**: 用户可能习惯 `/tree` 的 `Ctrl+←/→` fold 快捷键，在 `/browse` 中使用不同的 `h`/`l` 映射。

**Mitigation**: 在浏览器底部显示快捷键提示栏，明确标注可用快捷键。后续可通过 `getKeybindings()` 支持用户自定义快捷键。

### Risk 4: DetailPanel 长内容渲染性能

**Risk**: assistant 的完整回复可能数百行，DetailPanel 渲染全部内容可能影响 TUI 性能。

**Mitigation**: 实现惰性渲染——只渲染可见区域内的文本行。由于 `ui.custom()` 组件的 `render()` 每次只渲染当前帧，通过控制 DetailPanel 高度限制实际渲染行数。

### Migration

- 无迁移需求（新增功能，不影响现有 workflow）
- 用户可同时使用 `/tree`（快速跳转）和 `/browse`（预览详情）
