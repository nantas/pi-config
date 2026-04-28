# Verification

## 验证结论

- 仓库治理入口已更新：`AGENTS.md` 现在要求后续 `pi-config` 功能或配置 change 在收口时显式检查 `.pi/settings.json` 影响，并在 verification 后询问是否同步全局 Pi 配置。
- 稳定治理文档已新增：`docs/pi-change-closeout-governance.md` 定义了 closeout 顺序、结果口径，以及使用现有 Phase 1 managed sync 工作流部署到 `~/.pi/agent/settings.json` 的规则。
- Phase 1 边界文档已补充 closeout governance extension：`docs/pi-phase1-boundary.md` 现在明确这条新约束不改变 copy-based overwrite 语义，也不把 `.mcp.json` 纳入 Pi settings sync 范围。
- 本次 change 对仓库 `.pi/settings.json` 的 closeout 结果是 `repo-settings-unchanged`：治理约束落地到了文档与流程，但本轮没有新增需要修改仓库 settings 真源的 Pi 受管需求。
- 本次 change 的全局同步结果是 `global-sync-confirmed-and-run`：用户确认后已执行 `scripts/sync-pi-agent.sh`，并将 `~/.pi/agent/settings.json` 更新为仓库当前受管真源。

## Spec-to-Implementation Coverage

| Capability spec | Requirement / scenario focus | Implementation evidence |
| --- | --- | --- |
| `pi-config-closeout-settings-governance` | closeout must explicitly assess repository `.pi/settings.json` impact | `AGENTS.md`, `docs/pi-change-closeout-governance.md` |
| `pi-config-closeout-settings-governance` | repo settings must be updated before verification when needed | `AGENTS.md`, `docs/pi-change-closeout-governance.md` 的 `Required Closeout Sequence` |
| `pi-config-closeout-settings-governance` | repository `.pi/settings.json` remains full managed truth | `docs/pi-change-closeout-governance.md` 的 `Deployment Rule`, `docs/pi-phase1-boundary.md` 的 `Closeout Governance Extension` |
| `pi-config-closeout-settings-governance` | verification records `repo-settings-updated` / `repo-settings-unchanged` | `AGENTS.md`, `docs/pi-change-closeout-governance.md`, 本文件 `验证结论` |
| `pi-global-runtime-sync-confirmation` | post-verification workflow asks for global sync confirmation | `AGENTS.md`, `docs/pi-change-closeout-governance.md` |
| `pi-global-runtime-sync-confirmation` | confirmed sync uses existing managed runtime path | `docs/pi-change-closeout-governance.md`, `scripts/sync-pi-agent.sh` |
| `pi-global-runtime-sync-confirmation` | sync remains explicit and user-confirmed | `request_user_input` 记录的用户确认结果，本文件 `验证结论` |
| `pi-global-runtime-sync-confirmation` | verification records sync disposition | `docs/pi-change-closeout-governance.md`, 本文件 `验证结论` |
| `pi-global-runtime-sync-confirmation` | `.mcp.json` stays outside this rule | `docs/pi-change-closeout-governance.md` 的 `Out Of Scope`, `docs/pi-phase1-boundary.md` |

## Task-to-Evidence Coverage

| Task | Evidence |
| --- | --- |
| 1.1 | `openspec/changes/govern-pi-config-closeout-sync/specs/pi-config-closeout-settings-governance/spec.md`, `AGENTS.md`, `docs/pi-change-closeout-governance.md` |
| 1.2 | `openspec/changes/govern-pi-config-closeout-sync/specs/pi-global-runtime-sync-confirmation/spec.md`, `docs/pi-change-closeout-governance.md`, `scripts/sync-pi-agent.sh` |
| 1.3 | `docs/pi-phase1-boundary.md`, `AGENTS.md`, `scripts/sync-pi-agent.sh` |
| 2.1 | `AGENTS.md` |
| 2.2 | `docs/pi-change-closeout-governance.md` |
| 2.3 | `docs/pi-phase1-boundary.md`, `docs/pi-change-closeout-governance.md` |
| 2.4 | `docs/pi-change-closeout-governance.md`, `scripts/sync-pi-agent.sh` unchanged |
| 3.1 | `docs/pi-change-closeout-governance.md` 的结果口径，`AGENTS.md`，本文件 `验证结论` 中的 `repo-settings-unchanged` |
| 3.2 | `docs/pi-change-closeout-governance.md` 的 sync disposition 结果口径，`scripts/sync-pi-agent.sh` 执行结果，本文件 `验证结论` 中的 `global-sync-confirmed-and-run` |
| 3.3 | `docs/pi-phase1-boundary.md`, `docs/pi-change-closeout-governance.md` 的 `Out Of Scope` |
| 4.1 | 本文件整体 |
| 4.2 | `openspec/changes/govern-pi-config-closeout-sync/writeback.md` |
| 4.3 | `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`，执行时间 `2026-04-28T16:12:14Z` |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 仓库治理规则 | `AGENTS.md` | 2.1, 3.1, 3.2 |
| Closeout 治理文档 | `docs/pi-change-closeout-governance.md` | 2.2, 3.1, 3.2, 3.3 |
| Phase 1 边界文档 | `docs/pi-phase1-boundary.md` | 1.3, 2.3, 3.3 |
| Managed sync 入口 | `scripts/sync-pi-agent.sh` | 1.3, 2.4, 3.2 |
| 当前仓库 settings 真源 | `.pi/settings.json` | 3.1, 3.2 |
| 当前全局 runtime settings | `~/.pi/agent/settings.json` | 3.2 |
| Writeback 目标页 | `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` | 4.3 |

## 运行时与收口记录

- repository settings disposition: `repo-settings-unchanged`
- global sync disposition: `global-sync-confirmed-and-run`
- sync execution time: `2026-04-28T16:12:14Z`
- sync command: `./scripts/sync-pi-agent.sh`
- resulting runtime settings:

```json
{
  "packages": [
    "npm:pi-mcp-adapter@2.3.4"
  ]
}
```

## 缺口与阻塞项

- 无实现阻塞。
- 本次 change 只补治理约束，不引入 `.pi/settings.json` merge 语义，也不把 `.mcp.json` 拉入 Phase 1 Pi settings 自动部署范围。
