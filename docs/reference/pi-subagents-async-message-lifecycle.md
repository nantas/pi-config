# Pi Subagents — Async 消息与交互生命周期

> 本文档记录 pi-subagents 异步模式下，消息投递、回合触发、并发排队的完整机制。
> 来源：pi-subagents 0.24 + pi-mono (agent-core 0.73 + coding-agent) 源码分析。
> 用途：理解 async subagent 的生命周期行为，指导 prompt 设计和 notify 策略。

## 1. 角色与核心概念

| 概念 | 说明 |
|------|------|
| **主 agent** | 当前 Pi session 的 LLM，调用 `subagent(...)` 的调用方 |
| **子 agent** | `subagent()` spawn 的子进程 Pi session，执行委派任务 |
| **回合 (turn)** | 主 agent 的一次 LLM 流式响应周期，包含流式生成 + 工具执行 |
| **消息队列** | Agent 内部的 `steeringQueue` / `followUpQueue`，管理并发消息 |
| **notify** | 子 agent 完成后，pi-subagents 扩展向主 session 发送的通知 |

## 2. Async 派发流程

```
subagent({agent:"worker", task:"...", async:true})
  │
  ├── 1. 扩展验证参数，spawn 子进程 (jiti CLI → pi session)
  │
  ├── 2. 立即返回 tool result，包含 runId
  │     └── result.terminate = false  (默认)
  │
  ├── 3. tool result 回到 agent loop
  │     └── shouldTerminateToolBatch(finalizedCalls)
  │         → 所有 tool 的 terminate 都 === true 时返回 true
  │         → 否则返回 false
  │
  ├── terminate=false → hasMoreToolCalls = true
  │     → inner loop 继续 → 再次调用 LLM
  │     → LLM 看到 tool result，决定下一步
  │
  └── terminate=true → hasMoreToolCalls = false
        → inner loop 退出，跳过再调 LLM
        → 更高效，省一次 LLM roundtrip
```

**关键控制点**：`terminate` 标志位决定 async 返回后是否立即再调 LLM。

## 3. 子 agent 完成通知流程

```
子 agent 进程退出
  │
  ├── 子进程写入 result JSON 到 async-subagent-results/
  │
  ├── result-watcher (fs.watch) 或 poller 检测到完成
  │
  ├── 扩展 emit SUBAGENT_ASYNC_COMPLETE_EVENT
  │     ├── async-job-tracker.handleComplete → 更新状态 + cleanup
  │     └── notify.handleComplete → pi.sendMessage()
  │
  └── notify.ts 调用：
        pi.sendMessage(
          { customType: "subagent-notify", content, display: true },
          { triggerTurn: true }
        )
```

## 4. `sendCustomMessage` 三路分发

通知进入 pi-mono 框架层后的关键分发逻辑（`agent-session.ts` `sendCustomMessage()`）：

```
sendCustomMessage(msg, options)
  │
  ├── options.deliverAs === "nextTurn"
  │     → _pendingNextTurnMessages.push(msg)
  │     → 不触发 LLM，等到用户下次 prompt() 时注入
  │     → 不持久化到 session 文件
  │
  ├── isStreaming === true  (agent 正在处理中)
  │     ├── options.deliverAs === "followUp"
  │     │   → agent.followUp(msg)
  │     │   → followUpQueue 排队 (outer loop 结束后处理)
  │     │
  │     └── else (含 deliverAs 未指定)
  │         → agent.steer(msg)
  │         → steeringQueue 排队 (inner loop 迭代间处理)
  │
  ├── isStreaming === false && triggerTurn === true
  │     → agent.prompt(msg)
  │     → 启动新回合，LLM 处理该消息
  │
  └── else (无 triggerTurn, 无 deliverAs, idle)
      → state.messages.push(msg)
      → 追加到会话时间线，持久化到 session
      → 不触发 LLM 回合
      → LLM 下次回合时通过 convertToLlm() 读到
        (custom role → user role, 保留 timestamp)
```

### 4.1 三种投递模式对比

| 模式 | 触发方式 | LLM 回合 | 时间线位置 | 持久化 |
|------|----------|----------|------------|--------|
| `triggerTurn: true` | 立即 | 启动新回合 | 回合开始时 | 作为 user message |
| `deliverAs: "steer"` | 当前回合工具执行后 | 下一个内循环迭代 | 当前回合后立即 | 作为 user message |
| `deliverAs: "followUp"` | 当前回合完全结束后 | outer loop 外循环 | 所有 steer 之后 | 作为 user message |
| `deliverAs: "nextTurn"` | 用户下次说话时 | 用户消息回合 | 附着在用户消息旁 | 不持久化 |
| 无任何选项 (idle) | 不触发 | 不触发 | 按时间戳固定 | 持久化 (custom message) |

## 5. 并发场景完整 trace

### 5.1 Agent idle → subagent 完成

```
  agent.idle → subagent 完成
    → sendMessage({triggerTurn: true})
    → isStreaming=false → agent.prompt(subagent-notify)
    → ★ 新回合启动，LLM 主动处理 subagent 结果

  如果用户在此期间发消息：
    → session.prompt(userText, {streamingBehavior: "steer"})
    → isStreaming=true → steer queue: [user message]
    → 当前 LLM 回合结束后，steer 被 drain
    → 新回合处理用户消息
```

### 5.2 用户正在聊天 → subagent 完成

```
  用户按 Enter 发消息 → LLM 开始 streaming
    │
  子 agent 完成
    → sendMessage({triggerTurn: true})
    → isStreaming=true, 无 deliverAs → agent.steer(notification)
    → steer queue: [subagent-notify]
    │
  用户再按 Enter 发消息
    → session.prompt(text, {streamingBehavior: "steer"})
    → steer queue: [subagent-notify, user-text]  ← FIFO 顺序
    │
  当前 LLM 回合结束 (无更多 tool calls)
    → getSteeringMessages() → drain all
    → 新回合注入两个消息：
       [0] subagent-notify (custom→user, 保留 t_subagent_complete)
       [1] user-text (user, 保留 t_user_typed)
    → ★ LLM 按时间顺序同时处理两者
```

### 5.3 用户 Alt+Enter 排队

```
  用户按 Alt+Enter 发消息
    → session.prompt(text, {streamingBehavior: "followUp"})
    → followUp queue: [user-text]
    │
  子 agent 完成
    → sendMessage({triggerTurn: true})
    → isStreaming=true → agent.steer(notification)
    → steer queue: [subagent-notify]
    │
  当前 LLM 回合结束
    → getSteeringMessages() → [subagent-notify]
    → LLM 先处理 subagent 结果 (1 个新回合)
    │
  处理完后 outer loop 检查 followUp
    → getFollowUpMessages() → [user-text]
    → LLM 再处理用户消息 (1 个新回合)
```

### 5.4 四种模式的推荐使用场景

| 场景 | 推荐选项 | 理由 |
|------|----------|------|
| subagent 完成后主 agent 必须立即响应 | `triggerTurn: true` | 启动独立回合，不给 steer 打断当前对话 |
| subagent 完成时用户正在聊天，通知不应打断 | `triggerTurn: true` + (让框架自动 steer) | isStreaming 时自动走 steer，FIFO 排队 |
| 纯记录，不触发 LLM | 无选项 (empty `{}`) | 追加到 timeline，persist，下次 LLM 回合读到 |
| 附着在下次用户消息旁 | `deliverAs: "nextTurn"` | 不打断当前流，随下条用户消息一起出现 |

## 6. 框架层关键技术细节

### 6.1 `convertToLlm` — Custom→User 转换

`messages.ts` 中的转换逻辑：

```typescript
case "custom": {
    const content = typeof m.content === "string"
        ? [{ type: "text", text: m.content }]
        : m.content;
    return {
        role: "user",
        content,
        timestamp: m.timestamp,  // ← 保留原始时间戳
    };
}
```

- `role: "custom"` → `role: "user"`（LLM 可见为一条用户消息）
- `timestamp` 保留原始值（时间顺序正确）
- 无 `triggerTurn` / `deliverAs` 时直接 push 到 `state.messages` 的方式经过此转换后同样对 LLM 可见

### 6.2 Agent Loop 排队机制

```typescript
// agent-loop.js runLoop()

while (true) {
    let hasMoreToolCalls = true;
    let pendingMessages = getSteeringMessages();  // ← 初始检查

    while (hasMoreToolCalls || pendingMessages.length > 0) {
        // 1. 注入 pending messages (steer)
        for (const msg of pendingMessages) { ... }

        // 2. streamAssistantResponse → LLM 响应
        const message = await streamAssistantResponse(...);

        // 3. 执行 tool calls
        const toolResults = await executeToolCalls(...);
        hasMoreToolCalls = !terminate;

        // 4. 检查新的 steer 消息（工具执行中产生的）
        pendingMessages = getSteeringMessages() || [];
    }

    // 5. outer loop: 检查 followUp
    const followUpMessages = getFollowUpMessages() || [];
    if (followUpMessages.length > 0) {
        pendingMessages = followUpMessages;
        continue;
    }

    break; // → agent_end
}
```

**重要顺序**：steer > followUp > 无消息 → agent_end

### 6.3 interactive-mode 用户输入排队

```typescript
// 普通 Enter（streaming 时）
if (this.session.isStreaming) {
    await this.session.prompt(text, { streamingBehavior: "steer" });
    // → steer queue
}

// Alt+Enter（streaming 时）
if (this.session.isStreaming) {
    await this.session.prompt(text, { streamingBehavior: "followUp" });
    // → followUp queue
}
```

## 7. Widget 状态显示

pi-subagents 内置 widget（TUI 右下角组件）显示所有 async job 状态：

```
┌─ subagent-async ─────────────────────────┐
│ ✓ worker  · complete  ·  3.2K tokens     │
│   ⎿  Background task completed            │
│   session: ~/.pi/agent/sessions/xxx       │
└──────────────────────────────────────────┘
```

- 键 `WIDGET_KEY = "subagent-async"`
- 每 250ms 轮询刷新（`POLL_INTERVAL_MS`）
- 完成状态显示 ✓（green）
- 完成后保留 10s（`completionRetentionMs`）后自动清除
- 无需 LLM 干预，用户扫一眼就知后台状态

## 8. 关键设计决策建议

| 决策 | 建议 | 理由 |
|------|------|------|
| notify 投递方式 | `triggerTurn: true` | 需要 LLM 主动处理 subagent 结果 |
| 派发后 terminate | 推荐 `terminate: true` | 省一次 LLM 调用，避免轮询机会 |
| 用户消息排队 | Enter→steer，Alt+Enter→followUp | 已由 interactive-mode 原生支持 |
| 时间顺序 | 通过 steer FIFO 保证 | 先到先处理，LLM 按 context 顺序读取 |
