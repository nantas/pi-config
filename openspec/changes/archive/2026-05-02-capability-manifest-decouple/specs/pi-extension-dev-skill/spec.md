# Specification Delta: pi-extension-dev-skill

## Capability 对齐（已确认）

- Capability: `pi-extension-dev-skill`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 已确认 Phase F (Deployment + Archive) 末尾新增 capabilities.yaml 写入步骤

## 规范真源声明

- 本文件是 `pi-extension-dev-skill` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Deployment Phase Must Include Capability Manifest Update
The system SHALL extend the `pi-extension-dev` skill's Phase F (Deployment + Archive) to include a capabilities.yaml update step after the extension is verified and synced.

#### Scenario: Deployment phase workflow
- **WHEN** Phase F (Deployment + Archive) is executed
- **THEN** the workflow includes the following sub-steps in order: verification, sync, manifest update, archive

## ADDED Requirements

### Requirement: Deployment Must Write Global Extension To Manifest
The system SHALL add the extension name to `global.extensions` in `.pi/capabilities.yaml` when the extension is designated as global scope.

#### Scenario: Global extension is recorded
- **WHEN** a new extension is designated as global scope during design
- **THEN** in Phase F, the extension name is appended to `global.extensions` in `.pi/capabilities.yaml`

#### Scenario: Duplicate global extension is not added
- **WHEN** the extension name already exists in `global.extensions`
- **THEN** the workflow skips the update

### Requirement: Deployment Must Write Catalog Extension To Manifest
The system SHALL append a catalog entry to `catalog.extensions` in `.pi/capabilities.yaml` when the extension is designated as optional (catalog) scope.

#### Scenario: Catalog extension is recorded
- **WHEN** a new extension is designated as optional scope during design
- **THEN** in Phase F, a new entry is added to `catalog.extensions` with `name`, `source`, and `description`

#### Scenario: Catalog extension entry includes metadata
- **WHEN** the catalog entry is created
- **THEN** it includes `has_package_json: true` if the extension directory contains a `package.json`

### Requirement: Manifest Update Must Happen Before Archive
The system SHALL perform the capabilities.yaml update before the OpenSpec archive step to ensure the archive reflects the final repository state.

#### Scenario: Update before archive
- **WHEN** Phase F executes
- **THEN** manifest update occurs after the global sync step and before the archive step

### Requirement: Manifest Update Must Be Documented In Verification
The system SHALL record the capabilities.yaml update in the verification evidence for the change.

#### Scenario: Verification includes manifest update
- **WHEN** verifying the extension change
- **THEN** the verification evidence records whether `global.extensions` or `catalog.extensions` was updated
