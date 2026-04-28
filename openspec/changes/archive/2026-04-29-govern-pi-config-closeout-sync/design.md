# Design

## Context

`pi-config` 目前已经有两个稳定前提：Phase 1 把仓库 `.pi/` 到 `~/.pi/agent/` 的受管部署边界固定下来，Phase 2 首条 `MCP` 基线把 `.pi/settings.json` 用作 Pi bridge enablement 的仓库真源之一。但仓库还没有定义“每次 change 收口时，谁来检查 `.pi/settings.json` 是否该更新、何时记录结果、何时询问是否同步全局”的治理闭环。

用户已经确认本次 change 不修改 Phase 1 的部署语义，不引入 merge 策略，也不把 `.mcp.json` 拉进 Pi 专属 runtime sync。要补的是治理编排层：把仓库配置真源检查、verification 记账、以及用户确认后的全局 sync 编成统一收口流程。

## Goals / Non-Goals

**Goals:**

- 定义一个强制性的 closeout 规则：每次 `pi-config` 功能或配置 change 收口时都要显式检查 `.pi/settings.json` 影响
- 明确当实现引入新的 Pi 受管 runtime requirement 时，必须先更新仓库 `.pi/settings.json` 再通过 verification
- 定义 verification / writeback 中的标准结果口径：`repo-settings-updated`、`repo-settings-unchanged`、`global-sync-confirmed-and-run`、`global-sync-declined`、`global-sync-deferred-blocked`
- 定义一个需要用户确认的全局部署步骤，并复用现有 `scripts/sync-pi-agent.sh` 与 `~/.pi/agent/settings.json` 目标路径

**Non-Goals:**

- 改变 Phase 1 的 one-way overwrite sync 语义
- 引入部分字段 merge、provider/model 保留策略或 runtime patch 机制
- 把 `.mcp.json`、`.agents/skills/` 或其他 shared-layer config 纳入同一确认/部署规则
- 自动无确认地同步全局 Pi 配置

## Decisions

- 使用两项 capability 拆分：
  - `pi-config-closeout-settings-governance` 负责“收口时必须检查并在需要时更新 repo `.pi/settings.json`”
  - `pi-global-runtime-sync-confirmation` 负责“verification 后询问是否同步全局，并在确认后调用既有 Phase 1 sync”
- 将治理范围定义为所有 `pi-config` 功能或配置 change 的 closeout，而不是只对直接修改 `.pi/settings.json` 的 change 生效。这样 verification 证据总能回答“本轮是否需要更新 repo settings”。
- 将“是否需要更新 repo `.pi/settings.json`”的判断边界限制在 Pi 专属受管层：
  - `.pi/settings.json`
  - `.pi/extensions/`
  - `.pi/agents/`
  - `.pi/prompts/`
  - `.pi/themes/`
  当实现改变了这些受管运行时需求时，必须先更新 repo settings 真源。
- 将“全局同步”定义为调用现有 Phase 1 受管路径：
  - source: 仓库 `.pi/settings.json`
  - target: `~/.pi/agent/settings.json`
  - mechanism: 现有 `scripts/sync-pi-agent.sh`
  不允许通过手工编辑 `~/.pi/agent/settings.json` 来满足治理要求。
- 将同步触发点放在 verification 之后、archive 之前的收口阶段：
  1. 实现完成
  2. 检查 `.pi/settings.json` 影响
  3. 必要时更新仓库真源
  4. 生成 verification，记录 repo settings 结果
  5. 询问用户是否同步全局
  6. 确认后运行 Phase 1 sync，并在 verification / writeback 记录结果
- `.mcp.json` 明确排除在本次治理闭环之外。即使某轮 change 同时变更了 `.mcp.json`，它也不自动被纳入“是否同步全局 Pi settings”的确认问题。
- 实现落点优先放在治理与操作入口层，而不是改动底层 sync 语义：
  - 更新仓库级说明（如 `AGENTS.md` 或稳定治理文档）
  - 补一份稳定 runbook / policy 文档
  - 让后续 change 的 verification / writeback 按统一结果字段记账

## Risks / Migration

- 仓库当前 `.pi/settings.json` 已不再是 Phase 1 的最小空对象，而是承载 `pi-mcp-adapter` package；新增治理后，未来 change 更容易把更多全局 runtime 意图沉到这个文件里。缓解方式：本次明确保留“仓库全量真源”语义，不假装存在 merge 保护。
- 由于全局 sync 仍是 overwrite 语义，用户确认前必须知道它会按仓库状态覆盖受管目标。缓解方式：把“确认后直接 sync”写成显式治理步骤，并在 verification / writeback 留下结果证据。
- 若未来确实需要区分“仓库管理字段”和“用户本机保留字段”，将与本次“全量真源”决策冲突。缓解方式：把 merge/partial-sync 明确留给后续 change，而不在本次治理里偷渡新语义。
