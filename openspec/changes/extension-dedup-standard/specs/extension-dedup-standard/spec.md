# Specification Delta

## Capability 对齐（已确认）

- Capability: `extension-dedup-standard`
- 来源: `proposal.md` / 用户确认
- 变更类型: new
- 用户确认摘要: 为 `dollar-skill-invoke.ts` 添加 globalThis 去重标记，并在 pi-extension-dev 技能中标准化自去重要求

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Dollar-Skill-Invoke Self-Dedup

The system SHALL prevent duplicate registration of `dollar-skill-invoke.ts` when the same extension file is loaded from both global and project-local paths.

#### Scenario: Dedup marker on export function entry
- **WHEN** `dollar-skill-invoke.ts` is loaded
- **THEN** at the entry of its export default function, a `globalThis` check SHALL be performed
- **THEN** if another copy has already been loaded, the function SHALL return immediately before registering any events or handlers

#### Scenario: Global sync preserved
- **WHEN** `scripts/sync-pi-agent.sh` runs
- **THEN** `dollar-skill-invoke.ts` SHALL remain in the sync (no exclusion)
- **THEN** the dedup mechanism SHALL handle the duplicate at runtime

### Requirement: Pi-Extension-Dev Skill Standard

The `pi-extension-dev` skill SHALL document the requirement for self-deduplication in synced extensions.

#### Scenario: Dedup requirement in skill
- **WHEN** an extension developer reads the `pi-extension-dev` skill
- **THEN** the Implementation Guidance (Phase D) SHALL instruct that any extension deployed globally must include a `globalThis` dedup marker at its entry point
- **THEN** the skill SHALL explain that this prevents duplicate registration when the same extension is loaded from both project-local and global paths
