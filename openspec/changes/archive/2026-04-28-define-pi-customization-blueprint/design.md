# Design

## Context

This change defines a documentation-first planning baseline for `Pi_Config`. The approved proposal establishes three new capabilities: the overall customization blueprint, extension lifecycle guidance, and a reference curation model. The source materials already identify Pi as a configuration-centric and extension-driven system, but the repository still lacks a single change artifact set that converts those findings into implementation-ready planning constraints.

The implementation target of this change is not runtime Pi functionality. It is a coherent planning document and supporting structure that later changes can treat as the shared starting point for `MCP`, `subagent`, automation, and extension work.

## Goals / Non-Goals

**Goals:**

- Produce one planning baseline that defines repository role, configuration layering, capability domains, and phased evolution
- Encode a lightweight but explicit lifecycle model for both extension intake and extension authoring
- Encode a structured reference curation model so external samples feed future decisions consistently
- Preserve OpenSpec as the system for executable change artifacts while making the planning document the stable strategy entrypoint

**Non-Goals:**

- Implement any Pi extension, script, agent definition, theme, or MCP integration
- Freeze a final repository directory structure beyond what is necessary to explain layering and deployment surfaces
- Select a single mandatory external extension as the final implementation baseline
- Replace project-page governance or writeback rules with this design

## Decisions

- Use a three-capability split so strategy, lifecycle guidance, and reference governance can evolve independently in later changes.
- Treat the planning output as a documentation artifact inside the repository, backed by OpenSpec artifacts as the authoritative planning contract.
- Model resource layering explicitly:
  - Shared cross-agent assets stay aligned with `.agents/skills/` and `.mcp.json`.
  - Pi-specific assets stay aligned with `.pi/settings.json`, `.pi/extensions/`, `.pi/themes/`, and `.pi/agents/`.
  - User-global runtime remains `~/.pi/agent/`, which is the deployment target rather than the source-of-truth workspace.
- Keep extension workflows lightweight:
  - Existing open-source extensions follow an intake path focused on fit, compatibility, integration, and deployment.
  - New custom extensions follow an authoring path focused on knowledge inputs, implementation conventions, integration points, and deployment.
  - OpenSpec remains responsible for proposal/design/tasks/verification/writeback artifacts for any actual execution change.
- Use stratified reference curation:
  - Pi config repositories
  - Pi extension repositories
  - Adjacent ecosystem pattern samples
  - Promotion labels: direct reuse, partial borrowing, observe-only
- Organize the blueprint around phased evolution instead of file-by-file implementation detail, because this change is meant to guide multiple future implementation tracks.

## Risks / Migration

- The planning document can become too abstract to drive execution. Mitigation: tasks must include concrete authoring, cross-checking, and acceptance steps tied to the three specs.
- Reference recommendations can become stale as Pi ecosystem projects evolve. Mitigation: the curation model must treat references as tiered inputs with promotion labels rather than frozen commitments.
- Later implementation changes may bypass the blueprint and reintroduce ad-hoc decisions. Mitigation: make the blueprint the required planning entrypoint for future Pi-related changes and write back its summary into the linked project progress page.
