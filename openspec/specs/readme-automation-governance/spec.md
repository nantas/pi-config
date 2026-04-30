# Specification Delta

## Capability 对齐（已确认）

- Capability: `readme-automation-governance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户确认需要定义 README 随仓库新增功能自动更新的治理工作流，包括触发条件、更新检查清单和同步约束

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: automation-trigger-conditions

The system SHALL define clear trigger conditions for README updates.

#### Scenario: new-extension-trigger
- **WHEN** a new extension file is added to `.pi/extensions/`
- **THEN** the README `自定义扩展` section SHALL be updated to include the new extension
- **AND** the update SHALL be part of the extension's change closeout process

#### Scenario: new-package-trigger
- **WHEN** a new package is added to `.pi/settings.json` `packages` array via `pkg-research` workflow
- **THEN** the README `外部 Pi 包` section SHALL be updated during the package's global sync phase
- **AND** if the package is recorded to backlog only, the README SHALL NOT be updated

#### Scenario: new-skill-or-agent-trigger
- **WHEN** a new skill or agent definition is added to `.pi/skills/` or `.pi/agents/`
- **THEN** the relevant README section SHALL be updated as part of the change's closeout verification step

#### Scenario: new-openspec-capability-trigger
- **WHEN** a new capability spec is added to `openspec/specs/`
- **THEN** if the capability represents a user-facing feature, the README SHALL be updated during that change's closeout

### Requirement: automation-update-checklist

The system SHALL define a standardized update checklist for README modifications.

#### Scenario: checklist-contents
- **WHEN** the README needs updating
- **THEN** the following checklist SHALL be applied:
  1. Add entry in the correct data-type section
  2. Include: 名称、功能说明、解决的问题
  3. Add relative path links to source files
  4. Add link to OpenSpec spec if applicable
  5. Verify all existing links still work
  6. Verify section ordering is preserved
  7. Run a final `README.md` file integrity check (no broken markdown, no placeholder text)

### Requirement: automation-closeout-integration

README update SHALL be integrated into the change closeout governance workflow.

#### Scenario: closeout-step
- **WHEN** a `pi-config` change reaches verification phase (per `docs/pi-change-closeout-governance.md`)
- **THEN** the closeout SHALL include an explicit assessment: "Does this change require a README update?"
- **AND** if yes, the README update SHALL be completed before verification passes

#### Scenario: self-governance-exception
- **WHEN** this change (`comprehensive-readme-and-automation-governance`) is being archived
- **THEN** the self-governance check (readme-automation-governance triggering itself) SHALL be explicitly noted and skipped
- **AND** the verification SHALL record this exception

### Requirement: automation-sync-constraints

The README update workflow SHALL respect the existing Phase 1 sync contract.

#### Scenario: no-runtime-sync
- **WHEN** README is updated
- **THEN** the change SHALL be managed through git (not through `scripts/sync-pi-agent.sh`)
- **AND** the README is NOT part of the sync script's managed path set
- **AND** no `~/.pi/agent/` target exists for README

#### Scenario: writeback-boundary
- **WHEN** the change's writeback to `repo://orbitos` references the README
- **THEN** the writeback SHALL only contain a summary link and status
- **AND** SHALL NOT duplicate README content


