# Design

## Context

fusion-harness 是 fork 自 `github.com/disler/fusion-harness` 的多模型编排扩展（`/opinion`、`/fusion`、`/auto-validate`、`/fusion-housekeep`）。2026-11-10 决定 `removed-disabled`：从 `global.settings.packages` 移除，但保留 spec、fork 克隆与 OpenSpec change 以便恢复。

此后扩展不再加载，但保留项逐步与实际脱节：

- `fusionHarness` 配置块仍在仓库与本机 settings 中。managed sync 的规则是「manifest 未声明的键从目标端保留」，所以本机这个键不会被任何一次 sync 清掉，只能显式删除。
- 本地安装副本留在 `~/.pi/agent/git/github.com/nantas/fusion-harness/`，Pi 只在 packages 里查找它，因此纯占位。
- `openspec/specs/fusion-harness-integration` 的 16 条 requirement 与 `capability-manifest` 的 6 条 fusion 专属 requirement 都在描述一个不再交付的能力，是规范与实现相反的错误状态。

## Goals / Non-Goals

**Goals:**

- 让仓库与本机运行时都不再出现 fusion-harness 的配置、安装副本与运行产物。
- 让 OpenSpec 不再声明一个已退役的 capability。
- 保留可恢复性：重装步骤留在 `openspec/pkg-backlog.md`，fork metadata 留在 `forks/manifest.yaml`（状态改为 archived）。

**Non-Goals:**

- 不重写历史：`openspec/changes/archive/` 下与 fusion 相关的 change 全部保留原样。
- 不改写 `docs/plans/fusion-harness-followup-roadmap.md` 的历史规划内容。
- 不动 sol-pi 的 `actionFusion` 配置，那是同名的另一个机制。

## Decisions

**1. 用 capability 级 REMOVED 收敛 spec，而不是逐条 MODIFIED**

`fusion-harness-integration` 的 16 条 requirement 描述的是同一套已消失的机制，逐条改写没有意义。delta 用 `## REMOVED Requirements` 一次列出，归档时由 `openspec archive` 应用到主 spec。`capability-manifest` 只移除 6 条 fusion 专属 requirement，其余包管理规则保留。

**2. 主 spec 目录在归档后显式删除**

`openspec spec` 没有 delete 子命令。归档会把 REMOVED 应用到主 spec，留下一个只有 Purpose 和空 Requirements 的文件。归档完成后直接删除空的 spec 目录，避免 `openspec spec list` 里出现幽灵 capability。

**3. fork 条目标 archived 而不是删除**

`forks/manifest.yaml` 的条目包含 fork URL、upstream URL 与 changes_summary，是恢复时的唯一来源。参照已有的 `pi-xai` 条目，把 `status` 从 `active` 改为 `archived`，其余字段不动。

**4. 磁盘清理不产生 OpenSpec 记录**

删 `~/.pi/agent/git/github.com/nantas/fusion-harness/` 与 `.scratch/fusion-harness/` 是可逆的（前者靠 `pi install`，后者靠重跑），不进入 spec 或 backlog 正文，只在 verification 记录。

**5. 未归档的 `fusion-output-scratch-confinement` 先归档**

该 change 的 artifacts 已 7/7 完成但停在 15/21 tasks，且其 delta 引用的 5 条 MODIFIED requirement 从未存在于主 spec（标题不匹配），直接归档会因 "not found" 中止。它描述的 confinement 行为随扩展一起消失，因此用 `--skip-specs` 归档，不做 spec 同步。

## Risks / Migration

- **风险：误删共享文件。** 只删 `fusion-harness` 专属路径；`.scratch/` 下其他项目产物、`~/.pi/agent/git/github.com/nantas/` 下其他 fork（`pi-mcp-adapter`、`pi-tool-display`、`pi-xai`）不触碰。
- **风险：`capability-manifest` 过度删除。** 只删 requirement 名里明确含 Fusion/FusionHarness 的 6 条，通用包管理规则（manifest 结构、global/catalog 分层、packages 权威性、移除清理 node_modules）全部保留。
- **迁移路径（恢复 fusion-harness）**：`forks/manifest.yaml` 取 fork URL → `pi install git:github.com/nantas/fusion-harness` → 在 `capabilities.yaml` 的 `global.settings.packages` 加回 git 源 → 需要 `/opinion` 默认模型时恢复 `fusionHarness` 块 → 跑 `scripts/sync-pi-agent.sh`。
