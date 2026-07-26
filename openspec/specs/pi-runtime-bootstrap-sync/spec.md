# Capability: pi-runtime-bootstrap-sync

## Purpose

Define the one-way bootstrap and sync contract from repository-managed `.pi/` resources to `~/.pi/agent/`, driven by `.pi/capabilities.yaml` as the source of truth for which resources are deployed, filtered, and published.

## Requirements

### Requirement: Bootstrap Sync Must Use One-Way Repository Deployment
The system SHALL define bootstrap and sync as a one-way deployment flow from repository-managed `.pi/` resources to `~/.pi/agent/`, and SHALL treat the repository as the only source of truth for managed paths. The deployment SHALL be driven by `.pi/capabilities.yaml` rather than a hardcoded mapping array.

#### Scenario: Sync direction is reviewed
- **WHEN** a reader evaluates the deployment model
- **THEN** the reader can determine that runtime changes do not flow back into the repository automatically

#### Scenario: Sync is driven by manifest
- **WHEN** the sync script executes
- **THEN** it reads `global` declarations from `.pi/capabilities.yaml` to determine which paths to sync

### Requirement: Bootstrap Sync Must Define Selective Path Mapping Via Manifest
The system SHALL define the mapping from repository-managed source paths to runtime target paths through `.pi/capabilities.yaml` rather than a hardcoded MAPPINGS array. The sync script SHALL sync only resources declared in `global.extensions`, `global.agents`, `global.skills`, and `agent_md`. Directory targets SHALL use copy-based semantics with managed overwrite.

#### Scenario: Global extension is synced
- **WHEN** `global.extensions` lists `init-command`
- **THEN** `init-command.ts` is copied to `~/.pi/agent/extensions/`

#### Scenario: Non-global extension is not synced
- **WHEN** `obsidian-tools` is in `catalog.extensions` but not in `global.extensions`
- **THEN** `obsidian-tools/` is NOT copied to `~/.pi/agent/extensions/`

#### Scenario: Global skill is synced
- **WHEN** `global.skills` lists `install-from-pi-config`
- **THEN** `install-from-pi-config/` is copied to `~/.pi/agent/skills/`

#### Scenario: Managed runtime drift exists
- **WHEN** a managed runtime file differs from or no longer exists in the repository source layer
- **THEN** the next sync restores the runtime target to the repository-managed state, including deletion when applicable

### Requirement: Bootstrap Sync Must Generate Settings From Manifest Directly
The system SHALL generate `~/.pi/agent/settings.json` directly from the `global.settings` section of `.pi/capabilities.yaml`, rather than filtering `.pi/settings.json` through a whitelist. For each key present in `global.settings`, the manifest value SHALL be authoritative. For keys not present in `global.settings`, the existing value in the target `~/.pi/agent/settings.json` SHALL be preserved.

#### Scenario: Packages are generated from manifest
- **WHEN** the sync script processes settings
- **THEN** the `packages` array in `~/.pi/agent/settings.json` SHALL exactly match the `global.settings.packages` list from `.pi/capabilities.yaml`

#### Scenario: Nested subagents config is generated from manifest
- **WHEN** the sync script processes settings
- **THEN** the `subagents` object in `~/.pi/agent/settings.json` SHALL match the `global.settings.subagents` structure from `.pi/capabilities.yaml`

#### Scenario: Simple config values are generated from manifest
- **WHEN** the sync script processes settings
- **THEN** `defaultThinkingLevel`, `defaultProvider`, and `defaultModel` in `~/.pi/agent/settings.json` SHALL match their counterparts in `global.settings`

#### Scenario: User-managed enabledModels is preserved
- **WHEN** the sync script processes settings
- **THEN** `enabledModels` in `~/.pi/agent/settings.json` SHALL be preserved from the existing target file, not overwritten by the manifest

#### Scenario: Keys not in manifest are preserved from target
- **WHEN** `~/.pi/agent/settings.json` contains keys that are not declared in `global.settings` (e.g., `lastChangelogVersion`, user-added custom keys)
- **THEN** those keys SHALL be preserved with their existing values

#### Scenario: Local .pi/settings.json is not used for global generation
- **WHEN** the sync script processes settings
- **THEN** it SHALL NOT read `.pi/settings.json` from the pi-config repository for the purpose of generating `~/.pi/agent/settings.json`

### Requirement: Bootstrap Sync Must Publish Catalog For Cross-Repo Discovery
The system SHALL publish the `catalog` section of `.pi/capabilities.yaml` to `~/.pi/agent/catalog/pi-config.yaml` during sync, augmented with the source repository's absolute path.

#### Scenario: Catalog is published
- **WHEN** the sync script completes
- **THEN** `~/.pi/agent/catalog/pi-config.yaml` contains the catalog entries with a `source_repo_path` field

#### Scenario: Catalog is overwritten on each sync
- **WHEN** the sync script runs again
- **THEN** the catalog file is overwritten with the latest catalog content

### Requirement: Bootstrap Sync Must Prepare Extension Runtime Dependencies
The system SHALL ensure that any repository-managed extension with a `package.json` has its npm dependencies installed before the sync completes.

#### Scenario: Managed sync prepares extension dependencies
- **WHEN** the sync workflow runs and an extension directory under `.pi/extensions/` contains a `package.json`
- **THEN** the workflow runs `npm install --no-package-lock --ignore-scripts` inside that directory if `node_modules/` is missing or empty
- **AND** the sync is not blocked by missing extension dependencies

### Requirement: Bootstrap Sync Must Clear Stale Global Resources
The system SHALL remove resources from the global target that were previously synced but are no longer declared in `global` sections of the manifest.

#### Scenario: Extension removed from global
- **WHEN** an extension is removed from `global.extensions`
- **THEN** the next sync removes it from `~/.pi/agent/extensions/`

#### Scenario: Agent removed from global
- **WHEN** an agent is removed from `global.agents`
- **THEN** the next sync removes it from `~/.pi/agent/agents/`

### Requirement: Bootstrap Sync Must Preserve Unmanaged Runtime Content
The system SHALL leave unmanaged runtime content untouched when it falls outside the defined managed path set.

#### Scenario: Unmanaged runtime files exist
- **WHEN** sync is executed
- **THEN** runtime files outside the manifest-declared global paths are preserved
