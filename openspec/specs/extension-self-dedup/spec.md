# extension-self-dedup

## Purpose

Prevent duplicate registration of `init-command.ts` when the same extension file is loaded from both global (`~/.pi/agent/extensions/`) and project-local (`.pi/extensions/`) paths, using a `globalThis` dedup marker.

## Requirements

### Requirement: Extension Self-Deduplication

The system SHALL prevent duplicate registration of `init-command.ts` when the same extension file is loaded from both global (`~/.pi/agent/extensions/`) and project-local (`.pi/extensions/`) paths.

#### Scenario: Global copy loaded first, project copy loaded second
- **WHEN** both global and project-local copies of `init-command.ts` exist and the global copy is loaded first
- **THEN** the global copy SHALL register its shortcut, command, tool_call handler, and all event handlers normally
- **THEN** when the project-local copy is loaded, it SHALL detect that registration has already occurred and SHALL skip all registrations
- **THEN** the TUI SHALL NOT show any shortcut conflict warning

#### Scenario: Project copy loaded first, global copy loaded second
- **WHEN** both copies exist and the project-local copy is loaded first
- **THEN** the project-local copy SHALL register normally
- **THEN** the global copy SHALL detect prior registration and become a no-op

#### Scenario: Only one copy exists
- **WHEN** only one copy of `init-command.ts` exists (either global or project-local)
- **THEN** the extension SHALL register normally without any dedup bypass

#### Scenario: Global sync preserved
- **WHEN** `scripts/sync-pi-agent.sh` runs and `init-command.ts` exists in `.pi/extensions/`
- **THEN** it SHALL still be copied to `~/.pi/agent/extensions/` (no exclusion)
- **THEN** the dedup mechanism SHALL handle the duplicate at runtime
