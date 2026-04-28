# Capability: pi-project-source-layer

## Purpose

Define the minimal repository-managed `.pi/` source layer for `pi-config` Phase 1.

## Requirements

### Requirement: Project Source Layer Must Define Managed Pi Paths
The system SHALL define a minimal managed `.pi/` source layer in the repository and SHALL include `.pi/settings.json`, `.pi/extensions/`, `.pi/prompts/`, `.pi/themes/`, and `.pi/agents/` as the Phase 1 managed Pi paths.

#### Scenario: Managed project skeleton is established
- **WHEN** a reader inspects the Phase 1 baseline definition
- **THEN** the reader can identify the exact `.pi/` paths that belong to the repository-managed source layer

### Requirement: Project Source Layer Must Exclude Runtime State And Package Caches
The system SHALL exclude `.pi/skills/`, `.pi/npm/`, `.pi/git/`, runtime state files, authentication files, session data, and package caches from the Phase 1 managed repository baseline.

#### Scenario: Unmanaged paths are reviewed
- **WHEN** the Phase 1 baseline lists managed and unmanaged Pi resources
- **THEN** runtime state and install artifacts are explicitly treated as out of scope for repository management

### Requirement: Project Settings Baseline Must Stay Minimal
The system SHALL treat `.pi/settings.json` as the project-level configuration entrypoint and SHALL keep the Phase 1 baseline content minimal by using an empty object instead of duplicating default resource discovery paths.

#### Scenario: Project settings contract is documented
- **WHEN** the Phase 1 baseline describes the project settings file
- **THEN** it states that `.pi/settings.json` exists as a minimal contract file and relies on `pi-mono` default discovery behavior

### Requirement: Pi Mono Must Be The Configuration Query Authority
The system SHALL treat `repo://pi-mono` as the authoritative source for Pi configuration behavior, supported project-level resource locations, and settings semantics used by Phase 1 decisions.

#### Scenario: Configuration behavior is justified
- **WHEN** Phase 1 defines path conventions or settings behavior
- **THEN** those decisions are derived from `repo://pi-mono` source or documentation rather than locally invented conventions
