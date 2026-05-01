# Capability: pkg-decision-backlog

## Purpose

Provide a three-option decision framework after package research (global config / backlog / discard), manage `.pi/settings.json` rollback for non-global decisions, update `.pi/capabilities.yaml` accordingly, and persist decisions in a structured `openspec/pkg-backlog.md`.

## Requirements

### Requirement: Three-Option Decision Presentation
After research is complete, the system SHALL present the user with three clear options and their consequences, including the manifest update consequence for each option.

#### Scenario: decision prompt after research
- **WHEN** research summary is complete
- **THEN** the system SHALL present:
  - Option A: **加入本仓库能力** — install extension to `.pi/extensions/` or retain package in `.pi/settings.json`; then ask sub-decision for distribution scope (global vs catalog)
  - Option B: **加入 backlog 列表** — only record entry in `openspec/pkg-backlog.md`; no installation, no manifest modification
  - Option C: **放弃** — clean up temporary files; optional rejection note in backlog

#### Scenario: uncertain outcome handling
- **WHEN** the system cannot confidently recommend an option
- **THEN** the system SHALL present findings with noted uncertainties and explicitly request user decision

### Requirement: Option A Sub-Decision for Distribution Scope
When the user chooses Option A (add to repo), the system SHALL present a secondary choice between Global and Catalog distribution scope before executing the install.

#### Scenario: sub-decision prompt after Option A
- **WHEN** user chooses Option A
- **THEN** the system SHALL present:
  - A1) **Global** — `global.extensions` or `global.settings.packages` in manifest; synced to all projects via `scripts/sync-pi-agent.sh`
  - A2) **Catalog** — `catalog.extensions` or `catalog.packages` in manifest; available for on-demand installation by other repos

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

#### Scenario: no rollback for catalog decision
- **WHEN** user chooses Option A2 (catalog)
- **THEN** the extension file is retained in `.pi/extensions/` (or package entry in `.pi/settings.json`)
- **AND** no rollback occurs; local activation is preserved

### Requirement: Global Decision Must Write To Capability Manifest
The system SHALL write to the appropriate `global.*` section in `.pi/capabilities.yaml` when the user chooses Option A1 (global).

#### Scenario: Package added to global packages in manifest
- **WHEN** user chooses Option A1 for a new package
- **THEN** the package source is appended to the `global.settings.packages` list in `.pi/capabilities.yaml`

#### Scenario: Raw extension added to global extensions in manifest
- **WHEN** user chooses Option A1 for a raw extension
- **THEN** the extension file is copied to `.pi/extensions/` and the entry is appended to `global.extensions` in `.pi/capabilities.yaml`

#### Scenario: Duplicate entry is not added
- **WHEN** the source already exists in the relevant `global.*` section
- **THEN** the workflow skips the manifest update and reports the entry is already listed

### Requirement: Catalog Decision Must Write To Catalog Capability Manifest
The system SHALL append a catalog entry to the appropriate `catalog.*` section in `.pi/capabilities.yaml` when the user chooses Option A2 (catalog).

#### Scenario: Catalog package added to catalog.packages
- **WHEN** user chooses Option A2 for a new package
- **THEN** a new entry is added to `catalog.packages` with `name`, `source`, `description`, and `type: "settings-entry"`

#### Scenario: Catalog extension added to catalog.extensions
- **WHEN** user chooses Option A2 for a raw extension
- **THEN** the extension file is copied to `.pi/extensions/` (local activation) and a new entry is added to `catalog.extensions`

#### Scenario: Catalog package/extension removed when promoted
- **WHEN** a resource already in `catalog.*` is later promoted to global
- **THEN** the workflow removes it from `catalog.*` and adds it to the corresponding `global.*` section

### Requirement: Discard Decision Must Not Write To Manifest
The system SHALL NOT modify `.pi/capabilities.yaml` when the user chooses Option C (discard).

#### Scenario: Discard skips manifest update
- **WHEN** user chooses Option C
- **THEN** the system does not read or write `.pi/capabilities.yaml`

### Requirement: Backlog Entry for Approved Packages
The system SHALL write a backlog entry for all approved (non-discarded) packages, regardless of whether they are added to global config or recorded to backlog only.

#### Scenario: backlog entry for Option A (global)
- **WHEN** user chooses Option A (add to global config)
- **THEN** the system SHALL also write a backlog entry with decision "global" recording the approval

#### Scenario: backlog entry for Option B (backlog)
- **WHEN** user chooses Option B (record to backlog)
- **THEN** the system SHALL write a backlog entry with decision "backlog"

#### Scenario: no mandatory backlog entry for Option C (discard)
- **WHEN** user chooses Option C (discard)
- **THEN** the system MAY offer to record a rejection note but SHALL NOT require a backlog entry

### Requirement: Backlog Entry Format
The system SHALL write backlog entries in a structured Markdown format within `openspec/pkg-backlog.md`.

#### Scenario: backlog file creation
- **WHEN** `openspec/pkg-backlog.md` does not exist
- **THEN** the system SHALL create it with a header, description, and the first entry

#### Scenario: backlog entry append
- **WHEN** `openspec/pkg-backlog.md` exists
- **THEN** the system SHALL append a new entry in reverse chronological order (newest first)

#### Scenario: backlog entry content (package source)
- **WHEN** recording a package source to backlog
- **THEN** each entry SHALL include: package source/name, version (if pinned), research date, resource types provided (`extensions`, `skills`, `prompts`, `themes`), decision, reason, notes, and extended fields: `Source Type: npm-package | git-package`, `Source Repo`, `Install Method: pi-install`

#### Scenario: backlog entry content (raw extension)
- **WHEN** recording a raw extension source to backlog
- **THEN** each entry SHALL include: extension name, version (or "latest"), research date, `Resource Types: extensions`, decision, reason, notes, and extended fields: `Source Type: raw-extension`, `Source Repo: <URL>`, `Install Method: raw-copy`, `Has Dependencies: <true|false>`

#### Scenario: backlog entries are individual per resource
- **WHEN** multiple extensions from the same source repo are evaluated
- **THEN** each extension gets its own backlog entry (not grouped as a collection)

### Requirement: Discard with Optional Record
When the user chooses to discard a package, the system SHALL offer to record a short rejection note in the backlog.

#### Scenario: discard with note
- **WHEN** user chooses to discard and accepts the optional note
- **THEN** the system SHALL append a backlog entry with status "discarded" and the rejection reason

#### Scenario: discard without note
- **WHEN** user chooses to discard and declines the optional note
- **THEN** the system SHALL clean up the install without creating any record

### Requirement: Install Cleanup After Non-Global Decisions
The system SHALL roll back `.pi/settings.json` modifications and clean up project-level install artifacts when the user chooses backlog or discard.

#### Scenario: cleanup for backlog decision
- **WHEN** user chooses backlog
- **THEN** the system SHALL remove the package from `.pi/settings.json` `packages` array
- **AND** the system SHALL execute `pi remove <source>` to clean up installed resources before recording the backlog entry

#### Scenario: cleanup for discard decision
- **WHEN** user chooses discard
- **THEN** the system SHALL remove the package from `.pi/settings.json` `packages` array
- **AND** the system SHALL execute `pi remove <source>` to clean up installed resources
