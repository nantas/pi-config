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

## Closeout Governance Extension

Later `pi-config` feature or configuration changes may update repository `.pi/settings.json` away from the original empty-object baseline when the managed Pi runtime requirements change.

That closeout governance does not alter the Phase 1 deployment model:

- repository `.pi/settings.json` is still the managed source of truth
- `~/.pi/agent/settings.json` is still the managed runtime target
- deployment still uses the existing copy-based overwrite workflow
- `.mcp.json` remains outside the managed Pi settings sync scope because it belongs to the shared cross-agent layer

When a later change reaches verification closeout, global Pi deployment should still be treated as an explicit user-confirmed use of the existing managed sync path, not as a new runtime merge model.
