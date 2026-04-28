# Design

## Context

Phase 0 established the blueprint and Phase 1 established the repository-to-runtime boundary, but neither artifact answers how Phase 2 should be executed in practice. The blueprint says Phase 2 should close the highest-frequency workflow gaps through `MCP`, `subagent`, install/config sync, and session helpers, yet the repository still has no execution-oriented Phase 2 planning document and no first workstream contract.

The user has already narrowed the first executable track to `MCP` and confirmed a shared-first model: repository-root `.mcp.json` should become the first shared MCP source of truth, Pi should consume it through `pi-mcp-adapter`, and `gitnexus` should be the first managed sample server because its CLI is already available globally and can validate the loop in any repository.

## Goals / Non-Goals

**Goals:**

- Produce a repository-local Phase 2 planning document at a stable path under `docs/plans/`
- Decompose Phase 2 into explicit workstreams and state why `MCP` goes first
- Define a first MCP baseline that preserves the Phase 1 boundary and keeps `.mcp.json` in the shared layer
- Define a minimal verification loop around a single `gitnexus` sample server

**Non-Goals:**

- Implement `subagent`, session helper, or automation capabilities in this change
- Introduce `.pi/mcp.json` as part of the initial Phase 2 MCP baseline
- Add `.mcp.json` to `scripts/sync-pi-agent.sh` or expand the Phase 1 managed `.pi/` sync set
- Optimize MCP exposure with `directTools`, multi-server curation, or OAuth-heavy server flows

## Decisions

- Use a two-capability split:
  - `pi-phase2-delivery-plan` defines the planning baseline and target document
  - `pi-mcp-shared-bridge` defines the first executable Phase 2 workstream
- Place the planning document at `docs/plans/pi-phase2-delivery-plan.md` so it stays adjacent to the blueprint and can be cited by later changes without reopening the blueprint itself.
- Decompose Phase 2 into four workstreams in this order:
  1. `MCP bridge baseline`
  2. `Session / command helpers`
  3. `Subagent orchestration`
  4. `Launch / install / profile automation`
- Use `MCP` as the first execution track because it closes the broadest shared workflow gap with the smallest implementation surface and does not require Pi-specific orchestration semantics to be solved first.
- Keep the first MCP baseline shared-first:
  - `.mcp.json` at repository root is the initial server registry truth
  - `.pi/settings.json` only enables Pi-side bridge loading
  - `.pi/mcp.json` remains out of scope unless a later change proves Pi-specific overrides are necessary
- Keep the first sample narrow:
  - manage only `gitnexus`
  - use `command: "gitnexus"` and `args: ["mcp"]`
  - rely on the globally installed CLI rather than packaging or syncing binaries in this phase
- Keep exposure conservative:
  - default to the single `mcp` proxy tool
  - defer `directTools` until there is evidence that direct promotion is worth the prompt cost

## Risks / Migration

- If `pi-mcp-adapter` package loading semantics differ from the current assumptions, the first implementation change may need to choose between package install, package pinning, or local extension bootstrap. Mitigation: make the bridge contract explicit in spec first, then validate the actual package-loading path during implementation.
- A single `gitnexus` sample may underrepresent later multi-server complexity. Mitigation: this change intentionally validates the shared-first baseline before expanding the server registry.
- Contributors may try to pull `.mcp.json` into the Phase 1 sync model because both affect Pi runtime behavior. Mitigation: the specs and tasks explicitly preserve the shared-layer boundary and call out that `.mcp.json` is not a Pi-specific sync target.
