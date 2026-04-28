# pi-global-runtime-sync-confirmation Specification

## Purpose
Define the closeout confirmation workflow for deploying repository-managed Pi runtime settings to the global Pi runtime after verification.

## Requirements
### Requirement: Post Verification Workflow Must Ask For Global Pi Sync Confirmation
The system SHALL require completed `pi-config` change closeout to ask the user whether the repository-managed Pi configuration should be synced to the global Pi runtime after verification is complete.

#### Scenario: Verification has completed
- **WHEN** a `pi-config` change reaches post-verification closeout
- **THEN** the workflow prompts the user to confirm whether global Pi settings deployment should run

### Requirement: Confirmed Global Pi Sync Must Use The Existing Managed Runtime Path
The system SHALL deploy confirmed repository-managed Pi settings to `~/.pi/agent/settings.json` through the existing Phase 1 managed sync path rather than through direct ad hoc runtime edits.

#### Scenario: User confirms global sync
- **WHEN** the user confirms that the new repository-managed Pi settings should be deployed globally
- **THEN** the workflow executes the established Phase 1 sync path that writes managed repository settings to `~/.pi/agent/settings.json`

### Requirement: Global Pi Sync Must Remain User Confirmed And Non Silent
The system SHALL not silently sync repository-managed Pi settings to the global Pi runtime as part of closeout and SHALL require explicit user confirmation before deployment occurs.

#### Scenario: Closeout reaches deployment decision
- **WHEN** a change is ready to deploy repository-managed Pi settings globally
- **THEN** deployment does not run until the user explicitly confirms it

### Requirement: Verification Must Record Global Sync Disposition
The system SHALL require verification or closeout evidence to record whether global Pi sync was confirmed and executed, declined by the user, or deferred because it could not run.

#### Scenario: Reviewer inspects sync outcome
- **WHEN** a reviewer checks the completed change evidence
- **THEN** the reviewer can identify whether the outcome was `global-sync-confirmed-and-run`, `global-sync-declined`, or `global-sync-deferred-blocked`

### Requirement: Shared Layer Config Must Stay Outside The Global Pi Settings Confirmation Rule
The system SHALL keep `.mcp.json` and other shared-layer resources outside this global Pi settings confirmation and deployment rule unless a later change explicitly expands the deployment scope.

#### Scenario: Contributor evaluates whether shared config should be deployed
- **WHEN** a contributor reviews closeout sync scope for the current governance rule
- **THEN** the contributor can see that the confirmation and deployment rule applies to repository-managed Pi settings, not shared-layer config such as `.mcp.json`
