# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 spec `planner-toggle` 中 10 个 requirement 的覆盖范围与边界
- [x] 1.2 确认设计决策 D4 (bash whitelist) 与 D5 (tool set) 已明确，无需外部协作

## 2. 核心实现任务

### 2.1 扩展骨架与状态管理
- [x] 2.1.1 创建 `.pi/extensions/planner-toggle.ts`，添加 default export 函数签名
  - 验证: `pi -e .pi/extensions/planner-toggle.ts` 无启动报错
- [x] 2.1.2 定义闭包状态变量 (`plannerEnabled`, `previousModelKey`) 和常量 (`PLANNER_MODEL_PROVIDER`, `PLANNER_MODEL_ID`, `PLANNER_TOOLS`, `DEFAULT_TOOLS`)
  - 覆盖 spec: State Persistence (数据模型)
  - 验证: 文件语法正确，通过 TypeScript 类型检查

### 2.2 Toggle 核心逻辑
- [x] 2.2.1 实现 `togglePlannerMode(ctx)` 函数
  - 激活分支: 查找 `deepseek/deepseek-v4-pro`，保存当前 model key，调用 `pi.setModel()`、`pi.setActiveTools()`、`updateStatus()`、`persistState()`
  - 退出分支: 恢复 `previousModelKey`，调用 `pi.setModel()`、`pi.setActiveTools()`、`updateStatus()`、`persistState()`
  - 容错: model 不存在时 `ctx.ui.notify("error")` 并阻止切换
  - 覆盖 spec: Shortcut Toggle, Command Toggle, Planner Mode Model, Default Mode Model Restore, Read-Only Tool Restriction
  - 验证: 函数逻辑完整，边界条件已处理

- [x] 2.2.2 实现 `updateStatus(ctx)` 函数
  - Planner 激活时 `ctx.ui.setStatus("planner-toggle", "⏸ planner")`
  - 退出时 `ctx.ui.setStatus("planner-toggle", undefined)`
  - 覆盖 spec: UI Status Indicator
  - 验证: 状态条更新逻辑正确

- [x] 2.2.3 实现 `persistState()` 函数
  - 调用 `pi.appendEntry("planner-toggle-state", { enabled: plannerEnabled, previousModelKey })`
  - 覆盖 spec: State Persistence (写入)
  - 验证: 持久化数据结构正确

### 2.3 用户入口
- [x] 2.3.1 注册 `Ctrl+Alt+P` 快捷键，handler 调用 `togglePlannerMode(ctx)`
  - 使用 `import { Key } from "@mariozechner/pi-tui"` + `Key.ctrlAlt("p")`
  - 覆盖 spec: Shortcut Toggle
  - 验证: shortcut handler 正确委托给 togglePlannerMode

- [x] 2.3.2 注册 `/planner` 命令，handler 调用 `togglePlannerMode(ctx)`
  - 覆盖 spec: Command Toggle
  - 验证: command handler 正确委托给 togglePlannerMode

### 2.4 工具拦截
- [x] 2.4.1 实现 `tool_call` handler
  - 非 planner 模式时直接 return（不拦截）
  - write/edit 工具: `return { block: true, reason: "..." }`
  - 覆盖 spec: Read-Only Tool Restriction (Write tool blocked)
  - 验证: handler 在正确条件下返回 block

- [x] 2.4.2 实现 bash whitelist 逻辑
  - 内联 `isSafeCommand(command: string): boolean` 函数
  - 白名单命令集参考 design D4 清单
  - 不安全命令: `return { block: true, reason: "..." }`
  - 覆盖 spec: Bash Command Whitelist
  - 验证: 至少覆盖 safe (ls, cat, grep, git log) 和 unsafe (rm, mv, > redirect) 命令

### 2.5 上下文注入与清理
- [x] 2.5.1 实现 `before_agent_start` handler
  - Planner 激活时注入 `{ customType: "planner-mode-context", content: "...", display: false }` 消息
  - 非 planner 模式时不注入
  - 覆盖 spec: Planner Mode System Instruction
  - 验证: 注入消息内容正确，display 为 false

- [x] 2.5.2 实现 `context` handler
  - Planner 未激活时，过滤 `customType === "planner-mode-context"` 的消息
  - 覆盖 spec: Stale Context Cleanup
  - 验证: 过滤逻辑正确，不影响其他消息

### 2.6 状态恢复
- [x] 2.6.1 实现 `session_start` handler
  - 从 `ctx.sessionManager.getEntries()` 读取 `planner-toggle-state` entry
  - 恢复 `plannerEnabled` 和 `previousModelKey`
  - 如果 planner 模式已激活，设置 `pi.setActiveTools(PLANNER_TOOLS)` 并调用 `updateStatus(ctx)`
  - 覆盖 spec: State Persistence (恢复)
  - 验证: 恢复后的工具集和状态指示与持久化状态一致

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点清单（每个 spec scenario 对应验证步骤）
- [x] 3.2 标记 writeback 摘要所需的变更状态与交付物清单

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
