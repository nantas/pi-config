# Capability: pkg-decision-backlog

## Purpose

Provide a three-option decision framework after package research (global config / backlog / discard), manage `.pi/settings.json` rollback for non-global decisions, update `.pi/capabilities.yaml` accordingly, and persist decisions in a structured `openspec/pkg-backlog.md`.

## Requirements

### Requirement: Three-Option Decision Presentation
After research is complete, the system SHALL present the user with three clear options and their consequences, including the manifest update consequence for each option.

#### Scenario: decision prompt after research
- **WHEN** research summary is complete
- **THEN** the system SHALL present:
  - Option A: Add to global config — update `.pi/settings.json` packages array, update `.pi/capabilities.yaml` `global.settings.packages`, and sync to `~/.pi/agent/`
  - Option B: Record to backlog — add entry to `openspec/pkg-backlog.md`, add to `.pi/capabilities.yaml` `catalog.packages`, and clean up install
  - Option C: Discard — clean up install only

#### Scenario: uncertain outcome handling
- **WHEN** the system cannot confidently recommend an option
- **THEN** the system SHALL present findings with noted uncertainties and explicitly request user decision

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

#### Scenario: backlog entry content
- **WHEN** recording a package to backlog
- **THEN** each entry SHALL include: package source/name, version (if pinned), research date, resource types provided, decision reason (why backlog not global), and any follow-up notes

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
