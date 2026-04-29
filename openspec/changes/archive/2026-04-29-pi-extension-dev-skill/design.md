# Design

## Context

This change implements Phase 3 of the `pi-customization-blueprint.md` roadmap for the pi-config repository. The goal is to create a reusable skill (`pi-extension-dev`) that encodes the extension development context and workflow, enabling structured extension creation through the full lifecycle: requirements clarification, design decisions, OpenSpec-governed implementation, verification, and deployment sync.

The skill is a meta-capability: it does not itself produce a runtime extension, but rather guides the LLM through the process of creating one.

## Goals / Non-Goals

**Goals:**
- Create `.pi/skills/pi-extension-dev/SKILL.md` as a single-file skill following the Agent Skills standard
- Encode the 6-phase workflow: clarify → design → OpenSpec → implement → verify → deploy/archive
- Use reference-type knowledge model (point to existing docs, don't duplicate)
- Integrate with existing `scripts/sync-pi-agent.sh` for deployment
- Required by all specs in `specs/pi-extension-dev-skill/spec.md`
- Zero changes to `.pi/settings.json`

**Non-Goals:**
- Not creating any specific extension implementation
- Not modifying `scripts/sync-pi-agent.sh`
- Not copying pi-mono API docs into the skill
- Not modifying `docs/plans/pi-customization-blueprint.md` or `docs/plans/pi-customization-reference.md`

## Decisions

### D1: Skill placement — `.pi/skills/`

Placed at `.pi/skills/pi-extension-dev/SKILL.md`. This is a pi-only skill (heavily references ExtensionAPI, TypeBox, pi lifecycle events). Using `.agents/skills/` would expose it to opencode where it has no value. The `.pi/skills/` directory allows flat `.md` files as skills (in addition to subdirectory form), and pi auto-discovers it without settings.json changes. Subdirectory form chosen to allow future `scripts/` or `references/` assets.

### D2: Knowledge model — reference-type

The skill does not duplicate pi-mono API documentation. Instead it provides:
- Explicit file paths and section references to `docs/plans/pi-customization-reference.md`
- `repo://pi-mono` path references to `packages/coding-agent/docs/extensions.md`
- A compact quick-reference appendix with method/event names and their source locations

This keeps the skill ~200-400 lines rather than 2000+, and ensures API details stay accurate by deferring to the source of truth.

### D3: Workflow structure — 6 phases

| Phase | Name | Key Actions |
|-------|------|------------|
| A | Requirements clarification | Load reference doc Section 3; clarify what, when, which APIs |
| B | Design decisions | Event selection, Tool vs Command, file organization; confirm with user |
| C | OpenSpec change creation | Trigger openspec-new-change; fill proposal/specs/design/tasks; user review |
| D | Implementation | Write code to `.pi/extensions/<name>.ts` per tasks.md |
| E | Verification | Functional test with `pi -e`; openspec-verify-change |
| F | Deployment + archive | `./scripts/sync-pi-agent.sh`; openspec-archive-change |

Each phase has clear entry/exit criteria so the LLM knows when to advance.

### D4: Extension file organization guidance

The skill references extensions.md patterns:
- Single file: `.pi/extensions/<name>.ts` — default for simple extensions
- Subdirectory: `.pi/extensions/<name>/index.ts` — for multi-file or package-with-deps
- The skill includes a decision tree: npm dependency needed? → subdirectory. Otherwise → single file.

### D5: Sync integration

The skill calls `./scripts/sync-pi-agent.sh` which copies `.pi/extensions/` to `~/.pi/agent/extensions/`. No ad hoc `cp` or manual `settings.json` editing. This follows the managed-workflow constraint from AGENTS.md ("only sync to `~/.pi/agent/settings.json` after explicit confirmation, using the existing managed workflow").

### D6: Skill content structure

The SKILL.md follows a linear phase structure with:
- YAML frontmatter (`name`, `description`)
- Phase sections (## Phase A: ..., ## Phase B: ..., etc.)
- An appendix with a compact quick-reference table (API method → source location)
- Each phase references specific spec requirements via requirement names

## Risks / Migration

### Risk 1: Reference path staleness
If files referenced by the skill (e.g., `docs/plans/pi-customization-reference.md`) move or are renamed, the skill's instructions will point to non-existent paths. The LLM may fail to load prerequisite knowledge.
- **Mitigation**: The skill instructs the LLM to report missing references and fall back to asking the user. All reference paths are repo-relative, reducing sensitivity to machine-specific layout.

### Risk 2: pi-mono API evolution
The pi-mono extensions.md API may change between versions. The reference doc is a point-in-time snapshot and may drift.
- **Mitigation**: The skill uses `repo://pi-mono` as source, so if pi-mono is updated, the LLM reads the current version. The reference doc is a secondary quick-reference; detailed API always comes from the live source.

### Risk 3: Skill assumes pi-config working directory
The skill references paths relative to the pi-config repo root (e.g., `docs/plans/`, `.pi/extensions/`, `scripts/sync-pi-agent.sh`). If pi runs from a different directory, these paths won't resolve.
- **Mitigation**: The skill description clearly states "Use when developing Pi extensions within the pi-config repository." The LLM should load the skill only when the working context matches.
