# extension-dedup-standard

## Purpose

Define a standardized self-deduplication mechanism for Pi extensions (specifically `dollar-skill-invoke.ts`) to prevent duplicate registration when the same extension file is loaded from both global and project-local paths, and codify the dedup requirement in the `pi-extension-dev` skill.

## Requirements

### Requirement: Dollar-Skill-Invoke Self-Dedup

The system SHALL prevent duplicate registration of `dollar-skill-invoke.ts` when the same extension file is loaded from both global and project-local paths.

#### Scenario: Dedup marker on export function entry
- **WHEN** `dollar-skill-invoke.ts` is loaded
- **THEN** at the entry of its export default function, a `globalThis` check SHALL be performed
- **THEN** if another copy has already been loaded, the function SHALL return immediately before registering any events or handlers

#### Scenario: Global sync preserved
- **WHEN** `scripts/sync-pi-agent.sh` runs
- **THEN** `dollar-skill-invoke.ts` SHALL remain in the sync (no exclusion)
- **THEN** the dedup mechanism SHALL handle the duplicate at runtime

### Requirement: Pi-Extension-Dev Skill Standard

The `pi-extension-dev` skill SHALL document the requirement for self-deduplication in synced extensions.

#### Scenario: Dedup requirement in skill
- **WHEN** an extension developer reads the `pi-extension-dev` skill
- **THEN** the Implementation Guidance (Phase D) SHALL instruct that any extension deployed globally must include a `globalThis` dedup marker at its entry point
- **THEN** the skill SHALL explain that this prevents duplicate registration when the same extension is loaded from both project-local and global paths
