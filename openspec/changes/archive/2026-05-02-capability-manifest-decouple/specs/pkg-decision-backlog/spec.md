# Specification Delta: pkg-decision-backlog

## Capability 对齐（已确认）

- Capability: `pkg-decision-backlog`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 已确认 Decision Phase 末尾新增 capabilities.yaml 写入（global → global.settings.packages，backlog → catalog.packages）

## 规范真源声明

- 本文件是 `pkg-decision-backlog` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Three-Option Decision Presentation
After research is complete, the system SHALL present the user with three clear options and their consequences, including the manifest update consequence for each option.

#### Scenario: decision prompt after research
- **WHEN** research summary is complete
- **THEN** the system SHALL present:
  - Option A: Add to global config — update `.pi/settings.json` packages array, update `.pi/capabilities.yaml` `global.settings.packages`, and sync to `~/.pi/agent/`
  - Option B: Record to backlog — add entry to `openspec/pkg-backlog.md`, add to `.pi/capabilities.yaml` `catalog.packages`, and clean up install
  - Option C: Discard — clean up install only

### Requirement: Settings Rollback for Non-Global Decisions
The system SHALL roll back `.pi/settings.json` modifications made by Phase 2 install when the user does not choose Option A (global config).

#### Scenario: rollback for backlog decision
- **WHEN** user chooses Option B (backlog)
- **THEN** the system SHALL remove the package entry from `.pi/settings.json` `packages` array
- **AND** the system SHALL execute `pi remove <source>` to clean installed resources

#### Scenario: rollback for discard decision
- **WHEN** user chooses Option C (discard)
- **THEN** the system SHALL remove the package entry from `.pi/settings.json` `packages` array
- **AND** the system SHALL execute `pi remove <source>` to clean installed resources

#### Scenario: no rollback for global decision
- **WHEN** user chooses Option A (global config)
- **THEN** the system SHALL retain the `.pi/settings.json` modification made during Phase 2 install

## ADDED Requirements

### Requirement: Global Decision Must Write To Capability Manifest
The system SHALL append the package source to `global.settings.packages` in `.pi/capabilities.yaml` when the user chooses Option A (global config).

#### Scenario: Package added to global packages in manifest
- **WHEN** user chooses Option A for a new package
- **THEN** the package source is appended to the `global.settings.packages` list in `.pi/capabilities.yaml`

#### Scenario: Duplicate package is not added
- **WHEN** the package source already exists in `global.settings.packages`
- **THEN** the workflow skips the manifest update and reports the package is already listed

### Requirement: Backlog Decision Must Write To Catalog Packages
The system SHALL append a catalog entry to `catalog.packages` in `.pi/capabilities.yaml` when the user chooses Option B (backlog).

#### Scenario: Backlog package added to catalog
- **WHEN** user chooses Option B for a new package
- **THEN** a new entry is added to `catalog.packages` with `name`, `source`, `description`, and `type: "settings-entry"`

#### Scenario: Backlog package removed from catalog when promoted
- **WHEN** a package already in `catalog.packages` is later promoted to global
- **THEN** the workflow removes it from `catalog.packages` and adds it to `global.settings.packages`

### Requirement: Discard Decision Must Not Write To Manifest
The system SHALL NOT modify `.pi/capabilities.yaml` when the user chooses Option C (discard).

#### Scenario: Discard skips manifest update
- **WHEN** user chooses Option C
- **THEN** the system does not read or write `.pi/capabilities.yaml`
