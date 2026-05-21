# Specification Delta

## Capability 对齐（已确认）

- Capability: `reference-docs-consolidation`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户确认清单不变，继续创建 specs

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: pi-provider-model-relocated

The content of `.pi/agent/AGENTS.d/pi-provider-model.md` SHALL be moved to `docs/reference/pi-provider-model.md`
and the original AGENTS.d file SHALL be deleted.

#### Scenario: new-doc-exists
- **WHEN** `docs/reference/pi-provider-model.md` is read
- **THEN** it contains the full Pi custom provider and model configuration documentation
- **AND** does not contain placeholder text

#### Scenario: old-doc-removed
- **WHEN** `.pi/agent/AGENTS.d/pi-provider-model.md` is inspected
- **THEN** the file no longer exists

### Requirement: readme-governance-relocated

The content of `.pi/agent/AGENTS.d/readme-governance.md` SHALL be moved to `docs/reference/readme-governance.md`
and the original AGENTS.d file SHALL be deleted.

#### Scenario: new-doc-exists
- **WHEN** `docs/reference/readme-governance.md` is read
- **THEN** it contains the full README maintenance governance documentation
- **AND** does not contain placeholder text

#### Scenario: old-doc-removed
- **WHEN** `.pi/agent/AGENTS.d/readme-governance.md` is inspected
- **THEN** the file no longer exists

### Requirement: project-agents-references-added

The project-level `AGENTS.md` (repository root) SHALL contain references to both
`docs/reference/pi-provider-model.md` and `docs/reference/readme-governance.md`
so that agents working in pi-config can discover these documents.

#### Scenario: project-agents-references-readme-governance
- **WHEN** the project-level `AGENTS.md` is read
- **THEN** it contains a link to `docs/reference/readme-governance.md`

#### Scenario: project-agents-references-provider-model
- **WHEN** the project-level `AGENTS.md` is read
- **THEN** it contains a link to `docs/reference/pi-provider-model.md`

### Requirement: global-agents-link-updated

The global `.pi/agent/AGENTS.md` ("Pi 供应商与模型配置" and "README 维护" sections) SHALL
replace references to `AGENTS.d/pi-provider-model.md` and `AGENTS.d/readme-governance.md`
with references to `docs/reference/pi-provider-model.md` and `docs/reference/readme-governance.md`
(resolved relative to the pi-config repository root).

#### Scenario: global-agents-provider-link
- **WHEN** `.pi/agent/AGENTS.md` is checked for references to pi-provider-model
- **THEN** it references `docs/reference/pi-provider-model.md` and not `AGENTS.d/pi-provider-model.md`

#### Scenario: global-agents-readme-link
- **WHEN** `.pi/agent/AGENTS.md` is checked for references to readme-governance
- **THEN** it references `docs/reference/readme-governance.md` and not `AGENTS.d/readme-governance.md`

## REMOVED Requirements

### Requirement: agents-d-files-deleted

**Reason**: These files are no longer needed in AGENTS.d/:
- `pi-provider-model.md` — moved to `docs/reference/`
- `readme-governance.md` — moved to `docs/reference/`

**Migration**: References in `.pi/agent/AGENTS.md` are updated to point to `docs/reference/`.
The project-level `AGENTS.md` adds direct links to the new locations.
