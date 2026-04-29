# Specification Delta

## Capability 对齐（已确认）

- Capability: `extension-self-dedup`
- 来源: `proposal.md` / 问题报告与用户确认
- 变更类型: new
- 用户确认摘要: 在 `planner-toggle.ts` 入口添加 `globalThis` 标记检查，后加载副本静默退出，避免快捷键冲突警告

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Extension Self-Deduplication

The system SHALL prevent duplicate registration of `planner-toggle.ts` when the same extension file is loaded from both global (`~/.pi/agent/extensions/`) and project-local (`.pi/extensions/`) paths.

#### Scenario: Global copy loaded first, project copy loaded second
- **WHEN** both global and project-local copies of `planner-toggle.ts` exist and the global copy is loaded first
- **THEN** the global copy SHALL register its shortcut, command, tool_call handler, and all event handlers normally
- **THEN** when the project-local copy is loaded, it SHALL detect that registration has already occurred and SHALL skip all registrations
- **THEN** the TUI SHALL NOT show any shortcut conflict warning

#### Scenario: Project copy loaded first, global copy loaded second
- **WHEN** both copies exist and the project-local copy is loaded first
- **THEN** the project-local copy SHALL register normally
- **THEN** the global copy SHALL detect prior registration and become a no-op

#### Scenario: Only one copy exists
- **WHEN** only one copy of `planner-toggle.ts` exists (either global or project-local)
- **THEN** the extension SHALL register normally without any dedup bypass

#### Scenario: Global sync preserved
- **WHEN** `scripts/sync-pi-agent.sh` runs and `planner-toggle.ts` exists in `.pi/extensions/`
- **THEN** it SHALL still be copied to `~/.pi/agent/extensions/` (no exclusion)
- **THEN** the dedup mechanism SHALL handle the duplicate at runtime
