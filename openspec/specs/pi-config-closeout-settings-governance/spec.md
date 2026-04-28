# pi-config-closeout-settings-governance Specification

## Purpose
Define mandatory closeout governance for `pi-config` changes so repository `.pi/settings.json` impact is always assessed and, when needed, updated before verification completes.

## Requirements
### Requirement: Closeout Must Explicitly Assess Repository Pi Settings Impact
The system SHALL require every `pi-config` feature or configuration change to explicitly assess whether repository `.pi/settings.json` needs to change before verification passes.

#### Scenario: Change closeout is prepared
- **WHEN** a contributor closes out a `pi-config` feature or configuration change
- **THEN** the contributor records an explicit `.pi/settings.json` impact decision instead of leaving the decision implicit

### Requirement: Closeout Must Update Repository Pi Settings Before Verification When Needed
The system SHALL require repository `.pi/settings.json` to be updated before verification completes whenever the change introduces or modifies Pi-managed runtime requirements that belong to the repository source of truth.

#### Scenario: Repository-managed Pi requirement changed
- **WHEN** implementation changes introduce a new Pi package, extension, agent, prompt, theme, or other repository-managed Pi runtime requirement
- **THEN** repository `.pi/settings.json` is updated before the change can be verified as complete

### Requirement: Closeout Must Preserve Full Repository Source Of Truth Semantics
The system SHALL continue to treat repository `.pi/settings.json` as the full managed source of truth for Pi settings covered by the Phase 1 runtime deployment contract and SHALL not reinterpret closeout governance as a merge-based runtime override model.

#### Scenario: Contributor evaluates how closeout updates are stored
- **WHEN** a contributor decides how to reflect a Pi settings change in the repository
- **THEN** the contributor updates repository `.pi/settings.json` as the managed truth instead of assuming runtime-only or partial-merge semantics

### Requirement: Verification Must Record Closeout Settings Outcome
The system SHALL require verification evidence to record whether repository `.pi/settings.json` was updated or explicitly determined not to require changes for the current change.

#### Scenario: Verification evidence is reviewed
- **WHEN** a reviewer inspects the verification artifact for a completed change
- **THEN** the reviewer can identify whether the closeout result was `repo-settings-updated` or `repo-settings-unchanged`
