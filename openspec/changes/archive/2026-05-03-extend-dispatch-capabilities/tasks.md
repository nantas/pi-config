# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界
  - Capabilities: dispatch-chain-mode, dispatch-parallel-chain-fanout, dispatch-task-count, dispatch-output-file, dispatch-async-mode, dispatch-agent-management-readonly, dispatch-concurrency-control, dispatch-parameter-scope, dispatch-natural-language-chain, dispatch-baseline (modified)
  - 所有 spec 的 requirement 和 scenario 已在 `specs/` 中定义完成
- [x] 1.2 确认依赖前置条件与外部协作项
  - 前置条件：pi-subagents (node_modules) 已可用，版本 0.20.1
  - 依赖：TypeBox 已可用
  - 外部协作：不涉及

## 2. 核心实现任务

### 2.1 Schema 扩展（dispatch-baseline modified）

- [x] 2.1.1 扩展 `DispatchTaskSchema`：增加 `output`（string | boolean）和 `count`（integer, min 1）字段
  - Spec: `specs/dispatch-baseline/spec.md` — "The Dispatch Tool Schema Must Support Additional Parameters on Task Items"
  - Design: D1
  - 验证: schema 编译通过，TypeBox 验证接受合法参数
- [x] 2.1.2 扩展 `DispatchRequestSchema`：增加 `chain`（与 tasks[] 互斥）、`action`（list|get|status）、`concurrency`（integer）、`agentScope`（user|project|both）、`id`（string）、`agent`（string）
  - Spec: `specs/dispatch-baseline/spec.md` — "The Dispatch Tool Schema Must Support Extended Parameters"
  - Design: D1
  - 验证: schema 编译通过，运行时互斥检查正确报错

### 2.2 Action 管理（dispatch-agent-management-readonly）

- [x] 2.2.1 实现 `handleAction` 函数：处理 list/get/status 三种 action
  - Spec: `specs/dispatch-agent-management-readonly/spec.md` — 三个 Requirement
  - Design: D6
  - 验证: action list 返回 agent 列表；get 返回单个 agent 详情；status 返回 run 状态
- [x] 2.2.2 在 `loadAgentDefinitions` 中增加 `scope` 参数支持 agentScope 过滤
  - Spec: `specs/dispatch-parameter-scope/spec.md`
  - Design: D8
  - 验证: agentScope=project 只返回 project agents；agentScope=user 只返回 builtin+user

### 2.3 Chain 模式（dispatch-chain-mode）

- [x] 2.3.1 定义 `ChainItemSchema` 和 `ChainParallelStepSchema`
  - Spec: `specs/dispatch-chain-mode/spec.md`
  - Design: D1
  - 验证: schema 接受 chain 参数，支持 agent/task/output/parallel/concurrency
- [x] 2.3.2 实现 `executeChain` 函数：将 chain items 映射到 pi-subagents chain 格式并执行
  - Spec: `specs/dispatch-chain-mode/spec.md` — "Dispatch Schema Must Support Chain Mode"
  - Design: D2
  - 验证: 双 step chain 按顺序执行，{previous} 正确传递
- [x] 2.3.3 实现 chain 步骤模板变量替换（{task}、{previous}、{chain_dir}）
  - Spec: `specs/dispatch-chain-mode/spec.md` — "Chain Steps Must Support Template Variables"
  - Design: D2
  - 验证: 三个变量在正确时机被替换为实际值
- [x] 2.3.4 实现 chain 步骤 output 支持
  - Spec: `specs/dispatch-chain-mode/spec.md` — "Chain Steps Must Support Output Persistence"
  - Design: D4
  - 验证: chain step 指定 output 后结果写入对应文件

### 2.4 Chain 并行扇出（dispatch-parallel-chain-fanout）

- [x] 2.4.1 在 `ChainItemSchema` 中支持 `parallel` 字段（agent 数组 + concurrency）
  - Spec: `specs/dispatch-parallel-chain-fanout/spec.md`
  - Design: D2
  - 验证: chain step 接受 parallel 数组，正确并发执行
- [x] 2.4.2 实现并行步骤结果聚合，格式化输出给下一步的 {previous}
  - Spec: `specs/dispatch-parallel-chain-fanout/spec.md` — "Parallel Steps Must Aggregate Results For Next Step"
  - 验证: 并行步骤完成后，{previous} 包含所有 agent 的标注结果

### 2.5 Count 支持（dispatch-task-count）

- [x] 2.5.1 在 `executeTasks` 中实现 `expandTaskCounts` 函数
  - Spec: `specs/dispatch-task-count/spec.md`
  - Design: D3
  - 验证: count=3 展开为 3 个独立合成 agent，各自独立执行
- [x] 2.5.2 确保展开后的实例独立解析 agent 定义、生成 syntheticAgent 名称
  - Spec: `specs/dispatch-task-count/spec.md` — "Each Count Instance Must Be Independent"
  - 验证: 每个实例有独立的 finalOutput 和 sessionFile

### 2.6 Output 文件（dispatch-output-file）

- [x] 2.6.1 在 task 到 executor 参数映射中传递 output 字段
  - Spec: `specs/dispatch-output-file/spec.md`
  - Design: D4
  - 验证: task 指定 output 后结果写入文件，路径出现在 savedOutputPath
- [x] 2.6.2 实现 output 路径解析（相对路径、绝对路径、~ 展开）
  - Spec: `specs/dispatch-output-file/spec.md` — "Output Path Resolution"
  - 验证: 三种路径格式正确解析

### 2.7 Async 模式（dispatch-async-mode）

- [x] 2.7.1 替换 async stub：实现后台执行 + runId 注册
  - Spec: `specs/dispatch-async-mode/spec.md` — 三个 Requirement
  - Design: D5
  - 验证: async 不再返回 deferred message，返回 runId 和 pending status
- [x] 2.7.2 实现 status action 查询异步运行状态
  - Spec: `specs/dispatch-async-mode/spec.md` — "Dispatch Must Support Status Query For Async Runs"
  - 验证: status 查询返回 running/completed/failed 状态
- [x] 2.7.3 实现异步结果持久化（写入临时目录），结果 TTL 24h
  - Spec: `specs/dispatch-async-mode/spec.md` — "Async Runs Must Persist Session Data"
  - 验证: 结果在异步完成后可查询，包含 finalOutput

### 2.8 Concurrency 控制（dispatch-concurrency-control）

- [x] 2.8.1 在 `executeTasks` 和 `executeChain` 中传递 concurrency 参数
  - Spec: `specs/dispatch-concurrency-control/spec.md`
  - Design: D7
  - 验证: concurrency=2 时最多 2 个任务同时执行

### 2.9 Natural Language 升级（dispatch-natural-language-chain）

- [x] 2.9.1 更新 `buildDispatchUserMessage` 指令文本，告知 LLM agent 所有新能力
  - Spec: `specs/dispatch-natural-language-chain/spec.md`
  - Design: D9
  - 验证: /dispatch 注入的 prompt 包含 chain/output/count/async/action 描述
- [ ] 2.9.2 测试 LLM agent 能从自然语言中正确生成 chain 参数
  - Spec: `specs/dispatch-natural-language-chain/spec.md` — "User describes a chain workflow naturally"
  - 验证: 输入 "先分析再实现" 生成 chain 而非 tasks[]

### 2.10 Tool Description 更新

- [x] 2.10.1 更新 `buildDispatchToolDescription` 反映所有新能力
  - Spec: `specs/dispatch-baseline/spec.md` — "Dispatch Tool Description Must Reflect Extended Capabilities"
  - Design: D10
  - 验证: tool description 包含 chain/output/async/action/agentScope 说明

### 2.11 Chain 结果格式化

- [x] 2.11.1 在 `formatDispatchSyncText` 中支持 chain 结果的格式化（标注 step 序号和顺序）
  - Spec: `specs/dispatch-chain-mode/spec.md` — "Chain Must Report Per-Step Results"
  - 验证: chain 结果按 step 顺序展示，包含完整输出

## 3. 收敛与验证准备

- [x] 3.1 整理需要进入 verification 的证据与检查点
  - 每个 task 标注验证方式（schema 编译 / 单元测试 / 手动 E2E）
  - E2E 测试场景：chain 执行、parallel fan-out、async+status、count 展开、output 写入
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更
  - 修改文件：`.pi/extensions/subagent-dispatch/index.ts`、`.pi/extensions/subagent-dispatch/core.js`
  - 新增文件：无（所有修改在现有文件内完成）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
