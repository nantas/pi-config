# Specification Delta: capability-manifest

## Capability 对齐（已确认）

- Capability: `capability-manifest`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: subagent-dispatch 的 manifest 声明从 `global.settings.packages` 迁移至 `global.extensions`

## 规范真源声明

- 本文件是 `capability-manifest` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Subagent-Dispatch Is Declared As Global Extension
The system SHALL declare `subagent-dispatch` in `global.extensions` instead of `global.settings.packages` in `.pi/capabilities.yaml`, reflecting its nature as an extension with npm dependencies.

#### Scenario: Manifest extension list includes subagent-dispatch
- **WHEN** `.pi/capabilities.yaml` is inspected
- **THEN** `global.extensions` contains `subagent-dispatch`

#### Scenario: Manifest packages list excludes subagent-dispatch
- **WHEN** `.pi/capabilities.yaml` is inspected
- **THEN** `global.settings.packages` does NOT contain `./packages/subagent-dispatch`

### Requirement: Global Extension Follows Directory Pattern
The system SHALL support `subagent-dispatch/` (directory with `index.ts` and `package.json`) as a global extension, consistent with the existing `obsidian-tools` pattern.

#### Scenario: Extension directory exists
- **WHEN** the sync script checks `.pi/extensions/subagent-dispatch/`
- **THEN** it copies the directory to `~/.pi/agent/extensions/subagent-dispatch/`
