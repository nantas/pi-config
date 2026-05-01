# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-decision-backlog`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 三选项重构为"加入本仓库能力（子选 global/catalog）/ backlog 纯记录 / 放弃"；backlog entry schema 扩展；backlog 回归纯记录定位，不与 catalog 混淆

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Decision Prompt Must Present New Three-Option Semantics
After research and testing are complete, the system SHALL present three options with updated semantics aligned with the capability-manifest-decouple change's global/catalog model.

#### Scenario: decision prompt after Phase 2
- **WHEN** Phase 2 completes and user confirms testing
- **THEN** the system SHALL present:
  - Option A: **加入本仓库能力** — install extension to `.pi/extensions/` or retain package in `.pi/settings.json`; then ask sub-decision for distribution scope (global vs catalog)
  - Option B: **加入 backlog 列表** — only record entry in `openspec/pkg-backlog.md`; no installation, no manifest modification
  - Option C: **放弃** — clean up temporary files; optional rejection note in backlog

### Requirement: Option A Must Have Sub-Decision For Distribution Scope
When the user chooses Option A (add to repo), the system SHALL present a secondary choice between Global and Catalog distribution scope before executing the install.

#### Scenario: sub-decision prompt after Option A
- **WHEN** user chooses Option A
- **THEN** the system SHALL present:
  - A1) **Global** — `global.extensions` or `global.settings.packages` in manifest; synced to all projects via `scripts/sync-pi-agent.sh`
  - A2) **Catalog** — `catalog.extensions` or `catalog.packages` in manifest; available for on-demand installation by other repos

### Requirement: Option A Must Write Backlog Entry
When the user chooses Option A (regardless of A1 or A2), the system SHALL write a backlog entry with `Decision: global` or `Decision: catalog`.

#### Scenario: backlog entry written for global
- **WHEN** user chooses A1 (global)
- **THEN** backlog entry has `Decision: global`

#### Scenario: backlog entry written for catalog
- **WHEN** user chooses A2 (catalog)
- **THEN** backlog entry has `Decision: catalog`

### Requirement: Option B Must Not Install Nor Modify Manifest
When the user chooses Option B (backlog only), the system SHALL NOT install any files, SHALL NOT modify `.pi/settings.json`, and SHALL NOT modify `.pi/capabilities.yaml`. Only a backlog entry is written.

#### Scenario: backlog decision skips install
- **WHEN** user chooses Option B for a raw extension
- **THEN** no files are copied to `.pi/extensions/`
- **AND** no manifest is modified
- **AND** a backlog entry is written with `Decision: backlog`

#### Scenario: backlog decision rolls back package install
- **WHEN** user chooses Option B for a package source (which was already `pi install -l`'d in Phase 2)
- **THEN** the system rolls back `.pi/settings.json` (removes package from `packages` array)
- **AND** executes `pi remove <source>` to clean up installed resources
- **AND** a backlog entry is written with `Decision: backlog`

### Requirement: Option C May Write Optional Rejection Note
When the user chooses Option C (discard), the system SHALL ask if the user wants to record a brief rejection note in the backlog before cleaning up.

#### Scenario: user wants rejection note
- **WHEN** user chooses Option C and confirms "yes" to recording a note
- **THEN** a backlog entry is written with `Decision: discarded` and the rejection reason

#### Scenario: user declines rejection note
- **WHEN** user chooses Option C and declines recording a note
- **THEN** temporary files are cleaned up with no backlog entry

### Requirement: Catalog Decision Must Not Roll Back Local Install
When the user chooses Option A2 (catalog), the system SHALL retain the local installation (extension in `.pi/extensions/` or package in `.pi/settings.json`) and SHALL NOT roll back.

#### Scenario: catalog retains local extension
- **WHEN** user chooses A2 for a raw extension
- **THEN** extension file is copied to `.pi/extensions/` (local activation)
- **AND** entry is added to `catalog.extensions`
- **AND** no rollback occurs

#### Scenario: catalog retains local package
- **WHEN** user chooses A2 for a package source
- **THEN** `.pi/settings.json` entry is retained
- **AND** entry is added to `catalog.packages`
- **AND** no rollback occurs

### Requirement: Backlog Entry Schema Must Be Extended
The system SHALL use an extended backlog entry schema that supports raw extension metadata fields.

#### Scenario: backlog entry for package uses existing fields
- **WHEN** writing a backlog entry for a package source
- **THEN** the entry includes: `Version`, `Research Date`, `Resource Types`, `Decision`, `Reason`, `Notes`, `Source Type: npm-package` or `git-package`, `Source Repo`, `Install Method: pi-install`

#### Scenario: backlog entry for raw extension uses new fields
- **WHEN** writing a backlog entry for a raw extension
- **THEN** the entry includes: `Version` (or "latest"), `Research Date`, `Resource Types: extensions`, `Decision`, `Reason`, `Notes`, `Source Type: raw-extension`, `Source Repo: <URL>`, `Install Method: raw-copy`, `Has Dependencies: <true|false>`

#### Scenario: backlog entries are individual per resource
- **WHEN** multiple extensions from the same source repo are evaluated
- **THEN** each extension gets its own backlog entry (not grouped as a collection)
