# Verification Report: pkg-fork-dev

## Change Info

- **Change:** pkg-fork-dev
- **Schema:** orbitos-change-v1
- **Verification Date:** 2026-05-07
- **Verifier:** Agent (in-session)

## Spec-to-Implementation Coverage

### pkg-fork-dev — Skill file structure

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Located at `.pi/skills/pkg-fork-dev/SKILL.md` | ✅ | File exists with correct path |
| YAML frontmatter with name, description, use when / do NOT use for | ✅ | Frontmatter matches spec |
| Agent discovers skill for fork tasks | ✅ | Frontmatter includes trigger conditions |

### pkg-fork-dev — Phase A: Fork & Setup

| Requirement | Status | Evidence |
|-------------|--------|----------|
| A1: Source identification (npm/git detection) | ✅ | Step A1 documents both detection paths |
| A2: GitHub fork guidance | ✅ | Step A2 with `gh repo fork` instruction |
| A3: Clone path confirmation via ask_user | ✅ | Step A3 explicitly uses ask_user |
| A4: Repo-registry registration | ✅ | Step A4 with `repo-registry set` command |
| A5: Manifest registration | ✅ | Step A5 with manifest entry schema |
| A6: Settings.json update | ✅ | Step A6 covers npm→git and git→git |
| A7: Capabilities update | ✅ | Step A7 checks catalog + global packages |
| A8: Reinstall | ✅ | Step A8 with `pi install -l` |
| A9: Baseline verification | ✅ | Step A9 startup verification |

**Scenarios verified:**
- npm→git fork (pi-mcp-adapter): Pilot 2 executed successfully
- git→git fork (pi-tool-display): Pilot 1 executed successfully
- Clone path cross-machine: Skill includes re-ask logic in Appendix

### pkg-fork-dev — Phase B: Modification Planning

| Requirement | Status | Evidence |
|-------------|--------|----------|
| B1: Codebase understanding | ✅ | Step B1 with repo:// resolution |
| B2: Modification target identification | ✅ | Step B2 with impact scope analysis |
| B3: Design decisions | ✅ | Step B3 with compatibility notes |
| B4: OpenSpec option | ✅ | Step B4 optional change creation |
| B5: User confirmation | ✅ | Step B5 explicit approval gate |

### pkg-fork-dev — Phase C: Implementation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| C1: Code changes in dev clone | ✅ | Step C1 with repo:// path reference |
| C2: Existing tests | ✅ | Step C2 with npm test / load check |
| C3: Documentation update | ✅ | Step C3 CHANGELOG/README guidance |
| C4: Diff review | ✅ | Step C4 `git diff` presentation |

### pkg-fork-dev — Phase D: Local Testing

| Requirement | Status | Evidence |
|-------------|--------|----------|
| D1: Temp switch to file source | ✅ | Step D1 settings.json update |
| D2: Local install | ✅ | Step D2 `pi install -l file:` |
| D3: Functional test | ✅ | Step D3 pi startup verification |
| D4: Iteration | ✅ | Step D4 C→D loop documented |
| D5: Test complete | ✅ | Step D5 user confirmation |

**Scenarios verified:**
- Testing modified extension: Steps D1-D3 cover this
- Testing fails iteration: Step D4 covers return to Phase C

### pkg-fork-dev — Phase E: Commit & Ship

| Requirement | Status | Evidence |
|-------------|--------|----------|
| E1: Commit | ✅ | Step E1 conventional commit format |
| E2: Tag | ✅ | Step E2 semver guidance |
| E3: Push | ✅ | Step E3 push origin + tags |
| E4: Restore source | ✅ | Step E4 settings.json restoration |
| E5: Remote reinstall | ✅ | Step E5 `pi install -l git:` |
| E6: Manifest update | ✅ | Step E6 changes_summary update |
| E7: Backlog record | ✅ | Step E7 pkg-backlog.md format |

### pkg-fork-dev — Phase F: Maintenance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| F1: Fetch upstream | ✅ | Step F1 `git fetch upstream` |
| F2: Diff check | ✅ | Step F2 log + diff commands |
| F3: Merge decision | ✅ | Step F3 4-option matrix |
| F4: Execute merge | ✅ | Step F4 merge/rebase/cherry-pick |
| F5: Manifest update | ✅ | Step F5 last_upstream_sync |
| F6: Regression check | ✅ | Step F6 Phase B routing |

**Scenarios verified:**
- Checking upstream: Steps F1-F3 cover this
- Upstream merge conflicts: Step F4 conflict resolution + Phase D routing

### fork-manifest — Manifest file location and format

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Located at `forks/manifest.yaml` | ✅ | File exists at repo root |
| Valid YAML with top-level `forks` key | ✅ | `forks` key present, entries valid |
| Fork entry schema (7 fields) | ✅ | Both pilot entries have all fields |
| Machine-specific paths not recorded | ✅ | No clone paths in manifest |
| Manifest as single source of fork truth | ✅ | Both forks registered |

### fork-integration — Settings.json source update

| Requirement | Status | Evidence |
|-------------|--------|----------|
| npm→git switch preserves array position | ✅ | pi-mcp-adapter replaced in-place |
| git→git switch preserves array position | ✅ | pi-tool-display replaced in-place |
| Original source recorded in manifest | ✅ | Both entries have upstream_source |

### fork-integration — Capabilities.yaml source update

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Catalog package source updated | ✅ | pi-mcp-adapter updated in catalog.packages |
| Global package source updated | ✅ | pi-tool-display updated in global.settings.packages |
| Other fields preserved | ✅ | name/description/type unchanged |

### fork-integration — Local testing source switch

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Temp file: switch documented | ✅ | Phase D Steps D1-D2 |
| Restore git: after testing | ✅ | Phase E Step E4 |

### fork-integration — Backlog recording

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Initial fork recorded | ✅ | Both forks in pkg-backlog.md |
| Fork metadata in Notes | ✅ | fork_url and upstream_url included |

## Task-to-Evidence Mapping

| Task | Status | Evidence |
|------|--------|----------|
| 1.1 Spec coverage confirmation | ✅ | All specs read and verified comprehensive |
| 1.2 repo-registry availability | ✅ | `python3 .../repo-registry.py list` executes |
| 2.1.1 forks/manifest.yaml creation | ✅ | File exists with schema header |
| 2.2.1 SKILL.md frontmatter | ✅ | File exists with correct frontmatter |
| 2.2.2 Workflow overview table | ✅ | A-F table with exit criteria |
| 2.2.3 Phase A | ✅ | A1-A9 with npm→git and git→git |
| 2.2.4 Phase B | ✅ | B1-B5 with OpenSpec option |
| 2.2.5 Phase C | ✅ | C1-C4 |
| 2.2.6 Phase D | ✅ | D1-D5 with iteration |
| 2.2.7 Phase E | ✅ | E1-E7 |
| 2.2.8 Phase F | ✅ | F1-F6 with merge matrix |
| 2.2.9 Appendix | ✅ | Path table + boundary clarification |
| 2.3.1 capabilities.yaml update | ✅ | catalog.skills has pkg-fork-dev |
| 3.1 Pilot 1 (pi-tool-display) | ✅ | Fork cloned, registered, settings updated |
| 3.2 Pilot 2 (pi-mcp-adapter) | ✅ | npm→git switch complete, no npm residue |
| 4.1 verification.md | ✅ | This file |
| 4.2 writeback.md | 🔄 | Pending (next task) |
| 4.3 writeback execution | 🔄 | Pending |

## Pilot Verification Details

### Pilot 1: pi-tool-display (git→git)

- **Upstream:** https://github.com/MasuRii/pi-tool-display
- **Fork:** https://github.com/nantas/pi-tool-display
- **Local clone:** /Users/nantasmac/projects/forks/pi-tool-display
- **repo-registry:** pi-tool-display → /Users/nantasmac/projects/forks/pi-tool-display
- **settings.json:** `git:github.com/MasuRii/pi-tool-display` → `git:github.com/nantas/pi-tool-display`
- **capabilities.yaml:** global.settings.packages updated
- **manifest.yaml:** Entry added with all 7 fields
- **Backlog:** Recorded in openspec/pkg-backlog.md
- **Install:** `pi install -l git:github.com/nantas/pi-tool-display` succeeded

### Pilot 2: pi-mcp-adapter (npm→git)

- **Upstream:** https://github.com/nicobailon/pi-mcp-adapter
- **Fork:** https://github.com/nantas/pi-mcp-adapter
- **Local clone:** /Users/nantasmac/projects/forks/pi-mcp-adapter
- **repo-registry:** pi-mcp-adapter → /Users/nantasmac/projects/forks/pi-mcp-adapter
- **settings.json:** `npm:pi-mcp-adapter@2.5.1` → `git:github.com/nantas/pi-mcp-adapter`
- **capabilities.yaml:** catalog.packages source updated
- **manifest.yaml:** Entry added with all 7 fields
- **Backlog:** Recorded in openspec/pkg-backlog.md
- **npm cleanup:** `npm uninstall pi-mcp-adapter` removed from .pi/npm/package.json and node_modules
- **Install:** `pi install -l git:github.com/nantas/pi-mcp-adapter` succeeded

## Issues / Notes

- None. Both pilots completed successfully without blockers.
- Old git clone `.pi/git/github.com/MasuRii/pi-tool-display` remains as stale artifact; user may clean up manually.
