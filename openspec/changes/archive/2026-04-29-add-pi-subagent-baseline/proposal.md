# Proposal

## 问题定义

`pi-config` 已经完成 Phase 1 的 `.pi/` 受管源码层、`repo -> ~/.pi/agent/` 单向 sync 契约，以及首条 Phase 2 `MCP` baseline，但 `subagent` 仍停留在蓝图与研究层。当前仓库虽然已经把 `subagent` 识别为 Phase 2 独立能力域，也收集了 `pi-mono` 官方 subagent example、`pi-subagents`、`pi-vs-claude-code` 等参考输入，但还没有把这些输入收敛成一个可实施的仓库级 contract。

这会带来三个直接问题。第一，仓库没有正式定义 subagent 的最小交付形态：是只依赖外部包、只维护 agent 定义，还是要增加本地 orchestration extension。第二，仓库没有正式定义 agent persona、tool limits、extension limits 与 project context 继承策略的真源位置，后续实现容易在 `.pi/settings.json`、`.pi/agents/` 与运行时调用参数之间分散。第三，仓库没有一个稳定的 `dispatch` 接口把 Pi 执行底座与未来 `team` / `chain` 扩展隔离开来，后续一旦从“薄包装”演进到更完整的 orchestration 产品，接口很容易破裂。

本次 change 需要为 `pi-config` 建立一个正式的 Phase 2 subagent baseline：使用本地 orchestration extension 暴露仓库自有 `dispatch` tool 和自然语言 `/dispatch` 命令，以 `.pi/agents/*.md` 作为 agent contract 真源，并以 `pi-subagents` 的真实执行器作为首选底座，而不是继续停留在占位 spawn adapter。同时在架构上保留未来扩展到 `team`、`chain` 与更完整 orchestration 层的能力。

根据最新验证，baseline 还需要补上一层明确的 sync 结果可达性契约。当前 `dispatch` 虽然已经能真实启动 `pi-subagents` child runs，但如果 sync 返回只剩 `COMPLETED` / `FAILED` 状态摘要，上层主 agent 仍然无法继续消费 child output，人类也会被迫去猜 `/tmp` 路径或误用 `subagent status`。因此本次 change 的收口标准要扩展为：sync dispatch 结果必须直接携带 child output 与真实导出路径，且不能把顶层 `runId` 伪装成 async status handle。

## 范围边界

本次 change 聚焦 subagent baseline 的项目级 contract、架构和首版交付边界，不实现完整 multi-agent 产品。

纳入范围的内容包括：

- 定义本次 subagent baseline 的正式交付形态：本地 orchestration extension + `.pi/agents/*.md` 真源 + `.pi/settings.json` 集成
- 定义 `.pi/agents/*.md` 中 agent persona 与执行策略字段的正式 contract
- 定义仓库自有 `dispatch` tool 的输入/输出 contract，包括 `tasks[]`、`mode`、`projectContext`，以及供主 agent 计划后使用的 `skills` / `reads` / `context` 等内部编排字段
- 定义 sync dispatch 的结果可达性 contract：结果正文必须直接暴露 child output、artifact/saved/session 路径，以及 `runId` 的非-status 语义
- 明确 `dispatch` 与 `pi-subagents` 的关系：仓库接口不直接暴露底层包的原生参数面，但仓库实现必须桥接到真实 `pi-subagents` 执行器而不是占位 transport
- 明确 v1 与后续扩展的边界：`sync` 正式支持，`async` 只预留参数位；`team` / `chain` / `worktree` / UI 不进入本次正式范围
- 明确 `.pi/settings.json` 与 closeout governance 的影响：后续实现需显式评估 package / extension 声明变更

不纳入范围的内容包括：

- 完整实现 `team dispatcher`、`agent-chain` 或 reviewer loop
- 完整定义或实现 `async` 的 status / collect / interrupt 管理面
- 引入强制 `worktree` 隔离策略
- 设计复杂的 dashboard、widget 或 `/team` 命令层交互
- 修改 `.mcp.json`、`.agents/skills/` 等共享层资源的同步模型
- 直接把外部 subagent 包的全部配置项透传为仓库正式接口
- 在本次 change 中修复上游 `pi-subagents` 本体源码

## Capabilities

### New Capabilities
- `pi-subagent-agent-contract`: Define `.pi/agents/*.md` as the source of truth for subagent persona and execution policy, including tool limits, extension limits, cwd, and project-context inheritance defaults.
- `pi-subagent-dispatch-baseline`: Define a local orchestration extension that exposes the repository-owned `dispatch` tool, normalizes results, and delegates execution to a pluggable backend with `pi-subagents` as the initial substrate.

### Modified Capabilities

## Capabilities 待确认项

- [x] 能力清单已与用户确认：`2026-04-29` 已确认采用两项新增 capability，分别覆盖 agent contract 真源与 repository-owned `dispatch` baseline

## Impact

- 把 `subagent` 从蓝图级方向收敛成一个可执行的 Phase 2 workstream，避免后续实现继续在“只接包”与“自建 orchestration”之间反复摇摆
- 为后续实现 change 固定仓库级接口：用户与上层 prompt 只消费自然语言 `/dispatch` 与 `.pi/agents/*.md`，仓库内部编排层负责把计划后的 runtime 字段桥接到真实 `pi-subagents`
- 让 agent persona、tool surface 与 project context 继承策略回到单一真源，降低运行时覆盖与配置漂移风险
- 为未来 `team`、`chain`、async 管理面与 UI 层扩展保留稳定升级路径，而不要求本次 change 一次性做大
- 让 sync dispatch 的调用体验向 `subagent` 靠齐，避免“能运行但结果不可消费”的半成品状态
- 触发后续实现时对 `.pi/settings.json` 的显式评估，确保 subagent 依赖与本地 orchestration extension 的声明能被纳入受管 Pi 配置闭环

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
