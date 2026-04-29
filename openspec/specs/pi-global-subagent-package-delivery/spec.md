# Capability: pi-global-subagent-package-delivery

## Purpose

Define the package-backed global delivery contract for the repository-owned `subagent-dispatch` runtime entry, including local-path package sourcing, package-owned dependencies, and compatibility with user-level agent definitions.

## Requirements

### Requirement: Global Dispatch Delivery Must Use A Local Path Pi Package
The system SHALL deliver the repository-owned `subagent-dispatch` global runtime entry through a Pi local-path package source rather than by syncing a raw extension directory into `~/.pi/agent/extensions/`.

#### Scenario: Contributor inspects the global delivery model
- **WHEN** a contributor reviews how `subagent-dispatch` becomes available outside `pi-config`
- **THEN** the contributor can identify a Pi package source in settings as the global runtime entry
- **AND** the contributor does not need `~/.pi/agent/extensions/subagent-dispatch/index.ts` to exist as an auto-discovered raw extension copy

### Requirement: The Package Must Own Its Runtime Dependencies
The system SHALL place `pi-subagents` and any other runtime-only dependencies under the `subagent-dispatch` package's own dependency model rather than assuming those modules exist under `~/.pi/agent/npm/`.

#### Scenario: Dispatch loads in a non-pi-config repository
- **WHEN** Pi starts in another repository after the global package source is configured
- **THEN** `subagent-dispatch` resolves `pi-subagents` through the package-owned dependency tree
- **AND** startup does not depend on `~/.pi/agent/npm/node_modules/pi-subagents`

### Requirement: Global Settings Must Reference The Current Repo By Absolute Path
The system SHALL configure the global runtime to load the local-path package through an absolute path derived from the current `pi-config` repository location.

#### Scenario: Managed global settings are generated
- **WHEN** the managed sync workflow prepares `~/.pi/agent/settings.json`
- **THEN** the generated package source points to the current repository's package path using an absolute filesystem path
- **AND** the repository-tracked settings source remains portable rather than embedding a machine-specific absolute path

### Requirement: Global Dispatch Availability Must Still Use User-Level Agent Definitions
The system SHALL keep the global dispatch runtime compatible with user-level `.pi/agents/*.md` deployment so the package-backed extension can run in any repository without requiring project-local agent definitions.

#### Scenario: Another repository has no local dispatch agents
- **WHEN** Pi starts in a repository that does not define its own `.pi/agents/`
- **THEN** the global dispatch extension still discovers the user-level agent definitions synced from `pi-config`
- **AND** dispatch remains available as a global capability
