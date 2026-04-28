# Verification

## 验证结论

- Phase 1 最小 `.pi/` 受管源码层已落地：`.pi/settings.json`、`.pi/extensions/`、`.pi/prompts/`、`.pi/themes/`、`.pi/agents/` 均已存在。
- `scripts/sync-pi-agent.sh` 已实现仓库到 `~/.pi/agent/` 的单向复制型 sync，只操作获批的 Phase 1 Pi 专属路径。
- 本地临时运行时验证已覆盖 overwrite、managed deletion、unmanaged preservation 与 `.gitkeep` 不落入运行时四类行为，结果均通过。
- `repo://pi-mono` 依据已记录到本文件：项目级 `.pi/settings.json` 与全局 `~/.pi/agent/settings.json` 的层级关系、资源默认发现语义，以及 `agents` 的用户级 / 项目级目录约定均来自官方源码或文档，而不是本仓自定义。
- writeback 已执行到 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`。

## Spec-to-Implementation Coverage

| Capability spec | Requirement / scenario focus | Implementation evidence |
| --- | --- | --- |
| `pi-project-source-layer` | managed `.pi/` path set exists | `.pi/settings.json`, `.pi/extensions/.gitkeep`, `.pi/prompts/.gitkeep`, `.pi/themes/.gitkeep`, `.pi/agents/.gitkeep` |
| `pi-project-source-layer` | unmanaged paths and exclusions are explicit | `docs/pi-phase1-boundary.md` 的 `Explicitly Out Of Scope` |
| `pi-project-source-layer` | `.pi/settings.json` stays minimal and does not restate default discovery | `.pi/settings.json`, `docs/pi-phase1-boundary.md` 的 `Settings Baseline` |
| `pi-project-source-layer` | `repo://pi-mono` is the configuration query authority | `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/settings.md`, `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts` |
| `pi-runtime-bootstrap-sync` | one-way repository deployment contract | `scripts/sync-pi-agent.sh`, `docs/pi-phase1-boundary.md` 的 `Sync Contract` |
| `pi-runtime-bootstrap-sync` | sync scope excludes shared cross-agent resources | `docs/pi-phase1-boundary.md` 的 managed path set 与 out-of-scope 列表 |
| `pi-runtime-bootstrap-sync` | path mapping is explicit | `scripts/sync-pi-agent.sh`, `docs/pi-phase1-boundary.md` 的 `Managed Runtime Mapping` |
| `pi-runtime-bootstrap-sync` | overwrite and managed deletion semantics are enforced | `scripts/sync-pi-agent.sh`，以及本文件 `关键证据入口` 中的 shell 验证记录摘要 |
| `pi-runtime-bootstrap-sync` | unmanaged runtime content is preserved | `scripts/sync-pi-agent.sh` 仅遍历五个 managed mapping；shell 验证记录摘要显示 `unmanaged_ok=yes` |

## Task-to-Evidence Coverage

| Task | Evidence |
| --- | --- |
| 1.1 | `openspec/changes/establish-pi-config-hub-baseline/specs/pi-project-source-layer/spec.md`, `docs/pi-phase1-boundary.md` |
| 1.2 | `openspec/changes/establish-pi-config-hub-baseline/specs/pi-runtime-bootstrap-sync/spec.md`, `docs/pi-phase1-boundary.md` |
| 1.3 | `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/settings.md`, `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts` |
| 2.1 | `.pi/settings.json`, `.pi/extensions/.gitkeep`, `.pi/prompts/.gitkeep`, `.pi/themes/.gitkeep`, `.pi/agents/.gitkeep` |
| 2.2 | `.pi/settings.json` |
| 2.3 | `scripts/sync-pi-agent.sh` |
| 2.4 | `scripts/sync-pi-agent.sh` 的 file/dir sync 分支；shell 验证摘要 `overwrite_ok=yes`, `drift_reset=yes`, `deletion_ok=yes` |
| 2.5 | `scripts/sync-pi-agent.sh` 仅同步五个 managed target；shell 验证摘要 `unmanaged_ok=yes` |
| 2.6 | `docs/pi-phase1-boundary.md` |
| 3.1 | `.pi/` 目录骨架与本文件 `验证结论` 第一条 |
| 3.2 | 本文件 `验证结论` 第三条与 `关键证据入口` |
| 3.3 | 本文件 `Spec-to-Implementation Coverage` 与 `关键证据入口` 中的 `pi-mono` 引用 |
| 4.1 | 本文件整体 |
| 4.2 | `openspec/changes/establish-pi-config-hub-baseline/writeback.md` |
| 4.3 | `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`，执行时间 `2026-04-28T13:40:14Z` |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 受管 `.pi/` 源码层 | `.pi/` | 2.1, 3.1 |
| Sync 入口脚本 | `scripts/sync-pi-agent.sh` | 2.3, 2.4, 2.5 |
| Phase 1 边界说明 | `docs/pi-phase1-boundary.md` | 1.1, 1.2, 2.6 |
| `pi-mono` settings 真源 | `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/settings.md` | 1.3, 2.2, 3.3 |
| `pi-mono` agents 真源 | `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts` | 1.3, 3.3 |
| Writeback 目标页 | `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` | 4.3 |

Shell 验证记录摘要：

- `overwrite_ok=yes`
- `drift_reset=yes`
- `deletion_ok=yes`
- `unmanaged_ok=yes`
- `gitkeep_absent=yes`

## 缺口与阻塞项

- 无实现阻塞。
- 本次 change 只建立 Phase 1 基线，不自动部署 `.agents/skills/`、`.mcp.json`、`.pi/skills/`、`.pi/npm/` 或 `.pi/git/`；若后续需要纳入，必须通过新的 capability change 扩展范围。
