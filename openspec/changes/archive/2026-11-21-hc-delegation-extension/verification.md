# Verification: hc-delegation-extension

## Automated Verification

| Check | Command | Observed Result |
|---|---|---|
| Extension unit tests | `node --test tests/hc-delegation.test.ts` | 110 pass, 0 fail — post task-6 refinement run (incl. regression for blocked-2nd-file turn-budget poisoning edge case); covers no-openspec exemption removal, 2nd-edit block even after delegation in same turn, `detectDirectVerificationCommand` + Lead bash verification nudge, and the repo-agnostic Lead section |
| Existing search-guard regression | `node --test tests/bash-search-guard.test.ts` | 26 pass, 0 fail |
| Live Pi extension load | `pi -ne -e .pi/extensions/hc-delegation.ts --list-models` | Exit 0, zero load errors (negative control confirmed sensitive) |
| Strict schema check | Real `typebox` JSON serialization | Both `hc_worker` and `hc_report` emit `{ type: "object", properties: ..., required: ["action"], additionalProperties: false }` with `parameters` + `execute` |
| Isolated `hc` empty-body template check | Scratch `HC_SESSION` + `XDG_CONFIG_HOME` | `hc templates --json` and `hc run --bg` accept frontmatter-only templates when `command:` is present |
| Manifest & templates integrity | `yaml.safe_load(.pi/capabilities.yaml)` + frontmatter parser | `hc-delegation` in `global.extensions`, all 3 templates have `command:` and empty body |

## Measured Rendered Footprint

Measured from `.pi/extensions/hc-delegation.ts` real TypeBox schemas and section renderers:

- `hc_worker` parameters JSON: 1,273 chars (~318 tokens)
- `hc_report` parameters JSON: 668 chars (~167 tokens)
- `hc_lead` `<delegation>` section: 1,680 chars (~420 tokens with 3 templates; 1,554 chars without)
- `hc_worker` `<hc_worker_role>` section: 577 chars (~152 tokens)
- `hc_peer` `<hc_peer_role>` section: 444 chars (~117 tokens)
- `standalone` `<delegation>` section: 308 chars (~81 tokens)
- `subagent` role: 0 chars / 0 tokens

## Independent Review

Dispatched `reviewer` subagent over `.pi/extensions/hc-delegation.ts` (1,585 lines); all 3 fixes-worth-doing-now were resolved and re-verified (+11 tests):

1. `findHcRun` now inspects every pipeline segment via `statementCommands()`, closing piped `hc run` bypasses.
2. `hc_lead` tool plan only adds `hc_worker`, never force-re-enabling a manually disabled `subagent`.
3. `HcTerminalInfo` declares `state?: string` and `isOccupiedTerminal()` fails closed on live or omitted state while allowing `finished` name reuse.

## Closeout Governance Outcomes

- Repo `.pi/settings.json`: `repo-settings-unchanged` (no settings key change required; global extension is governed by `.pi/capabilities.yaml`).
- Global runtime sync (`scripts/sync-pi-agent.sh`): `global-sync-confirmed-and-run` (user confirmed; run succeeded). Verified targets: `~/.pi/agent/extensions/hc-delegation.ts` deployed, `~/.pi/agent/AGENTS.d/` now contains only `media-and-diagrams.md` (destructive mirror removed `hc-delegation.md`/`subagent-usage.md`), `~/.config/herdr-core/templates/{grunt,workhorse,peer}.md` synced as frontmatter-only manifests.
