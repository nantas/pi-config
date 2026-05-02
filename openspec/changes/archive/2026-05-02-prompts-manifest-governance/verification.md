# Verification: prompts-manifest-governance

## Spec-to-Implementation Mapping

### `prompts-manifest-governance` spec

| Requirement | Scenario | Implementation | Status |
|---|---|---|---|
| `prompts-manifest-section` | `manifest-declares-prompts` | `.pi/capabilities.yaml` — `global.prompts` lists 10 opsx-* templates | ✅ |
| `prompts-manifest-section` | `manifest-omits-prompts` | `extractItems()` returns empty array; stale cleanup removes all files | ✅ |
| `prompts-manifest-driven-sync` | `sync-copies-whitelisted-prompts` | Node script in `sync_from_manifest()` copies whitelisted prompts with WARNING on missing | ✅ |
| `prompts-manifest-driven-sync` | `sync-cleans-stale-prompts` | Stale cleanup block after prompts sync removes unlisted `.md` files | ✅ |
| `prompts-manifest-driven-sync` | `sync-preserves-themes-bulk-copy` | `sync_prompts_and_themes()` retains only themes full-dir-copy; prompts removed | ✅ |
| `prompts-precedence-governance` | `global-shadows-project-prompt` | AGENTS.md Precedence Rule section documents global-shadow behavior | ✅ |
| `prompts-sync-summary` | `sync-summary-accuracy` | Summary footer moves `prompts/` to "Managed by manifest" section | ✅ |

### `capability-manifest-governance` spec (modified)

| Requirement | Scenario | Implementation | Status |
|---|---|---|---|
| `manifest-covers-prompt-resources` | `add-prompt-requires-manifest-update` | Prompts added to resource types list in Capability Manifest Governance | ✅ |
| `manifest-covers-prompt-resources` | `manifest-governance-table-includes-prompts` | Workflow Guidance table includes "Add/remove a prompt" row | ✅ |
| `manifest-governance-precedence-rule` | `precedence-rule-documented` | Precedence Rule subsection added, covers prompts (silent shadow) and skills (collision diagnostic) | ✅ |

## Task-to-Evidence Mapping

| Task | Evidence |
|---|---|
| 1.1 Scope confirmation | design.md defines scope boundaries |
| 1.2 No migration conflicts | `~/.pi/agent/prompts/` has exactly the 10 opsx files |
| 2.1.1 Add `global.prompts` | `.pi/capabilities.yaml` — 10 prompts listed under `global.prompts` |
| 2.2.1 Add `extractItems` call | `sync-pi-agent.sh` — `const globalPrompts = extractItems("global", "prompts");` |
| 2.2.2 Prompts sync block | `sync-pi-agent.sh` — SYNC PROMPTS block with per-file copy + WARNING |
| 2.2.3 Stale cleanup | `sync-pi-agent.sh` — STALE PROMPT CLEANUP block |
| 2.2.4 Remove prompts from full-copy | `sync_prompts_and_themes()` — only themes remain |
| 2.2.5 Update summary footer | Summary shows `prompts/` in "Managed by manifest" |
| 2.3.1 Add Prompts to resource types | AGENTS.md lists Prompts in governance section |
| 2.3.2 Add workflow table row | AGENTS.md table includes "Add/remove a prompt" |
| 2.3.3 Add Precedence Rule | AGENTS.md Precedence Rule subsection |

## Verification Checks Performed

1. `bash -n scripts/sync-pi-agent.sh` — shell syntax OK
2. Node `extractItems("global", "prompts")` test — returns 10 prompts ✓
3. `grep "prompts:" .pi/capabilities.yaml` — exists ✓
4. AGENTS.md content review — governance, table, precedence rule all present ✓
