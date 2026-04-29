# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-decision-backlog`
- 来源: `proposal.md` / 用户确认
- 变更类型: new
- 用户确认摘要: 三选一决策框架（加入全局配置 / backlog / 丢弃），决策完全由用户驱动，不确定时主动确认；backlog 使用 Markdown 文件持久化

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Three-Option Decision Presentation
After research is complete, the system SHALL present the user with three clear options and their consequences.

#### Scenario: decision prompt after research
- **WHEN** research summary is complete
- **THEN** the system SHALL present:
  - Option A: Add to global config — update `.pi/settings.json` packages array and sync to `~/.pi/agent/`
  - Option B: Record to backlog — add entry to `openspec/pkg-backlog.md` and clean up install
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
