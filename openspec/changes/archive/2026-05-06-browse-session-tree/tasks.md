# Tasks

## 1. 实现准备

- [x] 1.1 确认 `SessionTreeNode` 类型可从 `pi-coding-agent` 导入（或找到降级方案）
- [x] 1.2 确认 `pi-tui` 导出组件清单（`Container`, `Text`, `Spacer`, `TruncatedText`, `DynamicBorder`, `Input` 等）
- [x] 1.3 确认 `ctx.ui.custom()` 接收的回调签名和 `done()` 用法

## 2. 核心实现

> **最终实现方式**：不自行实现树渲染。创建 `TreeSelectorComponent` 获取其内部 `TreeList` 实例，直接复用 `treeList.render()` / `treeList.handleInput()`（与内置 `/tree` 完全相同的渲染内核）。BrowseComponent 仅负责输入路由和 DetailPanel 管理。

### 2.1 扩展骨架与命令注册

- [x] 2.1.1 创建 `.pi/extensions/browse-session-tree.ts`
- [x] 2.1.2 实现 `globalThis` dedup 标记 + `session_shutdown` 清理
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
- [x] **2.3.7** 滚动键从 ↑/↓ 改为 j/k（±1 行），PgUp/PgDn 保留（±1 页）
- [x] 2.3.8 鼠标滚轮：SGR mouse mode（DECSET 1000+1006），±3 行/次
- [x] 2.3.9 长文本换行：`wrapLines(text, 100)` 按字符宽度折行；`allText()` 支持 `type: "text"` 和 `"input_text"`
- [x] 2.3.10 展开时自动滚动到顶部（setEntry 时 offset 归零）

### 2.4 BrowseComponent — 组合与输入路由（重写）

- [x] **2.4.1** 新增 `searchMode: boolean` 状态字段，初始 `false`
- [x] **2.4.2** 重写 `handleInput()` 为状态机路由：
  - **Search 模式**：`/` 进入（折叠 detail），可打印字符 → treeList（搜索），Escape 退出（清空筛选），Enter 退出（保留筛选），↑/↓ 导航筛选结果
  - **Normal + detail 折叠**：↑/↓/PgUp/PgDn → treeList；Space → 展开；`/` → 进入搜索；**可打印字符被拦截**（不触发隐式搜索）
  - **Normal + detail 展开（Reading）**：j/k/PgUp/PgDn/鼠标 → detail；↑/↓ → 折叠 + treeList；Space → 折叠；`/` → 进入搜索
- [x] 2.4.3 TreeList.onSelect → `done({ navigate, targetId })`；onCancel → `done({ cancel })`
- [x] 2.4.4 选择变化时自动更新 DetailPanel 内容
- [x] 2.4.5 `dispose()` 关闭鼠标模式
- [x] 2.4.6 `ctx.ui.custom()` inline 模式（不传 `overlay`）
- [x] **2.4.7** 所有 `truncateToWidth()` 调用增加 `pad=true` 参数
- [x] **2.4.8** `render()` 在搜索模式下追加搜索提示行（`/查询内容`）

### 2.5 命令注册与入口

- [x] 2.5.1 `pi.registerCommand("browse", { handler })` — 不带 `/` 前缀
- [x] 2.5.2 空 session 守卫：`tree.length === 0` 时直接 return
- [x] 2.5.3 navigate 结果处理：`ctx.navigateTree(result.targetId)`

## 3. 验证

- [x] 3.1 功能验证：`pi -e .pi/extensions/browse-session-tree.ts` 启动，测试所有快捷键
- [x] 3.2 ↑/↓ 行为验证：detail 展开时按 ↑/↓ → 面板折叠 + 光标移动；detail 折叠时按 ↑/↓ → 光标正常移动
- [x] 3.3 j/k 验证：detail 展开时按 j/k → 面板滚动 ±1 行；detail 折叠时按 j/k → 无操作
- [x] 3.4 PgUp/PgDn 验证：detail 展开时 → 面板滚动 ±1 页；detail 折叠时 → 树分页导航
- [x] 3.5 搜索验证：按 `/` → 进入搜索，detail 折叠，输入字符筛选树；Enter → 退出搜索保留筛选；Escape → 退出搜索清除筛选
- [x] 3.6 隐式搜索验证：detail 展开时按字母键 → 不触发搜索，不改变筛选状态
- [x] 3.7 pad=true 验证：切换包含 CJK/emoji 内容的节点 → 面板边框无残影
- [x] 3.8 整体场景验证：创建包含 tool calls 的 session，完整走一遍：导航 → 看详情 → 搜索 → 跳转
- [x] 3.9 热重载验证：修改扩展代码后 `/reload`，确认扩展重新加载无报错
- [x] 3.10 dedup 验证：`/reload` 后确认扩展只注册一次 `/browse` 命令

## 4. 部署

- [x] 4.1 运行 `./scripts/sync-pi-agent.sh` 同步扩展到全局
- [x] 4.2 更新 `.pi/capabilities.yaml`，在 `global.extensions` 追加 `browse-session-tree`
- [x] 4.3 验证全局同步后，新 session 中 `/browse` 可用
- [x] 4.4 归档 change：`openspec archive browse-session-tree`
