# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/ask-user-guidance/spec.md` 三个 requirement 的实现目标：prompt-self-containment、anti-pattern-documentation、agents-md-reference
- [x] 1.2 确认 `specs/global-agent-guidance/spec.md` 一个 requirement 的实现目标：agents-md-tool-call-guidelines
- [x] 1.3 确认无外部依赖（无需上游 pi-ask 修改）

## 2. 核心实现任务

- [x] 2.1 创建 `.pi/agent/AGENTS.d/tool-ask-user.md`，内容包含：
  - 核心规则：prompt 自包含声明
  - 反模式示例：prompt 空引用 + option 信息缺失
  - 正确做法示例：内联完整决策信息
  - 触发条件：何时阅读本文件
  - 完成标准：文件存在且包含上述四部分
- [x] 2.2 修改 `.pi/agent/AGENTS.md`，在 `### MCP Tool / Dispatch` 之后、`## Markdown Output Quality` 之前插入 `### ask_user Tool` 小节：
  - 列出触发条件（确认决策、展示内部生成数据供用户判断）
  - 链接到 `AGENTS.d/tool-ask-user.md`
  - 完成标准：section 存在且位置正确、链接可解析
- [x] 2.3 提示用户执行 `scripts/sync-pi-agent.sh` 将变更同步到 `~/.pi/agent/`

## 3. 收敛与验证准备

- [x] 3.1 检查点：`tool-ask-user.md` 包含自包含规则 + 反模式 + 正确做法
- [x] 3.2 检查点：`AGENTS.md` 包含 ask_user Tool 引用节且位置正确
- [x] 3.3 检查点：两个文件无语法错误、链接可解析

## 4. 验证与回写收敛

- [x] 4.1 基于 verification.md 执行 spec-to-implementation 覆盖检查
- [x] 4.2 基于 writeback.md 执行回写（本 change 无外部回写目标，仅需记录状态）
