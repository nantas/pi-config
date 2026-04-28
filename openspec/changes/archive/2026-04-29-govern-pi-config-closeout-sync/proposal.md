# Proposal

## 问题定义

`pi-config` 已经完成 Phase 1 的仓库到 `~/.pi/agent/` 单向部署契约，也完成了首条 Phase 2 `MCP` 基线，但当前治理链条仍缺一段关键约束：当 `pi-config` 内新增功能或配置修改开发完成时，仓库并没有被要求显式检查 `.pi/settings.json` 是否需要更新，也没有被要求在收口后询问用户是否把新的仓库配置同步到全局 Pi 运行时。

这会留下两个实际风险。第一，仓内能力已经变化，但仓库中的 `.pi/settings.json` 没有同步反映新增 package / extension / runtime requirement，导致“仓库真源”和“实现事实”脱节。第二，即使仓库配置已经更新，也没有稳定的治理约束保证实现收口后会提示用户是否把新配置部署到 `~/.pi/agent/settings.json`，从而让其他仓也能复用最新 Pi 能力。

本次 change 需要把这条治理约束正式固化下来：`pi-config` 的功能或配置变更在收口时必须显式检查仓库 `.pi/settings.json` 影响；若需要更新，则先更新仓库真源；验证完成后再询问用户是否按 Phase 1 工作流把该真源部署到全局 Pi 运行时。

## 范围边界

本次 change 聚焦治理与收口工作流，不新增业务能力本身。

纳入范围的内容包括：

- 为 `pi-config` 定义“每次功能或配置 change 收口时必须显式检查 `.pi/settings.json` 影响”的治理约束
- 定义“需要时先更新仓库 `.pi/settings.json`，再进入 verification / writeback”的收口顺序
- 定义“verification 后询问用户是否同步全局 Pi 配置，确认后按 Phase 1 工作流直接 sync 到 `~/.pi/agent/settings.json`”的约束
- 明确 verification / writeback 中如何记录 `已更新`、`无需更新`、`已同步`、`用户拒绝同步` 等结果语义
- 保持仓库 `.pi/settings.json` 作为全量受管真源，保持全局写入目标为 `~/.pi/agent/settings.json`

不纳入范围的内容包括：

- 修改 `.mcp.json`、`.agents/skills/` 等共享层资源的同步模型
- 把 `.mcp.json` 纳入 Phase 1 的自动部署范围
- 把全量覆盖改成 merge 写入或引入局部字段同步语义
- 新增 Pi 功能本身（如新的 MCP server、subagent、session helper）
- 自动无确认地把变更直接写入全局 Pi 运行时

## Capabilities

### New Capabilities
- `pi-config-closeout-settings-governance`: Define the mandatory closeout governance rule that every `pi-config` feature or configuration change must explicitly assess and, when needed, update repository `.pi/settings.json` before verification passes.
- `pi-global-runtime-sync-confirmation`: Define the post-verification confirmation flow that asks the user whether to sync the repository-managed Pi settings to `~/.pi/agent/settings.json`, and if confirmed, executes the existing Phase 1 managed sync path.

### Modified Capabilities

## Capabilities 待确认项

- [x] 能力清单已与用户确认：`2026-04-29` 已确认采用两项新增 capability，分别覆盖仓库收口治理约束与用户确认后的全局 Pi 配置同步闭环

## Impact

- 把“实现事实 -> 仓库配置真源 -> 全局 Pi 运行时”之间的治理链条补齐，避免能力已变但 `.pi/settings.json` 未同步更新
- 将 Phase 1 的受管部署契约扩展为可审计的收口行为，而不是只保留一个可手工调用的 sync 脚本
- 为后续 `MCP`、`subagent`、automation 等 change 提供统一收口约束，减少每轮是否需要改 repo config、是否要同步全局的临时判断
- 保持 `.mcp.json` 继续停留在共享层，不把 shared config 与 Pi 专属 runtime config 混为一谈

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
