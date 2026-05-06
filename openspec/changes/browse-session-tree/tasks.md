# Tasks

## 1. 实现准备

- [x] 1.1 确认 `SessionTreeNode` 类型可从 `pi-coding-agent` 导入（或找到降级方案）
- [x] 1.2 确认 `pi-tui` 导出组件清单（`Container`, `Text`, `Spacer`, `TruncatedText`, `DynamicBorder`, `Input` 等）
- [x] 1.3 确认 `ctx.ui.custom()` 接收的回调签名和 `done()` 用法

## 2. 核心实现

> **最终实现方式**：不自行实现树渲染。创建 `TreeSelectorComponent` 获取其内部 `TreeList` 实例，直接复用 `treeList.render()` / `treeList.handleInput()`（与内置 `/tree` 完全相同的渲染内核）。BrowseComponent 仅负责输入路由和 DetailPanel 管理。

### 2.1 扩展骨架与命令注册

- [x] 2.1.1 创建 `.pi/extensions/browse-session-tree.ts`
- [x] 2.1.2 实现 `globalThis` dedup 标记 + `session_shutdown` 清理（D8）
- [x] 2.1.3 注册 `browse` 命令（不带 `/` 前缀，避免 autocomplete 双斜线）
- [x] 2.1.4 handler 签名修正：`handler: async (_args: string, ctx: ExtensionCommandContext)`

### 2.2 树渲染 — 复用内置 TreeList

- [x] 2.2.1 创建 `TreeSelectorComponent` 实例获取内部 `TreeList`
- [x] 2.2.2 调用 `treeList.render(width)` 渲染树列表（与 `/tree` 完全相同）
- [x] 2.2.3 调用 `treeList.handleInput(data)` 处理树导航/搜索/fold/filter
- [x] 2.2.4 通过 `treeList.getSelectedNode()` 获取当前选中节点
- [x] 2.2.5 TreeSelectorComponent **不**加入 BrowseComponent 子节点链（避免 chrome 挤占空间）

### 2.3 DetailPanel — 固定高度 scrollview

- [x] 2.3.1 DetailPanel 类，默认折叠，Space 切换
- [x] 2.3.2 `render()` 始终返回 `3 + maxLines` 行（折叠时占位文字，展开时内容+滚动）
- [x] 2.3.3 assistant 节点详情：role、model、完整 text、tool calls 参数
- [x] 2.3.4 tool/toolResult 节点详情：toolName、isError、完整 output
- [x] 2.3.5 user 节点详情：完整 content、图片附件计数
- [x] 2.3.6 其他类型：compaction、branch_summary、model_change、thinking_level_change
- [x] 2.3.7 键盘滚动：↑/↓ (±1)、PageUp/PageDown (±page)
- [x] 2.3.8 鼠标滚轮：SGR mouse mode（DECSET 1000+1006），±3 行/次
- [x] 2.3.9 长文本换行：`wrapLines(text, 100)` 按字符宽度折行；`allText()` 支持 `type: "text"` 和 `"input_text"`

### 2.4 BrowseComponent — 组合与输入路由

- [x] 2.4.1 Container 子类，组合 TreeList + DetailPanel
- [x] 2.4.2 输入路由：Space → toggle detail；scroll/mouse 键 → detail（展开时）；其余 → treeList
- [x] 2.4.3 TreeList.onSelect → `done({ navigate, targetId })`；onCancel → `done({ cancel })`
- [x] 2.4.4 选择变化时自动更新 DetailPanel 内容
- [x] 2.4.5 `dispose()` 关闭鼠标模式
- [x] 2.4.6 `ctx.ui.custom()` inline 模式（不传 `overlay`）
- [x] 2.4.7 所有渲染行使用 `truncateToWidth()` 截断

### 2.5 命令注册与入口

- [x] 2.5.1 `pi.registerCommand("browse", { handler })` — 不带 `/` 前缀
- [x] 2.5.2 空 session 守卫：`tree.length === 0` 时直接 return
- [x] 2.5.3 navigate 结果处理：`ctx.navigateTree(result.targetId)`

## 3. 验证

- [ ] 3.1 功能验证：`pi -e .pi/extensions/browse-session-tree.ts` 启动，测试所有快捷键
- [ ] 3.2 场景验证：创建包含 tool calls 的 session，确认线性链上的 assistant 节点可以折叠其 tool result 子节点
- [ ] 3.3 场景验证：选中 assistant 节点，展开 DetailPanel，确认显示完整回复内容
- [ ] 3.4 场景验证：选中 tool result 节点，确认显示完整 tool 输出
- [ ] 3.5 跳转验证：选中某节点按 Enter，确认 session 跳转到该节点，可继续对话
- [ ] 3.6 热重载验证：修改扩展代码后 `/reload`，确认扩展重新加载无报错
- [ ] 3.7 dedup 验证：`/reload` 后确认扩展只注册一次 `/browse` 命令

## 4. 部署

- [ ] 4.1 运行 `./scripts/sync-pi-agent.sh` 同步扩展到全局
- [ ] 4.2 更新 `.pi/capabilities.yaml`，在 `global.extensions` 追加 `browse-session-tree`
- [ ] 4.3 验证全局同步后，新 session 中 `/browse` 可用
- [ ] 4.4 归档 change：`openspec archive browse-session-tree`
