# Proposal

## 问题定义

`docs/plans/pi-customization-blueprint.md` 已经把 `Pi_Config` 的长期方向定义为个人 Pi 配置中枢与可复用扩展孵化仓，但 Phase 1 仍缺少一组正式 change artifacts 来把蓝图收敛为可实施的配置中枢基线。当前仓库没有 `.pi/` 基线、没有明确的 `repo -> ~/.pi/agent/` 同步契约，也没有把 `repo://pi-mono` 明确提升为 Pi 配置行为的查询真源。

如果直接进入 `MCP`、`subagent` 或扩展实现，后续工作会继续混淆三件事：Pi 产品原生支持什么、`pi-config` 仓库受管什么、运行时 `~/.pi/agent/` 只是部署目标还是编辑真源。本次 change 需要先把这些边界固定下来。

## 范围边界

本次 change 只建立 Phase 1 配置中枢基线，不实现任何 Pi 能力扩展。

纳入范围的内容包括：

- 将 `repo://pi-mono` 明确为 Pi 配置使用方式和支持语义的查询真源
- 在本仓定义最小受管 `.pi/` 源码层骨架
- 定义 `.pi/` 到 `~/.pi/agent/` 的单向复制型 bootstrap/sync 契约
- 明确 Phase 1 受管路径、排除路径、冲突覆盖和删除语义

不纳入范围的内容包括：

- `MCP`、`subagent`、自定义扩展能力本身的实现
- `.agents/skills/`、`.mcp.json` 等共享层的部署自动化
- 运行时状态文件、包缓存、会话数据、认证数据的仓库化管理
- 项目页面 writeback 执行本身

## Capabilities

### New Capabilities
- `pi-project-source-layer`: Define the minimal managed `.pi/` project source layer for `pi-config`, including required paths, exclusions, and the role of project-level settings.
- `pi-runtime-bootstrap-sync`: Define the one-way bootstrap and sync contract from repository-managed `.pi/` resources to `~/.pi/agent/`, including path mapping, overwrite semantics, and managed deletion behavior.

### Modified Capabilities

## Capabilities 待确认项

- [x] 能力清单已与用户确认：`2026-04-28` 用户确认 Phase 1 只保留两个新增 capability，分别覆盖 `.pi/` 源码层与运行时同步契约

## Impact

- 为 Phase 2 之前的所有 Pi 实现工作建立清晰的 source/deployment 边界
- 防止在 `pi-config` 内重复发明 `pi-mono` 已有的配置约定
- 为后续 `MCP`、`subagent`、扩展和自动化 change 提供稳定的仓库基线

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
