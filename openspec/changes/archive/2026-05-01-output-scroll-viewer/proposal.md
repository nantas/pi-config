# Proposal

## 问题定义

在 Agent 执行完复杂任务（大量 tool call + thinking 分析）后生成的最终方案/结论/执行结果文本超过一屏时，用户必须手动向上滚动终端 scrollback 到正式输出文本开头才能开始阅读。这个滚动操作打断了阅读流，降低了用户体验。

本 change 通过 Pi 扩展系统，在 Agent 输出完成后检测文本长度是否超过一屏，如是则弹出一个本地确认对话框，让用户选择是否自动打开一个可滚动的 overlay 文本查看器，从输出开头开始浏览。

## 范围边界

**范围之内：**
- 仅处理最后一条 assistant 消息（Agent 最终输出文本）
- 仅当文本渲染行数超过终端可见行数时才触发交互
- 使用 overlay 模式展示可滚动的 Markdown 渲染文本
- 键盘导航（↑/↓、Page Up/Down、Home/End、Esc/q）关闭

**范围之外：**
- 不处理 tool call 输出或 tool result
- 不修改终端原生 scrollback 行为
- 不覆盖多条消息的聚合查看
- 不涉及 /session 切换或跨会话场景
- 不修改 pi 核心代码（纯扩展实现）

## Capabilities

### New Capabilities
- `output-scroll-viewer`: Agent 完成长篇输出后，弹窗确认是否启动可滚动 overlay 查看输出正文的开头

### Modified Capabilities
- (无)

## Capabilities 待确认项

- [x] 能力清单已与用户确认（仅一个 capability）

## Impact

**新增文件：**
- `.pi/extensions/output-scroll-viewer.ts` — 扩展主文件（单文件模式，约 200-300 行）

**修改文件：**
- 无（扩展自动发现，无需修改 settings.json）

**外部依赖：**
- 无（使用 pi 内置的 `@mariozechner/pi-tui` 的 Markdown、Component、Container，`typebox`，以及 `@mariozechner/pi-coding-agent` 的 ExtensionAPI 类型）

**安全性：**
- 扩展运行在 pi 进程内，不执行外部命令
- 不读写文件系统
- 无网络请求

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部回写目标
