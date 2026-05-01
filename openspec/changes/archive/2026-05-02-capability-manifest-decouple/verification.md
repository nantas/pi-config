# Verification: capability-manifest-decouple

## Change Metadata

| Field | Value |
|---|---|
| Change | capability-manifest-decouple |
| Schema | orbitos-change-v1 |
| Verification Date | 2026-05-01 |
| Verifier | Pi agent (openspec-verify-change) |

## Verification Summary

**Result: PASS** ✓ — All 6 sections verified. 12/12 tasks complete.

---

## 1. Capability Manifest Data Structure (capability-manifest)

**Spec coverage:** `capability-manifest` — all ADDED Requirements

### Verification: `.pi/capabilities.yaml` file exists

- [x] File `.pi/capabilities.yaml` is present at the repository root of `.pi/`
- [x] File is parseable YAML (validated via node structural analysis)
- [x] Contains `global` and `catalog` sections with stable field names

### Verification: Global tier structure

| Field | Value | Status |
|---|---|---|
| `global.agent_md` | `true` | ✓ |
| `global.extensions` | 3 entries (dollar-skill-invoke, planner-toggle, output-scroll-viewer) | ✓ |
| `global.agents` | 2 entries (dispatch-planner, code-writer) | ✓ |
| `global.skills` | 1 entry (install-from-pi-config) | ✓ |
| `global.settings.packages` | 5 entries (npm:pi-mcp-adapter@2.5.1, ./packages/subagent-dispatch, npm:pi-ask-tool-extension, npm:@tmustier/pi-tab-status, npm:pi-powerline-footer) | ✓ |
| `global.settings.exclude_keys` | 4 entries (defaultThinkingLevel, defaultProvider, defaultModel, subagents) | ✓ |

### Verification: Catalog tier structure

| Field | Value | Status |
|---|---|---|
| `catalog.skills` | 3 entries (obsidian-search with requires.extensions, pi-extension-dev, pkg-research) | ✓ |
| `catalog.extensions` | 1 entry (obsidian-tools with has_package_json: true) | ✓ |
| `catalog.packages` | 2 entries (pi-mcp-adapter, lsp-pi, both type: settings-entry) | ✓ |

### Verification: Catalog dependency declaration

- [x] `obsidian-search` has `requires.extensions: [obsidian-tools]`
- [x] `pi-extension-dev` and `pkg-research` have no `requires` (standalone)
- [x] Catalog packages have `type: "settings-entry"` for settings-based install path

---

## 2. Install-From-Pi-Config Skill (install-from-pi-config)

**Spec coverage:** `install-from-pi-config` — all ADDED Requirements

### Verification: Skill is globally available

- [x] `.pi/skills/install-from-pi-config/SKILL.md` exists
- [x] Skill is synced to `~/.pi/agent/skills/install-from-pi-config/` (via scripts/sync-pi-agent.sh)
- [x] Skill has valid YAML frontmatter with `name: install-from-pi-config`
- [x] Description field present for Pi autocomplete

### Verification: Workflow structure

| Phase | Name | Coverage |
|---|---|---|
| 1 | Discover Catalog | Catalog file reading, source_repo_path resolution |
| 2 | Match Capability | Name matching, not-found reporting |
| 3 | Resolve Dependencies | Transitive requires resolution, skip already-installed |
| 4 | File-Based Install | Directory copy with overwrite confirmation |
| 4b | Settings-Entry Install | Package source append to settings.json, restart guidance |
| 5 | npm Dependencies | `npm install --no-package-lock --ignore-scripts` for has_package_json |
| 6 | Verify Installation | File existence check + settings.json entry confirmation |

---

## 3. Sync Script Rewrite (pi-runtime-bootstrap-sync + pkg-global-sync)

**Spec coverage:** `pi-runtime-bootstrap-sync` (modified path mapping + catalog publish + stale cleanup) + `pkg-global-sync` (whitelist filtering)

### Verification: Script behavior

- [x] Removed hardcoded MAPPINGS array
- [x] Sync is driven by `.pi/capabilities.yaml` manifest
- [x] Global extensions synced: dollar-skill-invoke, planner-toggle, output-scroll-viewer
- [x] Global agents synced: dispatch-planner, code-writer
- [x] Global skills synced: install-from-pi-config
- [x] Settings packages filtered by whitelist (5 global packages retained, 2 excluded)
- [x] Settings exclude_keys removed (defaultModel, subagents removed; lastChangelogVersion preserved)
- [x] Local path packages rendered as absolute
- [x] Catalog published to `~/.pi/agent/catalog/pi-config.yaml` with source_repo_path
- [x] Stale cleanup: .DS_Store removed from global skills
- [x] prompts/ and themes/ continue to sync unchanged
- [x] AGENTS.md syncs unchanged

### Verification: Post-sync global state

| Check | Expected | Actual | Status |
|---|---|---|---|
| extensions/ contents | 3 files | dollar-skill-invoke.ts, output-scroll-viewer.ts, planner-toggle.ts | ✓ |
| skills/ contents | install-from-pi-config/ | install-from-pi-config/ | ✓ |
| agents/ contents | code-writer.md, dispatch-planner.md | code-writer.md, dispatch-planner.md | ✓ |
| settings.json packages | 5 global packages | 5 packages (filtered) | ✓ |
| settings.json exclude_keys removed | No defaultModel/subagents | Removed ✓ | ✓ |
| settings.json preserve lastChangelogVersion | Preserved | Preserved ✓ | ✓ |
| catalog/pi-config.yaml | Exists | Exists with source_repo_path ✓ | ✓ |

---

## 4. Governance Rules (capability-governance)

**Spec coverage:** `capability-governance` — all ADDED Requirements

### Verification: AGENTS.md governance section

- [x] `AGENTS.md` contains a "Capability Manifest Governance" section
- [x] Section mentions extensions, skills, agents, and packages as resource types
- [x] Section includes table mapping actions to manifest updates
- [x] Section references pkg-research and pi-extension-dev auto-update workflows
- [x] `grep "capabilities.yaml" AGENTS.md` returns 5 matches (multiple references)

### Verification: pkg-research skill update

- [x] Phase 3 (Decision) Step 1 — Option A now mentions manifest update
- [x] Phase 3 (Decision) Step 1 — Option B now mentions manifest update
- [x] Phase 3 (Decision) Step 1 — Option C explicitly states no manifest modification
- [x] Phase 3 (Decision) Step 2 — Option A includes manifest update sub-step with example
- [x] Phase 3 (Decision) Step 2 — Option B includes manifest update sub-step with example
- [x] Phase 3 (Decision) Step 2 — Option C includes "Do NOT modify .pi/capabilities.yaml"
- [x] Constraints section updated with manifest rules
- [x] Key File Paths updated with `.pi/capabilities.yaml`

### Verification: pi-extension-dev skill update

- [x] Phase F (Deployment + Archive) restructured with 5 steps
- [x] Step 1: Determine extension scope (global vs catalog)
- [x] Step 3: Update capability manifest based on scope
- [x] Global scope → append to `global.extensions`
- [x] Catalog scope → add entry to `catalog.extensions` with metadata
- [x] `has_package_json` detection mentioned
- [x] Manifest update occurs before archive
- [x] Constraints section updated with manifest rules
- [x] Key File Paths updated with `.pi/capabilities.yaml`

---

## 5. Consistency Checks

### Verification: `.pi/capabilities.yaml` vs actual `.pi/` content

| Check | Status |
|---|---|
| `global.extensions` files exist in `.pi/extensions/` | ✓ (3/3) |
| `global.agents` files exist in `.pi/agents/` | ✓ (2/2) |
| `global.skills` directories exist in `.pi/skills/` | ✓ (1/1) |
| `global.settings.packages` all present in `.pi/settings.json` | ✓ (5/5) |
| `catalog.skills` directories exist in `.pi/skills/` | ✓ (3/3) |
| `catalog.extensions` directories exist in `.pi/extensions/` | ✓ (1/1) |
| `catalog.packages` all present in `.pi/settings.json` | ✓ (2/2) |

---

## 6. Edge Cases & Risk Mitigation

| Risk | Mitigation | Status |
|---|---|---|
| Sync removes existing global items not in manifest | Stale cleanup verified — only removes items not in manifest global lists | ✓ Tested |
| Inject keys (defaultModel/subagents) leak to other repos | exclude_keys successfully strips them | ✓ Verified |
| Catalog entry not found by other repos | Catalog published to `~/.pi/agent/catalog/pi-config.yaml` | ✓ Verified |
| Local path package not resolved to absolute | `./packages/subagent-dispatch` → absolute path | ✓ Verified |
| .DS_Store in skills/ dir after sync | Stale cleanup removed it | ✓ Verified |

---

## Conclusion

**All requirements verified. Change is ready for writeback and archival.** ✓
