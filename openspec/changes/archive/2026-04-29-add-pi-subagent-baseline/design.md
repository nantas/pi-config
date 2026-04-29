# Design

## Context

`pi-config` 已经把 `subagent` 列为 Phase 2 独立能力域，也已经完成 `.pi/` 受管源码层、Pi runtime sync 契约和 `MCP` baseline，但仓库还没有正式定义 subagent 的仓库级交付形态。根据本次已确认 specs，v1 必须同时解决两件事：一是把 `.pi/agents/*.md` 固定为 agent persona 与执行策略真源；二是把 subagent 执行入口固定为仓库自有 `dispatch` tool，而不是把 `pi-subagents` 原生调用面直接暴露给上层。

这意味着本次 design 不能只写“安装 `pi-subagents` 然后开始用”。它必须解释为什么需要本地 orchestration extension、为什么用户调用面要保持极简、为什么仓库内部计划 contract 需要比用户调用面更丰富，以及为什么要在 v1 就预留从 `B` 扩展到 `C` 的骨架。

## Goals / Non-Goals

**Goals:**

- 定义 v1 subagent baseline 的正式交付形态：本地 orchestration extension、`.pi/agents/*.md` 真源、`.pi/settings.json` 集成
- 定义 `.pi/agents/*.md` frontmatter 的正式字段集与职责边界
- 定义 repository-owned `dispatch` tool 的稳定输入/输出 contract
- 定义 extension 内部的适配层，使 `pi-subagents` 成为可替换执行底座而不是长期 API
- 把当前占位 backend adapter 替换成真实 `pi-subagents` bridge
- 在不扩大 v1 范围的前提下，为 future `team` / `chain` / richer orchestration 预留清晰升级路径

**Non-Goals:**

- 实现完整 `team dispatcher`、`agent-chain`、review loop 或 agent dashboard
- 在 v1 正式实现 `async` status / collect / interrupt 管理面
- 在运行时调用层开放通用 policy override DSL
- 把 `tools`、`extensions`、`cwd` 等 per-agent policy 分散到 `.pi/settings.json` 或调度调用参数中
- 强制引入 `worktree` 隔离或复杂 artifact persistence 机制

## Decisions

- 采用 `B -> C` 演进架构：
  - `B`: 本地 orchestration extension + agent 定义真源 + `pi-subagents` substrate
  - `C`: 后续在同一骨架上继续扩展 team / chain / UI / async 管理面
- 本地 extension 注册仓库自有 `dispatch` tool，并额外提供 `/dispatch` 命令包装器，作为唯一正式多代理委托入口的两种入口形态。
- `.pi/agents/*.md` 作为 subagent contract 真源，一次定全 v1 字段：
  - `name`
  - `description`
  - `systemPromptMode`
  - `tools`
  - `extensions`
  - `cwd`
  - `inheritProjectContext`
  - `inheritSkills`
  - 可选固定 `skills`
- agent resolution 对齐 `pi-mono` 的默认发现语义：
  - `~/.pi/agent/agents` 是默认 user-level fallback
  - `.pi/agents/*.md` 是 project-local override layer
  - 当项目内没有 `.pi/agents` 时，dispatch 仍可解析全局 user-level agents
- `.pi/settings.json` 只承担两类职责：
  - 声明 `pi-subagents` package 依赖
  - 声明本地 orchestration extension 的加载
  - 它不作为 per-agent policy 的第二真源
- `dispatch` 分成两层 contract：
  - 用户入口保持极简：自然语言 `/dispatch <request>`
  - 仓库内部 tool contract 使用顶层 `mode` + 统一 `tasks[]`
- 每个内部 task 至少支持：
  - `agent`
  - `task`
  - `projectContext`
  - `context`
  - `skills`
  - `reads`
  - `model`
  - `cwd`
- `projectContext` 只放在 task 级，支持：
  - `default`
  - `inherit`
  - `strip`
  - 这样一个 dispatch 请求内的不同 task 可以独立决定是否继承当前项目上下文
- `tools`、`extensions`、默认 `cwd`、默认 `skills`、默认继承策略仍由 `.pi/agents/*.md` 持有；只有主 agent 已经决定好的执行计划字段才允许进入 dispatch tool
- v1 completion behavior 只正式支持 `sync`
  - `async` 只保留参数位，不在本次 change 内定义完整行为
- `dispatch` 输出统一规范化：
  - 顶层包含 `runId`、`mode`、`results[]`、`aggregateSummary`
  - 每个结果至少包含 `taskId`、`agent`、`status`、`summary`、`finalOutput`、`artifactPaths`、`sessionFile`、`savedOutputPath`、`error`
  - 即使只有一个 task，也返回 `results[]`
  - `summary` 只是短摘要，不可替代 child output 正文
- `dispatch` sync 的主文本输出要对齐 `subagent` 的可消费性：
  - 不能只回 `COMPLETED` / `FAILED` 状态
  - 必须内联每个 child task 的实际输出文本
  - 如存在导出文件，则同时暴露 `artifactPaths.outputPath`、`savedOutputPath`、`sessionFile`
- `dispatch` 的 `runId` 在 v1 只是当前 dispatch response 的标识，不是 async status handle
  - sync 模式的目标是“当场可消费”，不是“稍后再查”
  - 本次 change 不引入第二套 sync status 查询面
- `/dispatch` 命令是自然语言用户入口：
  - 用户提供任务描述，不手写 `tasks[]`
  - 命令通过 Pi 的会话消息注入能力把请求交回当前主 agent
  - 主 agent 自己判断是否需要拆分为一个或多个 delegated tasks，并在需要时调用 repository-owned `dispatch` tool
  - 命令层不复制一套本地 task planner，更不要求用户直接操作结构化 contract
  - 主 agent 不得绕过仓库 `dispatch` 直接改用任意 ad-hoc subagent 流程
- extension 内部必须显式分层：
  - `agent contract resolver`
  - `dispatch tool handler`
  - `dispatch command handler`
  - `subagent bridge`
  - `result normalizer`
  - `sync result formatter`
  - v1 先实现 `PiSubagentsBridge`
- future `team` / `chain` 演进不新增第二套 agent schema
  - 后续 orchestration 层继续消费 `.pi/agents/*.md`
  - 新 change 只需要增加 resolver / backend / command/UI 层

## Risks / Migration

- `pi-subagents` 的实际参数面或加载方式可能与当前研究摘要存在差异，导致实现阶段需要增加少量适配逻辑。缓解方式：仓库 contract 不直接透传底层接口，所有差异都收敛在 bridge 内。
- 任务级 `skill: "name"` 在部分真实运行链中出现 `element.skill.every is not a function`。缓解方式：优先使用 agent frontmatter 固定 `skills`，并在仓库 bridge 层把 task-level skills 统一规范化为数组后再下传。
- 当前 sync dispatch 结果若只做轻量摘要，主 agent 无法继续消费 child output，且人类会被误导去猜 `/tmp` 路径或尝试 `status`。缓解方式：bridge 不再丢弃 `SingleResult` 关键信息，并把 sync 文本渲染升级为“状态 + 正文输出 + 导出路径”。
- 若后续 `team` / `chain` 直接引入外部现成实现，容易绕开本次定义的 `dispatch` contract。缓解方式：本次 specs 明确 `dispatch` 是仓库正式入口，未来新增 orchestration 能力也应构建在本地 orchestration extension 上，而不是旁路新接口。
- 后续实现大概率需要更新 `.pi/settings.json` 以声明 subagent package 与本地 extension；若收口时漏掉这一步，会违反仓库 closeout governance。缓解方式：在 tasks 与 verification 中显式加入 settings assessment 和 post-verification sync confirmation。
