# Pi Phase 2 Delivery Plan

## Document Role

- Change: `phase2-pi-mcp-baseline`
- Purpose: define the repository-local execution baseline for Phase 2 work in `pi-config`
- Execution SSOT: `openspec/changes/phase2-pi-mcp-baseline/specs/*/spec.md`
- Prerequisite baseline: `docs/plans/pi-customization-blueprint.md`, `docs/pi-phase1-boundary.md`

## Why Phase 2 Starts With MCP

Phase 2 is about reaching minimal day-to-day Pi usability without pretending the whole ecosystem must be rebuilt first. The shortest path is to bridge Pi into already-useful external capabilities before solving richer orchestration layers.

`MCP` is the first workstream because it gives the broadest workflow lift with the smallest new repository surface:

- shared server truth can live in repository-root `.mcp.json`
- Pi can consume that truth through `pi-mcp-adapter`
- the Phase 1 `.pi/` sync contract stays unchanged
- a single `gitnexus` sample is enough to validate discover/connect/call behavior

This lets later workstreams build on a functioning tool bridge instead of blocking on custom `subagent`, helper, or automation design first.

## Phase 2 Workstreams

### 1. MCP bridge baseline

- Priority: `P1`
- Goal: establish the first shared-first MCP path for Pi using repository-root `.mcp.json` and `pi-mcp-adapter`
- In scope:
  - shared MCP server registry at repository root
  - Pi bridge enablement in `.pi/settings.json`
  - minimal verification loop using `gitnexus`
- Out of scope:
  - `.pi/mcp.json`
  - `directTools`
  - bulk multi-server curation
  - Phase 1 sync scope expansion

### 2. Session / command helpers

- Priority: `P2`
- Goal: cover high-frequency helper flows that improve session startup, command reuse, and common project actions after MCP is available
- Typical follow-up topics:
  - session-start helpers
  - reusable command wrappers
  - lightweight task/session shortcuts

### 3. Subagent orchestration

- Priority: `P3`
- Goal: define how Pi should handle delegated work, task routing, and session-sharing patterns once baseline tools are already usable
- Typical follow-up topics:
  - subagent lifecycle
  - planning/review loops
  - task graph or checkpoint discipline

### 4. Launch / install / profile automation

- Priority: `P4`
- Goal: reduce per-machine setup friction after the capability model is stable enough to automate safely
- Typical follow-up topics:
  - package bootstrap
  - profile presets
  - repo-to-runtime install helpers

## Workstream Ordering Rationale

The intended order is:

1. `MCP bridge baseline`
2. `Session / command helpers`
3. `Subagent orchestration`
4. `Launch / install / profile automation`

This order preserves a simple rule: first make Pi useful against shared tools, then improve local workflow ergonomics, then add orchestration complexity, and only then automate installation around a stable target.

## Phase 1 Boundary Preservation

Phase 2 does not change the Phase 1 source/runtime contract:

- `.mcp.json` stays in the shared cross-agent layer
- `.pi/settings.json` only enables the Pi-side bridge
- `.pi/mcp.json` remains absent in the first baseline
- `scripts/sync-pi-agent.sh` continues to manage only Phase 1 Pi-specific paths

Contributors should treat `.mcp.json` as shared repository configuration, not as a new Pi-managed sync artifact.

## First MCP Baseline Usage

The first MCP baseline uses a minimal shared-first shape:

- repository-root `.mcp.json` defines the server registry
- `.pi/settings.json` loads `pi-mcp-adapter`
- the first sample server is `gitnexus` with:
  - `command: "gitnexus"`
  - `args: ["mcp"]`
- access stays on the single `mcp` proxy tool path for now

This means contributors add or review server truth in `.mcp.json`, while Pi-specific settings remain limited to bridge activation.

## Exit Criteria

### Phase 2 planning baseline

Phase 2 planning is considered established when:

- this document exists at `docs/plans/pi-phase2-delivery-plan.md`
- all four workstreams and their priority order are explicit
- the rationale for starting with `MCP` is documented
- the Phase 1 boundary is preserved instead of redefined

### First MCP workstream

The first `MCP bridge baseline` is considered successfully complete when:

- repository-root `.mcp.json` exists and declares the minimal `gitnexus` sample
- `.pi/settings.json` enables Pi to load `pi-mcp-adapter`
- `.pi/mcp.json` is still absent
- `scripts/sync-pi-agent.sh` remains unchanged with respect to `.mcp.json`
- contributors can follow verification steps that prove Pi can discover, connect to, and call the `gitnexus` MCP server through the shared-first setup
