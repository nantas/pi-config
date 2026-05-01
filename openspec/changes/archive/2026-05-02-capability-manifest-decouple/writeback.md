# Writeback: capability-manifest-decouple

## Change Summary

| Field | Value |
|---|---|
| Change | capability-manifest-decouple |
| Schema | orbitos-change-v1 |
| Completion Date | 2026-05-01 |
| Verification | PASS ✓ (12/12 tasks) |

## Deliverables

### New Files Created
- `.pi/capabilities.yaml` — Capability manifest with `global` (5 packages, 3 extensions, 2 agents, 1 skill) and `catalog` (3 skills, 1 extension, 2 packages) tiers
- `.pi/skills/install-from-pi-config/SKILL.md` — Cross-repo capability install skill (Phase 1-6 workflow: catalog discovery → dependency resolution → file-based/settings-entry install → npm → verification)

### Modified Files
- `scripts/sync-pi-agent.sh` — Rewritten from hardcoded MAPPINGS to manifest-driven sync: whitelist-based settings filtering, stale cleanup, catalog publishing to `~/.pi/agent/catalog/pi-config.yaml`
- `AGENTS.md` — Added "Capability Manifest Governance" section with action→manifest-update table
- `.pi/skills/pkg-research/SKILL.md` — Phase 3 Decision enhanced with manifest writing (Option A → global.settings.packages, Option B → catalog.packages)
- `.pi/skills/pi-extension-dev/SKILL.md` — Phase F restructured with scope determination + manifest update (global → global.extensions, catalog → catalog.extensions)

### Global Runtime Changes
- `~/.pi/agent/catalog/pi-config.yaml` — Published with source_repo_path and catalog entries
- `~/.pi/agent/settings.json` — Now filtered: 5 packages (down from 7), exclude_keys removed
- `~/.pi/agent/skills/install-from-pi-config/` — New global skill discoverable from any repo

## Verification Result

All 6 spec sections (capability-manifest, install-from-pi-config, pi-runtime-bootstrap-sync, pkg-global-sync, capability-governance, pkg-decision-backlog, pi-extension-dev-skill) verified. All ADDED and MODIFIED requirements confirmed. Post-sync global state validated.

## Key Design Decisions

1. **Manifest-driven sync** — `.pi/capabilities.yaml` replaces hardcoded MAPPINGS as the single source of truth
2. **Settings whitelist** — Only packages declared in `global.settings.packages` are synced; other settings keys can be excluded via `exclude_keys`
3. **Catalog publishing** — Catalog section + source_repo_path published to `~/.pi/agent/catalog/pi-config.yaml` for cross-repo discovery
4. **Dual-path install** — install-from-pi-config skill supports file-based (skills/extensions) and settings-entry (packages) installation paths

## Associations

- OpenSpec change: `openspec/changes/capability-manifest-decouple/`
- Repository: pi-config
- Global sync: executed and verified 2026-05-01
