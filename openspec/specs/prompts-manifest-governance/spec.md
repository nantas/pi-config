# prompts-manifest-governance Specification

## Purpose
TBD - created by archiving change prompts-manifest-governance. Update Purpose after archive.
## Requirements
### Requirement: prompts-manifest-section
The system SHALL define a `global.prompts` section in `.pi/capabilities.yaml` that lists prompt template filenames (without `.md` extension) to be synced to `~/.pi/agent/prompts/`.

#### Scenario: manifest-declares-prompts
- **WHEN** `capabilities.yaml` contains `global.prompts` entries
- **THEN** only those entries SHALL be synced to `~/.pi/agent/prompts/`

#### Scenario: manifest-omits-prompts
- **WHEN** `global.prompts` is absent or empty from `capabilities.yaml`
- **THEN** no prompt templates SHALL be synced; any stale files in `~/.pi/agent/prompts/` SHALL be removed as part of sync

### Requirement: prompts-manifest-driven-sync
The sync script (`scripts/sync-pi-agent.sh`) SHALL handle `.pi/prompts/` files through the manifest-driven sync (like extensions/agents/skills), replacing the current full-directory-copy approach in `sync_prompts_and_themes()`.

#### Scenario: sync-copies-whitelisted-prompts
- **WHEN** `scripts/sync-pi-agent.sh` runs
- **THEN** for each prompt template listed in `global.prompts`, the corresponding `.md` file from `SOURCE_ROOT/prompts/` SHALL be copied to `TARGET_ROOT/prompts/`

#### Scenario: sync-cleans-stale-prompts
- **WHEN** `scripts/sync-pi-agent.sh` runs
- **THEN** any `.md` file in `TARGET_ROOT/prompts/` that is NOT listed in `global.prompts` SHALL be removed (stale cleanup)

#### Scenario: sync-preserves-themes-bulk-copy
- **WHEN** `scripts/sync-pi-agent.sh` runs
- **THEN** themes SHALL continue to use the existing full-directory-copy approach in `sync_prompts_and_themes()`, unchanged by this capability

### Requirement: prompts-precedence-governance
The `AGENTS.md` SHALL declare that when global (`~/.pi/agent/prompts/`) and project (`.pi/prompts/`) contain prompt templates with the same name, the global version SHALL take precedence.

#### Scenario: global-shadows-project-prompt
- **WHEN** a prompt template exists in both `~/.pi/agent/prompts/` and `.pi/prompts/`
- **THEN** pi runtime SHALL load the global version; the project version SHALL be silently ignored
- **THEN** the governance rule documents that this is expected behavior, and users SHOULD run `scripts/sync-pi-agent.sh` to propagate changes

### Requirement: prompts-sync-summary
The sync summary output SHALL include prompts under the "Managed by manifest" section (like extensions/agents/skills), not under "Unchanged (full directory copy)".

#### Scenario: sync-summary-accuracy
- **WHEN** a sync completes
- **THEN** the summary footer SHALL list `prompts/` under the manifest-managed section

