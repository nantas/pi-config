# Design

## Context

`subagent-dispatch` extension（位于 `.pi/extensions/subagent-dispatch/`）当前只支持单层 `tasks[]` 并行调度。底层 `pi-subagents` 引擎（`node_modules/pi-subagents/`）已经支持 chain、async、count、output、concurrency 等能力，但 dispatch 层未暴露这些参数。

用户需要扩展 dispatch 使其成为完整的 repo-owned subagent 入口，覆盖 chain/parallel/async/output/worktree 等工作流。

## Goals / Non-Goals

**Goals:**
- 扩展 DispatchRequestSchema，支持 `chain`（与 `tasks[]` 互斥）、`output`、`count`、`concurrency`、`action`（list/get/status）、`async`、`agentScope`
- chain 执行：sequential pipeline，{previous} 模板变量传递
- chain 内并行扇出：parallel agents in a chain step
- count：并行任务可重复 N 份
- output：任务结果写入文件
- async：替换现有 stub，实现后台执行 + status 查询
- action：只读 agent 管理（list/get/status）
- /dispatch 命令升级：自然语言可触发所有新能力
- Tool description 更新
- 保持向后兼容：现有 `tasks[]` 接口不变

**Non-Goals:**
- 不单独注册 `subagent` 工具
- 不修改 `pi-subagents` 底层引擎
- 不支持 agent create/update/delete（仅只读）
- 不支持 share(Gist)、sessionDir、clarify TUI
- 不支持 worktree（因复杂度，作为未来扩展）

## Decisions

### D1: Schema — chain 与 tasks[] 互斥

`chain` 是独立的执行模式，与 `tasks[]` 互斥。如果两者同时存在，`chain` 优先，并记录 warning。

```typescript
const DispatchRequestSchema = Type.Object({
  // Existing
  mode: Type.Optional(Type.Union([Type.Literal("sync"), Type.Literal("async")])),
  tasks: Type.Optional(Type.Array(DispatchTaskSchema, { minItems: 1 })),
  // New — management
  action: Type.Optional(Type.String({ enum: ["list", "get", "status"] })),
  // New — chain
  chain: Type.Optional(Type.Array(ChainItemSchema, { minItems: 1 })),
  // New — controls
  concurrency: Type.Optional(Type.Integer({ minimum: 1 })),
  agentScope: Type.Optional(Type.String({ enum: ["user", "project", "both"] })),
  id: Type.Optional(Type.String()),  // for status queries
  agent: Type.Optional(Type.String()),  // for get action
});
```

Rationale: 保持 dispatch 入口统一，不增加新工具。`chain` 作为独立执行路径，在 `delegateDispatch` 中根据是否存在 `chain` 决定走 chain 路径还是 tasks 路径。

### D2: Execution — dispatch 仍为统一入口，内部路由

`delegateDispatch` 函数根据参数分三种模式：

```
delegateDispatch(request)
├── request.action 存在 → handleAction(request)
├── request.chain 存在 → executeChain(request)
└── request.tasks 存在 → executeTasks(request)  // 现有逻辑扩展
```

`executeChain` 将每个 chain step 映射到 pi-subagents 的 chain 格式，通过 `createDispatchExecutor` 的 `chain` 参数提交。

### D3: Count Expansion — 任务展开

在 `executeTasks` 的第一步，对 `tasks[]` 中 `count > 1` 的条目展开为 N 个独立任务。展开后的任务共享除 `syntheticAgent` 外的所有配置。

```typescript
function expandTaskCounts(tasks) {
  return tasks.flatMap(task => {
    const count = task.count ?? 1;
    return Array.from({ length: count }, (_, i) => ({
      ...task,
      _originalIndex: task._originalIndex,  // for grouping
      _instance: i + 1,
    }));
  });
}
```

count 展开在 agent resolution 之前，确保每个展开实例独立解析。

### D4: Output File — 传递到 pi-subagents

`output` 参数直接映射到 pi-subagents executor 的 `tasks[n].output` 字段。路径解析使用 `expandTilde` + `path.resolve`。

相对路径解析规则：
- 无 `cwd` 覆盖 → `<PROJECT_ROOT>/<output>`
- 有 `cwd` 覆盖 → `<cwd>/<output>`
- 绝对路径 `/` 开头 → 直接使用
- `~` 开头 → 展开为 home 目录

### D5: Async — 替换 stub 为实际异步执行

1. 在 `createSubagentState()` 的 `asyncJobs` Map 中注册 runId
2. 异步任务通过 `createSubagentExecutor` 执行，设置 `async: true`
3. 结果文件写入临时目录，通过 `action: "status"` 查询
4. 结果 TTL 为 24 小时（使用 pi-subagents 默认清理机制）

```typescript
if (mode === "async") {
  const asyncResult = await runAsyncTasks(pi, ctx, signal, request);
  // Register in asyncJobs
  state.asyncJobs.set(runId, {
    createdAt: Date.now(),
    promise: asyncResult,
  });
  // Return immediately with pending status
  return buildAsyncAcceptedResponse(runId, request);
}
```

### D6: Action — 只读管理操作

`handleAction` 函数处理三种 action：

- `action: "list"` → 调用 `loadAgentDefinitions(cwd, agentScope)` 返回格式化摘要
- `action: "get", agent: "name"` → 调用 `resolveAgentDefinition(name, cwd)` 返回详细定义
- `action: "status", id: "runId"` → 从 `asyncJobs` 或持久化文件中查找运行状态

### D7: Concurrency — 传递给 executor

`concurrency` 参数在 `executeTasks` 和 `executeChain` 中都传递给 `createSubagentExecutor` 调用的 `tasks[n]` 或 chain 的 concurrency 控制。

### D8: Agent Scope — 在 loadAgentDefinitions 中过滤

`loadAgentDefinitions` 新增可选的 `scope` 参数过滤 agent 发现范围：

```typescript
function loadAgentDefinitions(cwd, scope = "both") {
  const discovery = discoverAgentsAll(cwd);
  // Filter based on scope
  // "user" → builtin + user
  // "project" → builtin + project
  // "both" → all
}
```

### D9: /dispatch 自然语言命令升级

`buildDispatchUserMessage` 的指令文本更新，告知 LLM agent：
- `chain` 模式可用
- `output` 参数可用于保存结果
- `count` 可用于重复任务
- `mode: "async"` 可用于后台执行
- `action: "list"` 可用于查看可用 agent

确保 agent 知道所有参数且不需用户手写 JSON。

### D10: Tool Description 更新

`buildDispatchToolDescription` 更新为反映所有新能力，包括 chain 模式、output、async、action 管理。

### D11: 代码文件组织

所有新功能实现在 `index.ts` 中，辅助函数放在 `core.js`：
- `index.ts`: Schema 定义、`delegateDispatch` 路由、action handler、chain/tasks executor
- `core.js`: `serializeChainPlan`、`expandTaskCounts`、`formatAsyncStatus`、`buildManagementResult`

## Risks / Migration

### 向后兼容性

- `tasks[]` 接口完全不变，现有调用不受影响
- `/dispatch` 命令的注入提示兼容旧式任务描述（新增参数只扩展 agent 的选择空间）
- Action list/get 返回格式与 agent 定义格式一致，不引入新 schema

### 风险

1. **Chain 与 tasks[] 参数冲突** = 通过 `oneOf` 或运行时互斥检查解决。选择运行时检查（更明确），在 `delegateDispatch` 入口处判断。
2. **Async 状态查询持久化** = 临时方案使用内存 Map，会话重启后丢失。接受此限制（pi-subagents 本身也不跨会话持久化 async 状态）。
3. **Count 展开后的 context 分组** = 展开后的多个实例如果共享 `context` 值，可能会被 `groupTaskPlansByContext` 合并到同一 context 组。这不会导致行为异常，每个实例仍然独立执行。
4. **Schema 膨胀** = DispatchRequestSchema 从 ~15 行增加到 ~50 行。TypeBox 编译时检查，运行时无额外开销。

### 迁移路径

无需迁移步骤——所有新参数都是可选扩展。现有 `tasks[]` 调用和 `/dispatch` 自然语言命令继续保持原样工作。
