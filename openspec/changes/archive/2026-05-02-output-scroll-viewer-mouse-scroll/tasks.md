# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 specs 范围：仅修改 `output-scroll-viewer` capability，增加鼠标滚轮场景（mouse-wheel-scroll-up、mouse-wheel-scroll-down、mouse-mode-enable-on-open、mouse-mode-disable-on-close、mouse-other-buttons-ignored）
- [x] 1.2 确认实现文件：仅 `.pi/extensions/output-scroll-viewer.ts` 需要修改，无外部依赖

## 2. 核心实现任务

- [x] 2.1 在 `ScrollableOutputViewer` 类中增加 `enableMouseMode()` 私有方法
  - 写入序列：`\x1b[?1000h\x1b[?1006h`
  - 通过 `this.tui.terminal.write()` 调用
  - **验证**: constructor 调用后，终端发送鼠标事件序列

- [x] 2.2 在 `ScrollableOutputViewer` 类中增加 `disableMouseMode()` 私有方法
  - 写入序列：`\x1b[?1000l\x1b[?1006l`
  - 通过 `this.tui.terminal.write()` 调用
  - **验证**: 调用后终端停止发送鼠标事件

- [x] 2.3 修改 constructor：调用 `enableMouseMode()`，并包装 `done()` 回调
  - 在 constructor 末尾调用 `enableMouseMode()`
  - 用闭包包装原始的 `done` 函数：先调 `disableMouseMode()`，再调原始 `done()`
  - **验证**: 覆层打开后终端响应鼠标滚轮；关闭后恢复正常

- [x] 2.4 在 `handleInput()` 开头增加 SGR 鼠标滚轮解析分支
  - 正则匹配：`/^\x1b\[<(64|65);\d+;\d+m$/`
  - 匹配 64 → `scrollOffset = Math.max(0, scrollOffset - 3)`
  - 匹配 65 → `scrollOffset = Math.min(maxOffset, scrollOffset + 3)`
  - 消费事件后 `this.tui.requestRender()` 并 return
  - 不匹配时 fallthrough 到现有键盘处理逻辑
  - **验证**: 滚轮上滚 3 行、下滚 3 行；键盘操作不变

- [x] 2.5 确认非滚轮鼠标事件被静默忽略
  - button code 非 64/65 的 SGR 序列不触发任何操作，由 handleInput 的 SGR 捕获分支消费后 return 自动保证
  - **验证**: 鼠标点击不触发滚动

## 3. 收敛与验证准备

- [x] 3.1 验证准备 checklist：
  - `pi -e .pi/extensions/output-scroll-viewer.ts` 无启动错误
  - `/reload` 后扩展正常重新加载
  - 覆层打开后鼠标滚轮生效，关闭后恢复
  - 键盘操作与鼠标操作互不冲突

- [x] 3.2 回写准备：修改项仅有 `.pi/extensions/output-scroll-viewer.ts`，回写摘要记录于 writeback.md

## 4. 验证与回写收敛

- [x] 4.1 基于实际实现结果更新 verification.md
- [x] 4.2 基于 verification.md 结论生成 writeback.md
- [x] 4.3 执行 writeback.md 中定义的写回（如有外部页面）
