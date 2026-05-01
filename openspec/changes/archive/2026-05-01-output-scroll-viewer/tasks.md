# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 capability `output-scroll-viewer` 的 spec 实现范围：仅最后一条 assistant 消息、Markdown 渲染、不覆盖 tool result
- [x] 1.2 确认设计决策：单文件扩展 `output-scroll-viewer.ts`、`agent_end` 事件、`ctx.ui.custom({ overlay: true })`

## 2. 核心实现任务

### 2.1 创建扩展骨架与生命周期钩子

- [x] 2.1.1 在 `.pi/extensions/output-scroll-viewer.ts` 创建默认导出函数
- [x] 2.1.2 添加 `globalThis` 自去重标记和 `session_shutdown` 清理 handler
- [x] 2.1.3 注册 `agent_end` 事件 handler
- [x] 2.1.4 注册 `session_start` 事件 handler（捕获 `tui` 引用，获取 `terminal.rows`）
- **覆盖 spec**: `agent-completion-detection`, `dedup-and-lifecycle`
- **验证方式**: 启动 pi 后 `/reload` 观察无重复注册错误

### 2.2 实现多屏检测逻辑

- [x] 2.2.1 在 `agent_end` 中从 `ctx.sessionManager.getBranch()` 获取最后一条 assistant 消息
- [x] 2.2.2 提取 assistant 消息中的 text content（兼容 content 数组和字符串格式）
- [x] 2.2.3 实现两阶段多屏检测：快速行数估算 → 精确 Markdown 渲染
- [x] 2.2.4 渲染后行数未超 `terminal.rows` 时，跳过交互
- **覆盖 spec**: `assistant-message-capture`, `multi-screen-detection`
- **验证方式**: 用短 prompt 和长 prompt 分别测试，确认短输出不触发、长输出触发

### 2.3 实现确认对话框

- [x] 2.3.1 检测到多屏后，调用 `ctx.ui.confirm()` 弹窗
- [x] 2.3.2 对话框标题 `"Output Scroll Viewer"`，消息包含估算屏幕数
- [x] 2.3.3 用户确认 → 执行 2.4；用户取消 → 无操作
- **覆盖 spec**: `confirmation-dialog`
- **验证方式**: 触发多屏后观察对话框出现，测试确认和取消两种情况

### 2.4 实现可滚动 Overlay 查看器组件

- [x] 2.4.1 创建 `ScrollableOutputViewer` 组件类（实现 `Component` 接口）
- [x] 2.4.2 组件内部维护 `lines`（渲染后行列表）、`scrollOffset`、`maxVisibleLines`
- [x] 2.4.3 在 `render()` 中：截取可见行 + 边框 + 标题栏 + 滚动指示器
- [x] 2.4.4 用 pi-tui `Markdown` 组件渲染文本
- [x] 2.4.5 实现键盘导航：`↑`/`k`（上滚一行）、`↓`/`j`（下滚一行）
- [x] 2.4.6 实现键盘导航：`PageUp`/`Ctrl+u`（上翻一页）、`PageDown`/`Ctrl+d`（下翻一页）
- [x] 2.4.7 实现键盘导航：`Home`/`g`（跳转开头）、`End`/`G`/`Shift+g`（跳转结尾）
- [x] 2.4.8 实现键盘关闭：`Escape`/`q`/`Ctrl+c`（关闭 overlay）
- [x] 2.4.9 在 `agent_end` handler 中用 `ctx.ui.custom({ overlay: true })` 调用组件工厂
- **覆盖 spec**: `scrollable-overlay-viewer`
- **验证方式**: `pi -e .pi/extensions/output-scroll-viewer.ts` 执行，触发长篇输出后测试所有键盘操作

### 2.5 处理边缘情况和边界条件

- [x] 2.5.1 `agent_end` 时无 assistant 消息 → 静默返回
- [x] 2.5.2 assistant 消息仅有 tool call 无文本 → 静默返回
- [x] 2.5.3 文本极短（刚好等于一屏）→ 不触发
- [x] 2.5.4 `ctx.ui` 不可用（print/JSON 模式 `ctx.hasUI === false`）→ 静默返回
- [x] 2.5.5 `terminal.rows` 未获取到时使用默认值 24
- [x] 2.5.6 overlay 打开后终端 resize → 在当前打开周期内使用现有尺寸（关闭后下次重新检测时使用新尺寸）
- **验证方式**: 逐一覆盖上述场景

## 3. 收敛与验证准备

- [x] 3.1 整理验证检查点：每个 spec requirement 至少一个验证场景
- [x] 3.2 标记需要加入 verification.md 的 pass/fail 证据

## 4. 验证与回写收敛

- [x] 4.1 基于实现结果生成 `verification.md`（覆盖 spec-to-implementation）
- [x] 4.2 基于 verification 结论生成 `writeback.md`
