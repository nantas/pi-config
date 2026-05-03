# Proposal

## 问题定义

`subagent-dispatch` extension 目前只提供了单层 `tasks[]` 并行调度和基础的 `/dispatch` 自然语言命令，无法覆盖 `pi-subagents` 引擎支持的链式执行（chain）、异步运行、并行扇出（count）、输出文件、worktree 隔离等能力。用户需要在其他仓库中使用 dispatch 的全部工作流能力，且所有新能力都应对 `/dispatch` 自然语言命令可见——用户自然语言描述即可触发 chain、parallel、async 等工作流，无需手写 JSON。

## 范围边界

### 在范围内

- `dispatch` 工具 schema 扩展：支持 `chain`、`output`、`count`、`concurrency`、`async`、`agentScope`、`action=list|get|status`
- `dispatch` 工具 executor 映射到 `pi-subagents` 对应执行模式
- `/dispatch` 命令升级：自然语言描述可触发 chain、parallel、output 等工作流
- `shouldSkipGlobalDispatchExtensionRegistration` 修复（已在本次 change 之前完成，确认无需重复修改）
- 结果格式化增加 chain/async 场景的展示
- Tool description 更新反映新能力

### 不在范围内

- 不单独注册 `subagent` 工具（dispatch 是唯一入口）
- 不修改 `pi-subagents` 底层引擎代码
- agent CRUD（create/update/delete）暂不支持，只实现只读的 list/get
- share（Gist 上传）、sessionDir、clarify TUI 暂不实现
- 不修改现有 `tasks[]` 接口（保持向后兼容）

## Capabilities

### New Capabilities

- `dispatch-chain-mode`: 链式执行支持——顺序 pipeline，每个步骤的输出作为 {previous} 变量传递给下一步，支持 {task}、{chain_dir} 模板变量
- `dispatch-parallel-chain-fanout`: chain 步骤内并行扇出——一个 chain step 可以包含 parallel agent 列表，并发执行
- `dispatch-task-count`: 并行任务可指定 count（重复 N 份相同配置的 agent 任务）
- `dispatch-output-file`: 每个 task/step 可指定 output 文件路径，结果写入文件
- `dispatch-async-mode`: 异步执行模式——后台运行 dispatch 任务后通过 status 查询结果
- `dispatch-agent-management-readonly`: 只读 agent 管理——list 可用 agents、get 单个 agent 详情、status 查看运行状态
- `dispatch-concurrency-control`: 并行任务 concurrency 上限控制
- `dispatch-parameter-scope`: 新增 agentScope（user/project/both）参数，控制 agent 发现范围
- `dispatch-natural-language-chain`: `/dispatch` 命令升级——用户自然语言描述可触发 chain/parallel/output 等工作流，LLM agent 自动生成对应的结构化参数

### Modified Capabilities

- `dispatch-baseline`: 扩展 DispatchRequestSchema 增加 chain/output/count/concurrency/async/action 参数；Tool description 更新以反映新能力

## Capabilities 待确认项

- [x] 能力清单已在讨论中确认方向
- [x] agent CRUD 暂不实现，仅只读管理
- [x] 不注册独立 subagent 工具

## Impact

### 正面影响

- dispatch 成为完整的 repo-owned subagent 入口，覆盖绝大部分工作流场景
- 用户在所有安装了 subagent-dispatch extension 的仓库都能使用 chain/parallel/async
- `/dispatch` 自然语言命令可触发高级工作流，降低用户心智负担
- 保持向后兼容：现有 `tasks[]` 接口不变

### 需要关注

- Tool schema 变大，注意 TypeBox 编译/验证性能
- 需要处理好 chain 与 tasks[] 的参数互斥验证
- async 的 status 查询需要持久化 run 信息

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准：`openspec/specs/pi-subagent-dispatch-baseline/spec.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写：`.pi/extensions/subagent-dispatch/index.ts`, `core.js`, `repo://orbitos` 项目进度
