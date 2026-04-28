# Capability: pi-customization-blueprint

## Purpose

Define the planning blueprint for `Pi_Config`, including repository role, layering, capability domains, and phased evolution.

## Requirements

### Requirement: Blueprint Must Define Repository Role And Layering
The system SHALL define `Pi_Config` as both a personal Pi configuration hub and a reusable extension incubation repository, and SHALL distinguish the responsibilities of `~/.pi/agent/`, project `.pi/`, `.agents/skills/`, and `.mcp.json`.

#### Scenario: Repository structure is reviewed
- **WHEN** a reader inspects the planning blueprint
- **THEN** it identifies the dual-role repository model and distinguishes `~/.pi/agent/`, project `.pi/`, `.agents/skills/`, and `.mcp.json` responsibilities

### Requirement: Blueprint Must Define Core Capability Domains
The system SHALL document the target capability domains for `subagent`, `MCP`, automation scripts for install and config sync, reference collection, and extension lifecycle guidance.

#### Scenario: Capability scope is reviewed
- **WHEN** a reader reviews the blueprint capability map
- **THEN** the reader can identify the main capability domains that later changes will elaborate

### Requirement: Blueprint Must Define A Phased Evolution Path
The system SHALL provide a phased roadmap that moves from configuration baseline, to minimal usable Pi parity, to reusable extension output.

#### Scenario: Roadmap is reviewed
- **WHEN** a reader examines the implementation sequence
- **THEN** the reader can see a staged path instead of a flat feature backlog
