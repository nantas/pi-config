# Subagent 编排指南

> 本文档是对 agent 的编排行为约束，非面向用户的说明。
> 详细 API 参考（参数 schema、调用示例、错误处理）请参考 `pi-subagents` 内置 skill。
> 该 skill 在运行时通过 `<available_skills>` 自动发现，路径可见于其中。

## 1. `subagent` 工具模式

| 模式 | 参数 | 用途 |
|------|------|------|
| **Single** | `{ agent, task }` | 委派单个子 agent |
| **Chain** | `{ chain: [{agent, task}, ...] }` | 多步串行流水线 |
| **Parallel** | `{ tasks: [{agent, task}, ...] }` | 多个不冲突任务并发 |

只有这三种模式。不需要自行组合其他模式。

## 2. Async 行为规则（必须遵守）

```
subagent({agent, task, async: true}) 派发后
  │
  ├── ❌ 禁止调用 subagent({action:"status"}) 轮询后台任务
  │     → 不检查状态、不等待完成
  │     → widget 会自动显示运行状态（用户可见）
  │
  ├── ✅ 必须立即结束当前回合
  │     → 回复一条纯文本说明已派发
  │     → 不得产生任何后续 tool calls
  │     → 不得继续追加分析、建议或规划
  │
  └── ✅ 子 agent 完成后：
        → 系统通过 triggerTurn 自动启动新回合
        → 通知作为 `role:"custom"` 消息按完成时间插入上下文
        → LLM 在新回合中处理结果，执行后续工作
        → 如果用户在此期间发消息，系统会自动排队（FIFO 顺序）
```

## 3. 并发处理（系统自动完成，agent 无需干预）

当 subagent 完成通知触发新回合时，如果用户也在发消息：

| 用户操作 | 系统行为 |
|----------|----------|
| 正常 Enter | 消息进入 steer queue，按 FIFO 顺序与通知一起交付 |
| Alt+Enter | 消息进入 followUp queue，当前回合完全结束后处理 |
| 两个事件同时到达 | steer + followUp 按序 drain，保持不变 |

Agent 不需要关心排队机制。只需要在收到通知后正常处理即可。

## 4. `context` 选择规则

| context 值 | 适用场景 | 说明 |
|------------|----------|------|
| `"fresh"` | reviewer、快速侦察 | 无历史上下文，只看当前 diff/文件 |
| `"fork"` | oracle、worker、planner | 继承主会话上下文，适合延续性工作 |

packaged 的 `planner`、`worker`、`oracle` 默认使用 `"fork"`。
明确需要无上下文的审查时，必须指定 `context: "fresh"`。

## 5. 可用子 agent

| Agent | 角色 | 默认 context |
|-------|------|-------------|
| `scout` | 快速代码库侦察 | fresh |
| `planner` | 生成实施计划 | fork |
| `worker` | 实现（单写入者） | fork |
| `reviewer` | 代码审查 + 修复 | fresh |
| `context-builder` | 上下文构建 + meta-prompt | fresh |
| `researcher` | 外部资料调研 | fresh |
| `oracle` | 方向审阅、假设挑战、风险评估 | fork |
| `delegate` | 轻量通用委托 | fork |

## 6. 错误恢复

| 错误场景 | 诊断方法 |
|----------|----------|
| `unknown agent` — 调用了不存在的子 agent | `subagent({ action: "list" })` 查看可用 agent 列表 |
| 子 agent 执行失败——配置/环境问题 | `subagent({ action: "doctor" })` 获取完整诊断报告 |
| fork context 失败——无持久化 session | 使用 `context: "fresh"` 显式指定 fresh context |
| 子 agent 嵌套超限——recursion 过深 | 扁平化工作流，或提高 `maxSubagentDepth` |

## 7. 编排约束

- **写操作单线程**：同一时间只有一个 agent 写文件。review/research 可以并行。
- **agent 不可嵌套**：子 agent 不能调用 `subagent()`。所有编排由主 agent 负责。
- **决策权在主 agent**：子 agent 遇到未批准的 scope/product/architecture 选择时，必须暂停并请你决定，不能擅自行动。
- **task 要具体**：给子 agent 的具体任务而非模糊指令。
  - ✅ `"检查 auth.ts 中 null 安全检查的遗漏"`
  - ❌ `"审查所有代码"`
- **chain 变量**：`{task}`=原始请求, `{previous}`=上一步结果, `{chain_dir}`=共享目录。
- **详细 API 参考**：所有参数的完整 schema、调用示例、错误处理，见 `pi-subagents` 内置 skill（运行时自动发现）。
