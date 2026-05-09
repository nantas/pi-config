# Dispatch Extension 移除与 pi-subagents 原生迁移方案

> 状态：评估完成，待决策执行
> 相关变更：[pi-config] 全局配置仓库

---

## 1. 需求背景

当前 `dispatch` extension（基于 `pi-subagents` 0.20.1）在派遣多个 subagent 执行任务时存在以下限制：

- **Sync 模式下**：`executor.execute()` 会阻塞等待所有任务完成后才一次性返回聚合结果。虽然 `onUpdate` 回调可以流式推送进度到 TUI，但主 agent（LLM）在 `return` 前无法基于中间结果做出新的 tool 调用决策。
- **Async 模式下**：立即返回 `runId`，但 dispatch extension 的事件集成不完整，`status` action 仅返回占位符，无法让主 agent 及时收到子 agent 完成通知并采取行动。
- **无法利用新版本能力**：pi-subagents 0.24.0 引入了 intercom 桥接、resume 恢复、control events、contact_supervisor 等关键能力，但 dispatch 作为透传层无法暴露这些功能。

用户的核心诉求是：
> **主 agent 能在子 agent 完成或中止时及时收到结果并采取行动，而不是等待所有任务完成。**

---

## 2. 调研结果：pi-subagents 最新版能力

### 2.1 版本对比

| 能力 | v0.20.1（dispatch 当前依赖） | v0.24.0（最新） |
|------|---------------------------|----------------|
| `async` 后台执行 | ✅ 基础 detached 进程 | ✅ 完善的事件系统 + widget + resume |
| `intercom` 桥接 | `fork-only` 默认 | `always` 默认，双向通信 |
| `contact_supervisor` | ❌ 无 | ✅ 子 agent 可向主 agent 请求阻塞式决策 |
| `resume` | ❌ 无 | ✅ 支持 async + foreground 子 agent 恢复 |
| `control` 事件 | ❌ 无 | ✅ `needs_attention` / `active_long_running` |
| `outputMode: file-only` | ❌ 无 | ✅ 减少大输出回传的 token 消耗 |
| `clarify` TUI | ✅ 基础 | ✅ 支持 background toggle |
| `worktree` 隔离 | ✅ 基础 | ✅ 完善 |

### 2.2 异步结果通知机制

pi-subagents 0.24.0 提供三层异步通信：

1. **`SUBAGENT_ASYNC_COMPLETE_EVENT`**：result-watcher 监听 `RESULTS_DIR/*.json`，完成后通过事件总线广播。dispatch 若在初始化时注册监听器，即可在任意子 agent 完成时第一时间得到通知。
2. **`intercom` 桥接**：子 agent 的 system prompt 中被注入协调指令，可主动通过 `contact_supervisor` 向主 agent 发送 `need_decision`（阻塞式）或 `progress_update`（非阻塞式）消息。
3. **`control` 事件**：子 agent 长时间无活动时触发 `needs_attention`，通过 `SUBAGENT_CONTROL_EVENT` 和 `SUBAGENT_CONTROL_INTERCOM_EVENT` 双通道通知。

### 2.3 关键设计约束

Pi 的 Tool `execute` 方法是**同步返回**的。LLM 调用 tool 后会阻塞等待 `return`，在 `return` 之前不会基于中间状态做出新的 tool 调用决策。

因此：
- 如果主 agent 需要**"同一个 turn"内**实时反应，仅靠 async 事件不够，需要结合 intercom（子 agent 主动汇报）。
- 如果主 agent 可以**"结束当前 turn，等 Pi 重新调度"**，则 async 模式 + 事件通知是最佳路径。

pi-subagents 的设计哲学明确体现在 `formatAsyncStartedMessage` 中：
> "If you have nothing else to do until the async result arrives, end your turn now; Pi will deliver the completion when the run finishes."

---

## 3. 评估结论

### 3.1 功能覆盖度

`pi-subagents` 0.24.0 已覆盖 dispatch 的 **95% 以上功能**，且在多个维度明显更强：

| dispatch 能力 | pi-subagents 0.24.0 覆盖状态 |
|-------------|--------------------------|
| Single / Parallel / Chain 执行 | ✅ 完全覆盖 |
| Async 后台执行 | ✅ 完全覆盖，且事件/ resume 更强 |
| `agentScope` 过滤 | ✅ 完全覆盖 |
| `context: fresh/fork` | ✅ 完全覆盖，fork 含 session 分支 |
| `output/reads/skills/model/count/concurrency` | ✅ 完全覆盖，新增 `outputMode` |
| `worktree` 隔离 | ✅ 完全覆盖 |
| Management (`list/get/status`) | ✅ 完全覆盖，新增 `interrupt/resume/doctor` |
| `clarify` TUI | ✅ 完全覆盖，支持 background toggle |
| Intercom 桥接 | ✅ 完全覆盖，默认 `always` |
| Control events | ✅ 完全覆盖 |
| `contact_supervisor` / resume | ✅ 完全覆盖 |
| `projectContext` (default/inherit/strip) | ⚠️ 小缺口，可弥补 |
| `/dispatch` 自然语言编排 | ⚠️ 需 prompts 替代 |

### 3.2 唯一实质性差距：`projectContext` 调用级控制

dispatch 允许调用级 `projectContext: default | inherit | strip`，pi-subagents 仅在 **agent 定义** 中通过 `inheritProjectContext`（boolean）控制。

**弥补方案**（按推荐度排序）：
1. **Agent 定义层控制（推荐）**：为不同 agent 设置 `inheritProjectContext: true/false`，将"是否继承项目上下文"作为角色属性。
2. **Prompt 指导**：在 orchestration prompt 中告诉 LLM 根据任务需求选择 `context: 'fresh'` 和对应的 agent。
3. **Fork 扩展覆盖**：如需调用级覆盖，写极小 prompt 扩展动态调整，无需完整 extension。

---

## 4. 迁移方案

### 4.1 替代策略：Prompts 取代 Extension

pi-subagents 0.24.0 自带详尽的 bundled skill (`pi-subagents/SKILL.md`)，指导 LLM 如何：
- 根据用户意图选择 agent 和编排模式
- 构建 `tasks[]`、`chain[]` 参数
- 使用 `async: true`、`worktree: true`、`context: fresh/fork`
- 执行完整 `clarify → planner → worker → reviewer → worker` 工作流

在 `pi-config` 仓库创建 `.pi/prompts/dispatch.md`（约 50-100 行），作为自然语言编排的 prompt 补充，替代 dispatch extension 和 dispatch-planner agent。

### 4.2 迁移步骤

| 步骤 | 动作 | 文件/位置 |
|------|------|----------|
| 1 | **升级依赖** | `.pi/extensions/subagent-dispatch/package.json` → `pi-subagents: "0.24.0"` |
| 2 | **创建替代 prompt** | `.pi/prompts/dispatch.md`（自然语言编排指导） |
| 3 | **移除 extension** | 删除 `.pi/extensions/subagent-dispatch/` 目录 |
| 4 | **移除 agent** | 删除 `.pi/agents/dispatch-planner.md` |
| 5 | **更新 capabilities.yaml** | 移除 `subagent-dispatch` 和 `dispatch-planner` |
| 6 | **更新 README** | 移除 dispatch 描述，指向 pi-subagents 原生能力 |
| 7 | **全局同步** | 运行 `scripts/sync-pi-agent.sh` |

---

## 5. 利弊分析

| 维度 | 保留 dispatch | 移除 dispatch，用 pi-subagents + prompts |
|------|-------------|--------------------------------------|
| **维护负担** | 需同步 pi-subagents API 变化，维护透传层 | 零额外维护，直接使用上游 |
| **功能完整性** | 无法使用 intercom、resume、control events 等 | 完整使用所有原生能力 |
| **LLM 理解成本** | `dispatch` + `subagent` 双工具并存，易混淆 | 单一 `subagent` 工具，prompt 指导编排 |
| **升级灵活性** | pi-subagents 升级可能破坏透传层 | 直接使用，无适配层 |
| **projectContext 调用级控制** | 保留 | 需用 agent 定义或 prompt 替代 |

---

## 6. 决策建议

**建议移除 `subagent-dispatch` extension 和 `dispatch-planner` agent**，原因：

1. `pi-subagents` 0.24.0 已是完整且成熟的 subagent 调度系统，dispatch 的"透传包装"价值大幅衰减。
2. 保留 dispatch 意味着无法使用 intercom、resume、control events、file-only output mode 等 0.24.0 关键能力。
3. Prompt 扩展比 extension 更轻量、更灵活，且 pi-subagents 自带 bundled skill 已提供充足编排指导。
4. 减少一层抽象，降低 LLM 和用户的认知负担。

---

## 7. 关联文档

- `README.md` — 需同步更新能力描述
- `.pi/capabilities.yaml` — 需移除相关条目
- `docs/getting-started.md` — 需更新 subagent 使用指引
