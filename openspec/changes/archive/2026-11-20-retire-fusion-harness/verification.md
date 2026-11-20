# Verification

## 验证结论

fusion-harness 的扩展、配置、安装副本、运行产物与 OpenSpec 能力声明已全部移除，sol-pi 的 `actionFusion` 等其他同名机制与其余 fork 未受影响。两份 delta spec 覆盖 22 条 requirement 的移除（`fusion-harness-integration` 16 条 + `capability-manifest` 6 条）。

## Spec-to-Implementation Coverage

| Requirement（来自 delta） | 实现证据 | 结论 |
| --- | --- | --- |
| `fusion-harness-integration` 16 条 REMOVED | `openspec archive` 因空 spec 校验拒绝写入（"Spec must have at least one requirement"），改用 `--skip-specs` 归档 + agent 驱动同步：删除 `openspec/specs/fusion-harness-integration/`；`openspec spec list` 已无 fusion capability | ✅ |
| `capability-manifest` 6 条 REMOVED（fork 注册、packages 必含 fusion、fusionHarness 配置块 ×2、settings 引用 fusion、包冲突） | agent 驱动同步按 delta 删除 6 个 requirement 块；`openspec spec validate capability-manifest` 通过，剩余 7 条通用规则，spec 内 fusion 引用计数 0 | ✅ |
| delta 未覆盖的行为 | 无新增行为，本次为纯退役 | ✅ |

## Task-to-Evidence Coverage

| Task | 证据 | 结论 |
| --- | --- | --- |
| 2.1 归档 `fusion-output-scratch-confinement` | `openspec/changes/archive/2026-11-20-fusion-output-scratch-confinement/`；`openspec list` 不再显示该 change | ✅ |
| 2.3 仓库 `.pi/settings.json` | `grep -c fusionHarness .pi/settings.json` → 0 | ✅ |
| 2.4 运行时 `~/.pi/agent/settings.json` | `grep -c fusionHarness` → 0 | ✅ |
| 2.5 安装副本 | `ls ~/.pi/agent/git/github.com/nantas/` → 仅 `pi-mcp-adapter`、`pi-tool-display`、`pi-xai` | ✅ |
| 2.6 运行产物 | `.scratch/` 仅剩 `bin`，`du -sh` 5.2M → 4.9M | ✅ |
| 2.7 fork 条目状态 | `forks/manifest.yaml` fusion-harness `status: archived` | ✅ |
| 4.3 回写 | `CONTEXT.md` 无 fusion 引用；`openspec/pkg-backlog.md` 2026-11-10 条目追加第 4 条清理记录 | ✅ |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 配置清理 | `.pi/settings.json`、`~/.pi/agent/settings.json` | task 2.3 / 2.4 |
| 磁盘清理 | `~/.pi/agent/git/github.com/nantas/`、`.scratch/` | task 2.5 / 2.6 |
| fork 状态 | `forks/manifest.yaml` | task 2.7 |
| 历史 change 归档 | `openspec/changes/archive/2026-11-20-fusion-output-scratch-confinement/` | task 2.1 |
| 治理记录 | `openspec/pkg-backlog.md`（2026-11-10 条目第 4 点） | task 4.3 |
| 同名机制未受影响 | `.pi/managed/sol-pi.json` 的 `actionFusion: false` 保持原值 | design 决策 5 |

## Closeout 记录

- 仓库 settings 结果：`repo-settings-updated`（`.pi/settings.json` 删除 `fusionHarness`，`.pi/capabilities.yaml` 无 fusion 包）
- 全局同步结果：`global-sync-confirmed-and-run`（用户确认后执行 `./scripts/sync-pi-agent.sh`）
  - `~/.pi/agent/settings.json`：`fusionHarness` 不存在；`defaultProvider: magpie`、`defaultModel: group/grunt`、9 个 `enabledModels` 全为 magpie 前缀，均被保留
  - `~/.pi/agent/models.json`：仍只有 `magpie` provider
  - `~/.pi/agent/agents/`：只剩 `worker`、`reviewer`、`researcher`，模型分别为 `magpie/group/grunt`、`magpie/group/grunt`、`magpie/group/workhorse`

## 缺口与阻塞项

- 无阻塞项。
- 归档方式说明：`openspec archive` 的 spec 更新校验不允许产出零 requirement 的 spec，因此本次用 `--skip-specs` 归档后按 `/opsx-sync` 的 agent 驱动方式应用两份 delta（该流程本身就是手动编辑主 spec）。
- `docs/plans/fusion-harness-followup-roadmap.md` 仍保留历史规划内容（按 proposal 范围边界刻意不改写），其中引用的 fork 路径已不存在。将来若重开 fusion 工作，以 `forks/manifest.yaml` 的 archived 条目和 backlog 恢复步骤为准。
