# Design: hc-delegation-extension

## Architecture

Single self-contained zero-dependency TypeScript extension at `.pi/extensions/hc-delegation.ts`, following the same single-file + `node --test` pattern as `.pi/extensions/bash-search-guard.ts`.

### Data Model

1. `RuntimeRole` discriminated union (`subagent | hc_worker | hc_peer | hc_lead | standalone`) resolved once at `session_start` via an injectable command runner (`CommandRunner`) for deterministic testing.
2. `DelegationSessionState` persisted via `pi.appendEntry("hc-delegation-state", state)` and reconstructed on `session_start` from `ctx.sessionManager.getEntries()`:
   - `tabId: string | null`
   - `tabName: string | null`
   - `ownedWorkers: Record<string, OwnedWorker>`
   - `guardEnabled: boolean` (default `true`)
   - `roleOverride: "allow_subagents" | null` (default `null`)
3. `TurnBudgetState` reset at each `before_agent_start` (new user turn):
   - `directInspectionCount: number`
   - `directEditedFiles: Set<string>`
   - `delegatedThisTurn: boolean`

### Pi Extension Lifecycle Integration

- **Tool registration**: Both `hc_worker` and `hc_report` register at extension load with `defaultActive: false` and `Type.Object(...)` parameters (satisfying strict OpenAI/xAI Responses API `parameters` validation).
- **Durable tool loadout (`before_agent_start`)**: Re-applies active tool additions/removals on every `before_agent_start` (not only `session_start`) so `/reload` or tool-registry refreshes cannot silently re-activate `subagent` inside an `hc_worker`.
- **Non-destructive system prompt injection (`before_agent_start`)**: Mutates `event.systemPromptOptions.sections` (`delegation`, `hc_worker_role`, or `hc_peer_role`) and `toolSnippets.subagent` in place and returns `undefined` (never returns `{ systemPrompt }`), guaranteeing compatibility with `@johnnywu/pi-subagents` `replace` mode and preserving KV prompt caching across turns.
- **Guards**:
  - `tool_call` (`edit` / `write` in `hc_lead`): blocks the 2nd distinct file edit in a turn before delegation — uniformly across all paths with no workflow-specific exemption. Multi-file workflow/planning artifacts (OpenSpec artifacts, specs, plans, ADRs) follow fixed processes and are delegated to `hc_worker`, keeping the extension repo-agnostic (not all tasks/repos use OpenSpec).
  - `tool_result` (`read` / `grep` / `find` in `hc_lead`): appends a non-blocking delegation reminder on direct inspection counts 3, 6, 9... when no delegation occurred and no owned workers exist.
  - `tool_call` (`bash` in `hc_lead`): redirects `hc run ... <known-template>` to `hc_worker(spawn)` while allowing plain shell `hc run` commands.
  - `tool_call` (`bash` in `hc_worker` / `hc_peer` / `subagent`): blocks `hc run` (anti-recursion).
  - `tool_result` (`bash` in `hc_lead`): appends a non-blocking `[hc-delegation]` nudge when the command is a test/build/lint/verify invocation (e.g. `node --test`, `npm test`, `npm run lint`, `pytest`, `openspec validate`), reinforcing the verification division of labor — workers execute verification suites and report observed outputs or log paths, the Lead audits evidence and diffs instead of running suites directly. The command is not blocked.
- **Escape hatches**: `/hc-guard [on|off|status]` (Lead) and `/hc-role [status|allow-subagents|reset]` (Worker/Peer).

### Template & Guidance Cleanup

- `.pi/herdr-templates/{grunt,workhorse,peer}.md` become pure YAML frontmatter (`description` + `command`), validated empirically against `hc 0.1.21` in an isolated `HC_SESSION`.
- `.pi/agent/AGENTS.md` removes static delegation sections; `.pi/agent/AGENTS.d/{hc-delegation,subagent-usage}.md` are deleted (`sync-pi-agent.sh` mirrors `AGENTS.d/` destructively, removing stale global files cleanly on user-confirmed sync).
- `.pi/capabilities.yaml` adds `hc-delegation` under `global.extensions`.
