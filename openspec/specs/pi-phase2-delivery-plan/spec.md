# pi-phase2-delivery-plan Specification

## Purpose
Define the repository-local Phase 2 planning baseline for `pi-config`, including workstream decomposition, priority order, and exit criteria for the first execution track.
## Requirements
### Requirement: Phase 2 Plan Must Produce A Repository Local Planning Document
The system SHALL define a repository-local Phase 2 planning document for `pi-config` and SHALL assign it a stable path under `docs/plans/` so later changes can reference it directly.

#### Scenario: Phase 2 planning baseline is reviewed
- **WHEN** a contributor inspects the Phase 2 planning output
- **THEN** the contributor can identify the canonical document path and use it as the Phase 2 planning entrypoint inside this repository

### Requirement: Phase 2 Plan Must Decompose Workstreams And Priority Order
The system SHALL decompose Phase 2 into distinct workstreams for `MCP bridge baseline`, `Session / command helpers`, `Subagent orchestration`, and `Launch / install / profile automation`, and SHALL state the intended priority order between them.

#### Scenario: Workstream boundary is reviewed
- **WHEN** a contributor reviews the Phase 2 planning document
- **THEN** the contributor can distinguish which topic belongs to which workstream and which workstream should start first

### Requirement: Phase 2 Plan Must Prioritize MCP As The First Execution Track
The system SHALL define `MCP` as the first execution track of Phase 2 and SHALL justify that choice in terms of shortest path to day-to-day Pi usability without requiring full ecosystem parity.

#### Scenario: First workstream is selected
- **WHEN** a contributor asks why Phase 2 starts with `MCP`
- **THEN** the planning baseline explains that `MCP` provides the smallest shared-workflow bridge into Pi and should precede later `subagent`, session, and automation work

### Requirement: Phase 2 Plan Must Preserve Phase 1 And Blueprint Boundaries
The system SHALL preserve the Phase 1 source versus runtime boundary and SHALL not redefine `.mcp.json` as a Pi-specific managed sync target in the Phase 2 planning baseline.

#### Scenario: Shared layer boundary is reviewed in Phase 2 planning
- **WHEN** a contributor checks how Phase 2 treats `.mcp.json`
- **THEN** the planning document keeps `.mcp.json` in the shared cross-agent layer and leaves the Phase 1 `.pi/` sync contract unchanged

### Requirement: Phase 2 Plan Must Define Exit Criteria Per Workstream
The system SHALL define exit criteria for the overall Phase 2 planning baseline and SHALL identify what counts as an initial successful outcome for the first `MCP` workstream.

#### Scenario: Readiness is evaluated
- **WHEN** a contributor evaluates whether the first Phase 2 workstream is complete
- **THEN** the planning document provides explicit criteria for acceptable completion rather than a vague feature wish list
