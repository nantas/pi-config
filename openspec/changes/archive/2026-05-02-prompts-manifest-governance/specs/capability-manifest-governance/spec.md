# Specification Delta

## Capability 对齐（已确认）

- Capability: `capability-manifest-governance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户确认在 AGENTS.md 的 Capability Manifest Governance 表中新增 Prompts 资源类型，补充全局优先优先级规则

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: manifest-covers-prompt-resources
The Capability Manifest Governance section in `AGENTS.md` SHALL include "Prompts" — `.md` files under `.pi/prompts/` — as a resource type that MUST be accompanied by a corresponding update to `.pi/capabilities.yaml`.

#### Scenario: add-prompt-requires-manifest-update
- **WHEN** a user adds, removes, or renames a prompt template in `.pi/prompts/`
- **THEN** the `global.prompts` section in `capabilities.yaml` MUST be updated accordingly

#### Scenario: manifest-governance-table-includes-prompts
- **WHEN** a user reads the Capability Manifest Governance section in `AGENTS.md`
- **THEN** the Workflow Guidance table SHALL include a row for "Add/remove a prompt", mapping to `Append to / Remove from global.prompts`

### Requirement: manifest-governance-precedence-rule
The Capability Manifest Governance section in `AGENTS.md` SHALL include a Precedence Rule subsection declaring that global (`~/.pi/agent/`) takes precedence over project (`.pi/`) for prompts and skills, and project modifications are silently ignored when a global copy exists.

#### Scenario: precedence-rule-documented
- **WHEN** a user reads the governance section
- **THEN** the Precedence Rule subsection SHALL state:
  - For **Prompts**: global version is loaded; project version is silently shadowed
  - For **Skills**: global version is loaded; pi-core emits collision diagnostics
  - Users SHOULD edit source files in the pi-config repository and run `scripts/sync-pi-agent.sh` to propagate changes
