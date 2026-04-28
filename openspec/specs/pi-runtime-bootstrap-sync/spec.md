# Capability: pi-runtime-bootstrap-sync

## Purpose

Define the one-way bootstrap and sync contract from repository-managed `.pi/` resources to `~/.pi/agent/` for Phase 1.

## Requirements

### Requirement: Bootstrap Sync Must Use One-Way Repository Deployment
The system SHALL define bootstrap and sync as a one-way deployment flow from repository-managed `.pi/` resources to `~/.pi/agent/`, and SHALL treat the repository as the only source of truth for managed Phase 1 paths.

#### Scenario: Sync direction is reviewed
- **WHEN** a reader evaluates the Phase 1 deployment model
- **THEN** the reader can determine that runtime changes do not flow back into the repository automatically

### Requirement: Bootstrap Sync Must Be Limited To Pi Specific Managed Paths
The system SHALL limit Phase 1 bootstrap and sync scope to Pi-specific managed `.pi/` resources and SHALL exclude `.agents/skills/`, `.mcp.json`, and other shared cross-agent resources from automated deployment.

#### Scenario: Shared layer boundary is reviewed
- **WHEN** the Phase 1 sync scope is described
- **THEN** only Pi-specific managed paths are included in the bootstrap/sync contract

### Requirement: Bootstrap Sync Must Define Path Mapping
The system SHALL define the mapping from repository-managed source paths to runtime target paths, including `.pi/settings.json` to `~/.pi/agent/settings.json`, `.pi/extensions/` to `~/.pi/agent/extensions/`, `.pi/prompts/` to `~/.pi/agent/prompts/`, `.pi/themes/` to `~/.pi/agent/themes/`, and `.pi/agents/` to `~/.pi/agent/agents/`.

#### Scenario: Runtime deployment target is documented
- **WHEN** a reader needs to deploy the managed Pi baseline
- **THEN** the target runtime location for each managed source path is explicit

### Requirement: Bootstrap Sync Must Enforce Managed Overwrite And Deletion Semantics
The system SHALL define copy-based sync behavior for managed paths, SHALL overwrite managed runtime content with repository state on sync, and SHALL remove managed runtime content when the corresponding managed repository content is deleted.

#### Scenario: Managed runtime drift exists
- **WHEN** a managed runtime file differs from or no longer exists in the repository source layer
- **THEN** the next sync restores the runtime target to the repository-managed state, including deletion when applicable

### Requirement: Bootstrap Sync Must Preserve Unmanaged Runtime Content
The system SHALL leave unmanaged runtime content untouched when it falls outside the defined Phase 1 managed path set.

#### Scenario: Unmanaged runtime files exist
- **WHEN** bootstrap or sync is executed
- **THEN** runtime files outside the managed Phase 1 path set are preserved
