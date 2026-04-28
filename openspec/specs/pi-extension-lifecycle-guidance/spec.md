# Capability: pi-extension-lifecycle-guidance

## Purpose

Define how `Pi_Config` handles extension intake and authoring without bypassing OpenSpec governance.

## Requirements

### Requirement: Lifecycle Guidance Must Separate Intake From Authoring
The system SHALL define separate guidance for adopting an existing open-source Pi extension and for authoring a new custom extension.

#### Scenario: Extension work is initiated
- **WHEN** a contributor wants to add extension capability
- **THEN** the contributor can tell whether to follow an intake path or an authoring path

### Requirement: Lifecycle Guidance Must Preserve OpenSpec As Execution System
The system SHALL preserve OpenSpec artifacts as the execution and change-management system even when extension ideas originate from external repositories.

#### Scenario: External extension inspiration is used
- **WHEN** a reader traces how a candidate extension becomes work in `Pi_Config`
- **THEN** the path still flows through repository-local OpenSpec artifacts rather than directly into ad hoc implementation

### Requirement: Lifecycle Guidance Must Define Deployment Surfaces
The system SHALL define how extension outputs map onto repository-managed source locations and runtime deployment targets.

#### Scenario: Extension deployment is reviewed
- **WHEN** a reader examines extension placement guidance
- **THEN** the reader can tell which outputs belong in the repository, which belong in `~/.pi/agent/`, and which are project-local resources
