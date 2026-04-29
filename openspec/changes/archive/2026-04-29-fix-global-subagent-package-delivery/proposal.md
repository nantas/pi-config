# Proposal

## 问题定义

当前 `pi-config` 在仓库内启动 `pi` 时会先加载全局运行时副本 `~/.pi/agent/extensions/subagent-dispatch/index.ts`，该扩展通过相对路径硬编码导入 `../../npm/node_modules/pi-subagents/*.ts`。这一模型把运行时正确性建立在 `~/.pi/agent/npm/node_modules/pi-subagents` 必须存在的前提上，但该路径既不是 Pi 对 user package 的原生安装位置，也没有被当前受管 sync 流程稳定保障，导致扩展在 import 阶段直接失败，甚至来不及让 project-local 副本接管。

问题根因不是单一文件缺失，而是交付模型错位：`subagent-dispatch` 目前被当作“同步到 `~/.pi/agent/extensions/` 的裸源码扩展”交付，而它实际又依赖 package 风格的运行时依赖解析。参考 `docs/plans/pi-customization-reference.md`，Pi 对跨仓复用的全局扩展更稳定的路径是 `settings.json -> packages`，而不是继续把带依赖的 TypeScript 目录按纯文件同步到全局 `extensions/`。

## 范围边界

- 本次 change 聚焦 `subagent-dispatch` 的全局交付与依赖解析模型修正，使其可以在所有仓库中作为全局 Pi 能力稳定加载。
- 本次 change 允许调整 `.pi/settings.json`、`scripts/sync-pi-agent.sh`、subagent-dispatch 扩展目录结构，以及与之直接相关的文档、测试和 verification 口径。
- 本次 change 保留 `.pi/agents/*.md` 作为 agent contract 真源，不改写既有 dispatch tool 的用户入口语义。
- 本次 change 不引入 git 远程 package 分发；先以当前 repo 的 local-path Pi package 作为全局 source。
- 本次 change 不扩展 `.mcp.json`、shared skills、theme/prompt 治理范围，也不修改上游 `pi-subagents` 包源码。

## Capabilities

### New Capabilities
- `pi-global-subagent-package-delivery`: Define a global local-path Pi package delivery model for `subagent-dispatch` so the extension and its runtime dependencies load correctly in any repository.

### Modified Capabilities
- `pi-subagent-dispatch-baseline`: Change the dispatch extension delivery shape from a synced raw global extension directory to a package-backed runtime entry while preserving the repository-owned dispatch contract.
- `pi-runtime-bootstrap-sync`: Update the managed Pi sync contract so global `settings.json` can be generated from repository truth with an absolute local package path instead of remaining a byte-for-byte copy.

## Capabilities 待确认项

- [x] 能力清单已与用户确认：当前目标是先支持本地路径全局安装，不考虑 git 远程路径

## Impact

- `subagent-dispatch` 将从 `.pi/extensions/` 裸目录形态迁移到 package-owned 入口，运行时依赖改由 package 自身承担。
- 仓库 `.pi/settings.json` 与全局 `~/.pi/agent/settings.json` 的关系将从“直接复制”收敛为“仓库真源 + sync 生成 global runtime variant”，至少对 global settings 生效。
- 现有 verification 中依赖 `~/.pi/agent/npm/node_modules/pi-subagents/...` 的证据链需要被替换为 package-backed 运行时证据。
- 后续实现完成后，需要重新评估 repository `.pi/settings.json` 是否变更，并在 closeout 时按现有治理流程确认是否同步到全局 Pi runtime。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
