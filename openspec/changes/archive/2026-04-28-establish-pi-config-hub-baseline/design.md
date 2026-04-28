# Design

## Context

Phase 0 produced the blueprint that explains repository layering and the phased roadmap, but the repository still lacks the concrete Phase 1 baseline that turns those ideas into an implementation-ready contract. At the moment, `pi-config` contains shared `.agents` resources but no managed `.pi/` layer, no project-level Pi settings entrypoint, and no repository-defined deployment contract to `~/.pi/agent/`.

The user also clarified that `repo://pi-mono` is not just a reference sample. It is the source repository for `pi agent`, so every decision about supported `.pi/` structure, settings behavior, and resource loading must be validated against `pi-mono` instead of being invented locally.

## Goals / Non-Goals

**Goals:**

- Define the minimal `.pi/` source skeleton that `pi-config` will manage in Phase 1
- Define a single repository-to-runtime bootstrap/sync contract for those managed Pi resources
- Keep Phase 1 narrow enough that later capability work starts from clear boundaries rather than from partial implementations
- Preserve `repo://pi-mono` as the authority for Pi configuration semantics

**Non-Goals:**

- Implement any `MCP`, `subagent`, or extension capability itself
- Add shared skill or MCP deployment automation in this phase
- Store runtime state, auth, session files, or package caches in the repository
- Introduce custom Pi configuration conventions that are not grounded in `pi-mono`

## Decisions

- Use a two-capability split:
  - `pi-project-source-layer` for the managed repository baseline
  - `pi-runtime-bootstrap-sync` for deployment behavior
- Keep the managed repository skeleton to static Pi resources only:
  - `.pi/settings.json`
  - `.pi/extensions/`
  - `.pi/prompts/`
  - `.pi/themes/`
  - `.pi/agents/`
- Exclude `.pi/skills/` because shared skills already belong to `.agents/skills/` in this repository model.
- Exclude `.pi/npm/` and `.pi/git/` because they are install artifacts or caches rather than curated source-of-truth content.
- Keep `.pi/settings.json` as an empty-object contract file, relying on `pi-mono` default discovery rather than repeating default `extensions`, `prompts`, or `themes` paths.
- Define deployment as one-way, copy-based sync from the repository to `~/.pi/agent/`.
- Treat overwrite and deletion as part of the managed contract so sync remains repeatable and repository truth is enforceable.
- Preserve unmanaged runtime content outside the Phase 1 managed set to avoid mixing Pi-specific baseline control with broader user runtime state.

## Risks / Migration

- Existing local runtime customizations in managed target paths may be overwritten once sync is implemented. Mitigation: the change must document overwrite semantics explicitly before implementation starts.
- Future phases may want project-local skills or package-managed resources. Mitigation: this phase only constrains the initial managed baseline and does not prohibit later changes from extending it through new specs.
- There is a risk of treating `pi-mono` docs as static while upstream behavior evolves. Mitigation: later implementation and verification must cite the current `repo://pi-mono` source when validating behavior-sensitive assumptions.
