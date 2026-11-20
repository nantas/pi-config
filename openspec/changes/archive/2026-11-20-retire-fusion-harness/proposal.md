# Proposal

## 问题定义

fusion-harness 已从全局 packages 移除（`e926d75 chore(packages): disable fusion-harness globally`，backlog 2026-11-10 记录为 `removed-disabled`），扩展不再加载。但退役只做了一半，残留仍在生效面或治理面：

- `~/.pi/agent/settings.json` 与 `.pi/settings.json` 仍保留 `fusionHarness` 配置块。sync 只覆盖 manifest 声明的键，这个死键会长期留在运行时。
- `~/.pi/agent/git/github.com/nantas/fusion-harness/`（8.3M）仍在磁盘，虽不被加载但会被后续排查误认为已安装。
- `openspec/specs/fusion-harness-integration/spec.md` 仍声明 16 条 requirement（含「全局包必须含 fusion-harness」），与当前能力表相反，属规范与实现冲突。
- `openspec/specs/capability-manifest/spec.md` 有 6 条 requirement 明写 fusion 必须存在于 packages / `global.settings.fusionHarness`，同样与现状矛盾。
- `forks/manifest.yaml` 的 fusion-harness 条目仍标 `active`。
- `CONTEXT.md` 的 OpenSpec 索引仍指向 `fusion-harness-integration`。

## 范围边界

包含：

- 删除两处 `fusionHarness` 配置块（仓库 `.pi/settings.json` 与本机 `~/.pi/agent/settings.json`）。
- 删除本机安装副本与 `.scratch/fusion-harness` 运行产物。
- 移除 `fusion-harness-integration` 整个 capability（16 条 requirement）与 `capability-manifest` 中 6 条 fusion 专属 requirement。
- 收敛 fork 条目状态与 CONTEXT.md 索引。

不包含：

- 不改写 `docs/plans/fusion-harness-followup-roadmap.md` 的历史规划内容。
- 不删除 `openspec/changes/archive/` 下任何历史 change（含 `2026-11-20-fusion-output-scratch-confinement`）。
- 不删除 `forks/manifest.yaml` 条目本身，只改状态，保留恢复所需的 metadata。

## Capabilities

### New Capabilities

无。本次为纯退役，不新增能力。

### Modified Capabilities

- `fusion-harness-integration`: 移除全部 16 条 requirement，该 capability 随扩展退役而消失
- `capability-manifest`: 移除 6 条 fusion 专属 requirement（fork 注册、packages 必含 fusion、fusionHarness 配置块的相关约束）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：用户明确要求「fusion harness 这个扩展和配置我也想去掉」，并选择全清（含 spec 移除）

## Impact

- 运行时：`~/.pi/agent/settings.json` 少一个死键；`~/.pi/agent/git/.../fusion-harness` 释放 8.3M。
- 治理面：`openspec/specs/` 少一个 capability，`capability-manifest` 收敛到通用约束。
- 恢复成本：`openspec/pkg-backlog.md` 2026-11-10 条目已记录重装步骤（packages 加回 git 源 + 恢复 fusionHarness 块 + sync）。
- 不受影响：sol-pi 的 `actionFusion` 是同名不同物，与 fusion-harness 无关。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：两份 capability spec + `forks/manifest.yaml` + `CONTEXT.md` + `openspec/pkg-backlog.md`
