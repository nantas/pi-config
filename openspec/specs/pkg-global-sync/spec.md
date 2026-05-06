# Capability: pkg-global-sync

## Purpose

Handle global configuration updates when a package is added to global config: verify/append `.pi/settings.json` packages array, update `.pi/capabilities.yaml`, confirm with user, execute `scripts/sync-pi-agent.sh` with whitelist filtering, and verify sync success.

## Requirements

### Requirement: Global Pi Sync Must Use Whitelist Filtering For Packages
The system SHALL filter `.pi/settings.json` packages to only those listed in `global.settings.packages` in `.pi/capabilities.yaml` when deploying to `~/.pi/agent/settings.json`, rather than syncing all packages.

#### Scenario: Whitelisted packages are synced
- **WHEN** the sync script processes packages
- **THEN** only packages present in `global.settings.packages` appear in the global settings output

#### Scenario: Non-whitelisted packages are excluded
- **WHEN** `.pi/settings.json` contains `npm:lsp-pi` but it is not in the whitelist
- **THEN** `npm:lsp-pi` is excluded from `~/.pi/agent/settings.json`

#### Scenario: Whitelist is sourced from manifest
- **WHEN** the whitelist is determined
- **THEN** it is read from `global.settings.packages` in `.pi/capabilities.yaml`, not hardcoded in the sync script

### Requirement: Global Pi Sync Must Still Use Existing Managed Path And Confirmation
The system SHALL deploy confirmed repository-managed Pi settings to `~/.pi/agent/settings.json` through the existing managed sync path and SHALL still require explicit user confirmation.

#### Scenario: User confirms global sync
- **WHEN** the user confirms that the new repository-managed Pi settings should be deployed globally
- **THEN** the workflow executes the sync path with whitelist filtering applied

#### Scenario: Sync requires confirmation
- **WHEN** a change is ready to deploy repository-managed Pi settings globally
- **THEN** deployment does not run until the user explicitly confirms it

### Requirement: Global Pi Sync Must Respect Repository Package Source Of Truth
The system SHALL treat repository `.pi/settings.json` as the source of truth for runtime package entries when writing to `~/.pi/agent/settings.json`.

#### Scenario: Removed package entry is absent from global output
- **WHEN** `./packages/subagent-dispatch` is no longer present in repository `.pi/settings.json`
- **THEN** the global output does not retain that stale package path

### Requirement: Settings Update for Package Addition
The system SHALL verify the package is present in `.pi/settings.json` `packages` array (normally added by `pi install -l` during Phase 2), and add it only if missing.

#### Scenario: package already present from Phase 2 install
- **WHEN** the package source already exists in `.pi/settings.json` `packages` array (from Phase 2 install)
- **THEN** the system SHALL confirm the entry and proceed to sync without modification

#### Scenario: package missing from settings
- **WHEN** the package source is not in `.pi/settings.json` `packages` array
- **THEN** the system SHALL append the package source string without modifying existing entries

### Requirement: Sync Success Verification
The system SHALL verify the sync operation completed successfully and confirm the package is available globally.

#### Scenario: sync success
- **WHEN** `scripts/sync-pi-agent.sh` exits with code 0
- **THEN** the system SHALL report successful sync and confirm the target paths

#### Scenario: sync failure
- **WHEN** `scripts/sync-pi-agent.sh` exits with non-zero code
- **THEN** the system SHALL report the failure, preserve the error output, and advise the user on manual recovery
