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
- 键盘滚动：j/k (±1)、PageUp/PageDown (±page)
- 鼠标滚轮：SGR mouse mode，±3 行/次
- 内容提取：`allText()` 支持 `type: "text"` 和 `"input_text"`，`wrapLines()` 按 100 字符换行

### 输入路由：三态状态机

BrowseComponent 维护一个状态机，管理三种模式：

```
                  ┌──────────┐
                  │ Normal   │  ← detail 折叠/展开，导航树，阅读详情
                  └────┬─────┘
                       │
              ┌────────┴────────┐
     ┌───────┤  按 / 进入搜索    ├──────────┐
     │       └─────────────────┘          │
     │                                     │
     ▼                                     ▼
┌──────────┐                        ┌──────────┐
│  Search  │   Escape/Enter 退出    │ Reading  │  ← detail 展开时
│ (detail  │ ──────────────────→   │ (detail  │
│  折叠)   │                        │  展开)   │
└──────────┘                        └────┬─────┘
     │                                    │
     └── Space/↑↓ 退出 Reading ───────────┘
         回到 Normal
```

**Normal 模式**（detail 可折叠或展开）：
- ↑/↓：detail 展开时折叠 + 导航树；折叠时直接导航树
- Space：切换 detail 折叠/展开
- j/k：detail 展开时滚动 detail（±1行）；折叠时无操作
- PgUp/PgDn：detail 展开时滚动 detail（±1页）；折叠时导航树（分页）
- 鼠标滚轮：detail 展开时滚动 detail
- /：进入搜索模式（自动折叠 detail）
- Enter：跳转到选中节点
- Escape：有搜索残留时清空，否则退出 /browse
- 其他可打印字符：忽略（不触发 TreeList 的隐式搜索）

**Reading 模式**（与 Normal 的 detail 展开态行为相同，强调阅读体验）：
- 与 Normal 模式共享同一状态变量 `detail.expanded`，没有独立状态位
- 仅 routing 行为不同：↑/↓ 折叠 + 导航，而不是导航树

**Search 模式**（detail 始终折叠）：
- 可打印字符：追加到搜索词，树实时筛选
- Backspace：删除末位搜索词字符
- ↑/↓：在筛选结果中导航
- Enter：退出搜索模式（保留当前筛选状态）
- Escape：退出搜索模式（清空筛选，恢复全树）
- Space、/ 等：忽略

## Goals / Non-Goals

**Goals:**
- 注册 `/browse` 命令，启动自定义 TUI 浏览器
- 实现完整子树折叠（任意有子节点的节点均可折叠）
- 实现 DetailPanel 预览（默认折叠，Space 展开/折叠）
- 显式搜索模式（`/` 进入，Escape/Enter 退出）
- 支持 Enter 跳转导航和 Escape/q 取消
- 消除 ↑/↓ 路由冲突：↑/↓ 在 detail 展开时关闭 panel + 导航树
- 消除隐式搜索：detail 展开时，可打印字符不触发搜索
- 消除 DetailPanel 宽行显示残影：所有渲染行用 `pad=true` 确保严格对齐
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

### D6: DetailPanel 滚动键映射

**Decision**: ↑/↓ 不再路由到 DetailPanel（改为折叠 + 导航树），替换为 j/k（±1 行）。PgUp/PgDn 保留作页面滚动。

**Rationale**: 
- ↑/↓ 是标准的树导航键，在 detail 展开时路由到面板会阻止用户移动光标
- j/k 在 detail 上下文中是"读"的操作，语义清晰
- 参考 vim/less 的滚动习惯

### D7: 搜索模式 — 显式触发

**Decision**: 按 `/` 进入搜索模式，可打印字符追加搜索词，Escape 退出（清空筛选），Enter 退出（保留筛选）。搜索模式下 detail 自动折叠。Normal 模式下的可打印字符（非快捷键）不再转发到 TreeList，禁止隐式搜索。

**Rationale**:
- 隐式搜索在 detail 存在时与 j/k 冲突（'j' 既是搜索字符又是 detail 滚动键）
- 显式触发让用户明确知道当前处于搜索状态
- 搜索模式下 detail 折叠避免了"边搜边看"的混淆状态
- Enter/Escape 的退出策略提供了"保留结果"和"清除结果"两种选择

### D8: 渲染行严格对齐 — truncateToWidth pad=true

**Decision**: DetailPanel 和 BrowseComponent 的所有 `truncateToWidth()` 调用使用 `pad=true`，确保每行严格等于 `width` 可见宽度。

**Rationale**: 内容行的 visible width 可能因宽字符（emoji/CJK）而小于 panel 宽度。缺少 `pad=true` 时，TUI diff 引擎输出短行，终端不自动清除旧帧残影字符，导致视觉上"边框撑爆"。`pad=true` 补齐空格到精确宽度，消除残影。

**Future improvement**: 宽字符的精确换行需要替换 `padEnd`/`slice` 为 visibleWidth 感知方案（用 `sliceByColumn`），当前不在 scope 内。

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
| ↑/↓ 在 detail 展开时与导航冲突 | 面板占用 ↑/↓ 导致用户无法移动光标 | ↑/↓ 折叠 + 导航树，j/k 替换为面板滚动 |
| 隐式搜索与 j/k 键冲突 | TreeList 的 fallthrough 把所有字符都当搜索词 | `/` 显式搜索模式，normal 模式不转发可打印字符 |
| Detail 面板文字内容撑爆 | 宽字符行 visible width 不足，`truncateToWidth` 无 pad | 所有渲染行加 `pad=true` 严格对齐 |

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

### Risk 5: 搜索模式视觉反馈不足

**Risk**: 用户按下 `/` 后没有明显反馈，不知道自己进入了搜索模式。

**Mitigation**: BrowseComponent.render() 在搜索模式下追加搜索提示行，格式为 `/用户输入`，显示在 DetailPanel 上方。

### Migration

- 无迁移需求（新增功能，不影响现有 workflow）
- 用户可同时使用 `/tree`（快速跳转）和 `/browse`（预览详情）
