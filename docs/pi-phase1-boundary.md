# Pi Phase 1 Boundary

Phase 1 manages only the Pi-specific repository source paths listed below:

- `.pi/settings.json`
- `.pi/extensions/`
- `.pi/prompts/`
- `.pi/themes/`
- `.pi/agents/`

`scripts/sync-pi-agent.sh` is a one-way bootstrap/sync entrypoint from the repository to `~/.pi/agent/`.

## Managed Runtime Mapping

| Repository source | Runtime target |
| --- | --- |
| `.pi/settings.json` | `~/.pi/agent/settings.json` |
| `.pi/extensions/` | `~/.pi/agent/extensions/` |
| `.pi/prompts/` | `~/.pi/agent/prompts/` |
| `.pi/themes/` | `~/.pi/agent/themes/` |
| `.pi/agents/` | `~/.pi/agent/agents/` |

## Sync Contract

- The repository is the only source of truth for managed Phase 1 paths.
- Sync is copy-based and one-way; runtime edits do not flow back into the repository.
- Managed runtime targets are overwritten on every sync.
- Managed runtime targets are deleted when the corresponding repository path is removed.
- Runtime content outside the managed target set is preserved.

## Explicitly Out Of Scope

- `.agents/skills/`
- `.mcp.json`
- `.pi/skills/`
- `.pi/npm/`
- `.pi/git/`
- Runtime state, auth/session files, and package caches

## Settings Baseline

`.pi/settings.json` remains `{}` in Phase 1 so Pi can continue using `pi-mono` default discovery behavior instead of duplicating default `extensions`, `prompts`, or `themes` configuration.
