# pi-mcp-shared-bridge Specification

## Purpose
Define the first shared-first MCP baseline for `pi-config`, using repository-root `.mcp.json` as the shared source of truth and `pi-mcp-adapter` as the Pi bridge.
## Requirements
### Requirement: MCP Baseline Must Use Repository Root Shared Config
The system SHALL treat repository-root `.mcp.json` as the shared source of truth for the first Phase 2 MCP baseline and SHALL not require `~/.pi/agent/mcp.json` or `.pi/mcp.json` for the initial setup.

#### Scenario: Shared source of truth is reviewed
- **WHEN** a contributor examines the first Phase 2 MCP baseline
- **THEN** the contributor can identify `.mcp.json` at the repository root as the canonical MCP config for the initial shared setup

### Requirement: MCP Baseline Must Bridge Pi Through Pi MCP Adapter
The system SHALL configure Pi to consume the shared MCP config through `pi-mcp-adapter` and SHALL use `.pi/settings.json` only for enabling the Pi-side bridge rather than for redefining MCP server truth.

#### Scenario: Pi integration path is reviewed
- **WHEN** a contributor inspects how Pi receives MCP capability
- **THEN** the contributor can see that Pi loads `pi-mcp-adapter` while the server registry remains defined by repository-managed shared config

### Requirement: MCP Baseline Must Start With A Minimal GitNexus Sample
The system SHALL define `gitnexus` as the first managed MCP server sample and SHALL use the minimal launcher shape `command: "gitnexus"` plus `args: ["mcp"]` as the baseline sample configuration.

#### Scenario: First sample server is reviewed
- **WHEN** a contributor checks the initial `.mcp.json`
- **THEN** the contributor finds a minimal `gitnexus` server entry that can be used to validate the Phase 2 MCP bridge

### Requirement: MCP Baseline Must Keep Shared Resources Outside Phase 1 Sync
The system SHALL preserve the Phase 1 sync boundary by keeping `.mcp.json` outside `scripts/sync-pi-agent.sh` and SHALL not expand the managed `.pi/` runtime mapping in this first MCP baseline.

#### Scenario: Sync scope is reviewed after MCP baseline is added
- **WHEN** a contributor compares the MCP baseline against Phase 1 bootstrap behavior
- **THEN** the contributor can verify that `.mcp.json` remains a shared repository resource and is not added to the Pi-specific sync mapping

### Requirement: MCP Baseline Must Prefer Proxy Tool Access First
The system SHALL use the single `mcp` proxy tool approach for the first baseline and SHALL not require `directTools` in the initial implementation.

#### Scenario: Tool exposure strategy is reviewed
- **WHEN** a contributor evaluates the first MCP integration design
- **THEN** the design uses the proxy tool as the default access path and treats `directTools` as a later optimization topic

### Requirement: MCP Baseline Must Define A Verifiable Pi Usability Loop
The system SHALL define verification steps that prove Pi can discover, connect to, and call the `gitnexus` MCP server through the shared-first setup.

#### Scenario: MCP baseline verification is performed
- **WHEN** the first MCP workstream is tested in Pi
- **THEN** the evidence shows that the `gitnexus` server is discoverable and callable through the Pi MCP bridge
