# Capability: pi-reference-curation-model

## Purpose

Define how external Pi-related references are classified and promoted into blueprint decisions.

## Requirements

### Requirement: Reference Model Must Define Stratified Categories
The system SHALL classify references into categories such as Pi config repositories, Pi extension repositories, and adjacent pattern samples.

#### Scenario: Reference inventory is reviewed
- **WHEN** a reader looks at the curated reference model
- **THEN** the reader can tell what kind of source each reference represents

### Requirement: Reference Model Must Assign Promotion Decisions
The system SHALL assign each curated reference a promotion decision of direct reuse, partial borrowing, or observe-only.

#### Scenario: Reference status is reviewed
- **WHEN** a reader checks a curated source
- **THEN** the reader can determine how strongly that source should influence implementation

### Requirement: Reference Model Must Tie Inputs To Blueprint Decisions
The system SHALL ensure curated references support concrete planning or design decisions rather than remaining a flat inspiration list.

#### Scenario: Recommendation is justified
- **WHEN** the blueprint recommends a capability direction or repository pattern
- **THEN** the recommendation can be traced back to curated references and a stated promotion decision
