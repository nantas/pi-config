# Pi Phase 1 Boundary

Phase 1 manages only the Pi-specific repository source paths listed below:

- `.pi/settings.json`
- `.pi/extensions/`
- `.pi/packages/`
- `.pi/prompts/`
- `.pi/themes/`
- `.pi/agents/`

`scripts/sync-pi-agent.sh` is a one-way bootstrap/sync entrypoint from the repository to `~/.pi/agent/`.

## Managed Runtime Mapping

| Repository source | Runtime target |
| --- | --- |
| `.pi/settings.json` | `~/.pi/agent/settings.json` |
| `.pi/extensions/` | `~/.pi/agent/extensions/` |
| `.pi/packages/` | loaded indirectly via `~/.pi/agent/settings.json` local-path package entries |
| `.pi/prompts/` | `~/.pi/agent/prompts/` |
| `.pi/themes/` | `~/.pi/agent/themes/` |
| `.pi/agents/` | `~/.pi/agent/agents/` |

## Sync Contract

- The repository is the only source of truth for managed Phase 1 paths.
- Sync is one-way; runtime edits do not flow back into the repository.
- Directory targets stay copy-based, while `~/.pi/agent/settings.json` may be rendered from repository truth with runtime-only absolute package paths.
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

`.pi/settings.json` remains the repository-managed truth for Pi runtime activation. After the package-delivery change, it carries portable package sources such as `./packages/subagent-dispatch`, while the sync workflow renders machine-specific absolute paths only in `~/.pi/agent/settings.json`.

## Closeout Governance Extension

Later `pi-config` feature or configuration changes may update repository `.pi/settings.json` away from the original empty-object baseline when the managed Pi runtime requirements change.

That closeout governance does not alter the Phase 1 deployment model:

- repository `.pi/settings.json` is still the managed source of truth
- `~/.pi/agent/settings.json` is still the managed runtime target
- deployment still uses the existing managed overwrite workflow
- `.mcp.json` remains outside the managed Pi settings sync scope because it belongs to the shared cross-agent layer

When a later change reaches verification closeout, global Pi deployment should still be treated as an explicit user-confirmed use of the existing managed sync path, not as a new runtime merge model.
