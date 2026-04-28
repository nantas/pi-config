# Proposal

## 问题定义

`pi-config` 已经完成 Phase 1 的 `.pi/` 受管源码层与单向 sync 契约，但 Phase 2 仍停留在蓝图级描述：仓库尚未把“Minimal usable Pi parity”拆成可执行的工作流阶段，也没有确定第一条应该落地的能力切片。当前状态会导致后续 `MCP`、`subagent`、session helpers 与 automation topics 继续混杂推进，无法判断优先级，也难以形成一个最小可验证的 Pi 日常工作闭环。

在现有约束下，最短可验证路径已经明确：以仓库根 `.mcp.json` 作为共享 MCP 真源，通过 `pi-mcp-adapter` 让 Pi 会话消费该真源，并先以 `gitnexus` 作为首个受管 server 样本验证闭环。本次 change 需要把这一阶段规划和首条 MCP 基线一起固化为正式工件。

## 范围边界

本次 change 同时覆盖两个层次：

- 为 Phase 2 产出一份仓库内的总体规划文档，明确能力拆分、优先顺序、阶段出口条件，以及为什么先从 `MCP` 而不是 `subagent` 或 session helpers 开始
- 为首条 `MCP` workstream 定义可实施的 capability contract，使后续实现 change 可以直接落到 `.mcp.json`、`.pi/settings.json` 与验证流程上

纳入范围的内容包括：

- Phase 2 的能力拆分：`MCP bridge baseline`、`Session / command helpers`、`Subagent orchestration`、`Launch / install / profile automation`
- 以 `MCP` 作为 Phase 2 第一优先级 workstream 的依据与边界
- `.mcp.json` 作为跨 agent 共享真源的定位
- `pi-mcp-adapter` 作为 Pi MCP bridge 的默认接入方式
- 首批受管 server 使用 `gitnexus` 最小样本，验证 Pi 侧可发现、可连接、可调用

不纳入范围的内容包括：

- `subagent`、session helpers、automation 本身的实现
- 除 `gitnexus` 之外的 MCP server 批量纳管
- `.pi/mcp.json` 双层覆盖模型
- 把 `.mcp.json` 纳入 Phase 1 的 `scripts/sync-pi-agent.sh` 自动部署
- `directTools`、OAuth server、复杂多 server 生命周期调优

## Capabilities

### New Capabilities
- `pi-phase2-delivery-plan`: Define the repository-local Phase 2 planning baseline, including workstream decomposition, priority order, exit criteria, and the target planning document.
- `pi-mcp-shared-bridge`: Define the first MCP baseline for Pi using repository-root `.mcp.json` as the shared source of truth and `pi-mcp-adapter` as the bridge into Pi sessions.

### Modified Capabilities

## Capabilities 待确认项

- [x] 能力清单已与用户确认：`2026-04-28` 用户确认使用两项 capability，分别覆盖 Phase 2 总体规划基线与 MCP 首条落地基线

## Impact

- 把 Phase 2 从蓝图级 roadmap 收敛成可拆分执行的工作流计划，避免 `MCP`、`subagent`、session 和 automation 继续并列悬空
- 为后续实现 change 提供一个明确的第一落点：共享 `.mcp.json` + Pi MCP bridge + `gitnexus` 样本闭环
- 保护 Phase 1 边界：`.mcp.json` 仍属于共享层，不被误纳入 `.pi/` 同步契约
- 为后续专题 change 提供稳定入口：MCP 完成后，其余 Phase 2 workstreams 可以按规划继续拆分

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
