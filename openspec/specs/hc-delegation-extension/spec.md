# Specification

## Requirements

### Requirement: Deterministic runtime role detection
The `hc-delegation` extension MUST resolve the current Pi process into one of five typed roles (`subagent`, `hc_worker`, `hc_peer`, `hc_lead`, `standalone`) at `session_start` using `PI_SUBAGENT_DEPTH`, `HC_TERMINAL_ID`, and `hc get "$HC_TERMINAL_ID" --json`.

#### Scenario: Subagent process skips hc inspection
- **WHEN** `PI_SUBAGENT_DEPTH` is set to a positive integer
- **THEN** the role resolves to `subagent` without invoking `hc get`

#### Scenario: Missing HC_TERMINAL_ID resolves to standalone
- **WHEN** `PI_SUBAGENT_DEPTH` is unset or 0 and `HC_TERMINAL_ID` is unset (or `hc get` fails)
- **THEN** the role resolves to `standalone`

#### Scenario: Child terminal or worker template resolves to hc_worker
- **WHEN** `hc get "$HC_TERMINAL_ID" --json` returns non-null `parent`, or non-null `template` other than `peer`
- **THEN** the role resolves to `hc_worker` carrying `terminalId`, `parent`, `template`, and `spaceId`

#### Scenario: Peer template with null parent resolves to hc_peer
- **WHEN** `hc get "$HC_TERMINAL_ID" --json` returns `parent: null` and `template: "peer"`
- **THEN** the role resolves to `hc_peer` carrying `terminalId` and `spaceId`

#### Scenario: Top-level human terminal in hc resolves to hc_lead
- **WHEN** `hc get "$HC_TERMINAL_ID" --json` returns `parent: null` and `template: null`
- **THEN** the role resolves to `hc_lead` carrying `terminalId`, `spaceId`, and discovered templates from `hc templates --json`

### Requirement: Role-scoped tool activation and system prompt section injection
The extension MUST register `hc_worker` and `hc_report` with `defaultActive: false` and apply role-scoped tool sets and structured `event.systemPromptOptions.sections` mutations in `before_agent_start` (mutating in place and returning `undefined` so `forceSystemPrompt` is never triggered).

#### Scenario: hc_lead receives hc_worker, subagent, and delegation section
- **WHEN** the role is `hc_lead`
- **THEN** `hc_worker` and `subagent` are active, `hc_report` is inactive, `toolSnippets.subagent` reflects its one-shot boundary, and `sections.delegation` states strict Lead delegation thresholds for both edits (>=2 files) and multi-file fact-checking (>=3 inspection steps) along with discovered templates and subagents

#### Scenario: hc_worker receives hc_report and loses subagent and hc_worker
- **WHEN** the role is `hc_worker` and no `/hc-role allow-subagents` override is active
- **THEN** `hc_report` is active, `hc_worker` and `subagent` are removed from active tools durably on every `before_agent_start`, and `sections.hc_worker_role` injects the worker contract with its actual `parent`, `template`, and `spaceId`

#### Scenario: hc_peer receives hc_report and peer section
- **WHEN** the role is `hc_peer` and no override is active
- **THEN** `hc_report` is active, `hc_worker` and `subagent` are inactive, and `sections.hc_peer_role` injects the peer discovery and messaging protocol

#### Scenario: subagent receives zero delegation prompt tokens
- **WHEN** the role is `subagent`
- **THEN** `hc_worker` and `hc_report` are inactive and no delegation or worker section is added to `sections`

#### Scenario: standalone receives fallback delegation hint only
- **WHEN** the role is `standalone`
- **THEN** `hc_worker` and `hc_report` are inactive, `subagent` remains active, and `sections.delegation` provides a concise fallback note pointing to `subagent()`

### Requirement: Strict Lead delegation guards
When the role is `hc_lead` and the guard is enabled (default `true`, toggleable via `/hc-guard`), the extension MUST actively enforce Lead delegation boundaries uniformly across all paths, including workflow and planning artifacts (OpenSpec artifacts, specs, plans, ADRs), which follow fixed processes and are delegated to `hc_worker` rather than authored directly by the Lead.

#### Scenario: Block direct edit or write to a second distinct file regardless of path
- **WHEN** the Lead has already edited or written one file directly in the current user turn without delegating, and attempts to `edit` or `write` a second distinct file — including files under `openspec/`, specs, plans, or ADRs
- **THEN** the `tool_call` handler blocks the call with a reason directing the Lead to `hc_worker({ action: "spawn", ... })`

#### Scenario: Allow single-file edits on any path
- **WHEN** the Lead edits or writes a single file in the turn (workflow or not)
- **THEN** the write guard allows the call

#### Scenario: Escalate direct exploration calls before delegation
- **WHEN** the Lead has made 3 or more direct `read`/`grep`/`find` calls in a fresh user turn without invoking `hc_worker`/`subagent` and without existing owned workers
- **THEN** the `tool_result` handler appends a concise delegation reminder on every 3rd call (3, 6, 9, ...) urging delegation of remaining fact-checking

#### Scenario: Stay silent on exploration during acceptance
- **WHEN** the Lead already has owned workers or has already delegated in the current turn
- **THEN** direct `read`/`grep`/`find` calls receive no nudge

#### Scenario: Redirect raw bash hc run of known worker templates
- **WHEN** the Lead runs `hc run` via `bash` invoking a known template name (`grunt`, `workhorse`, `peer`)
- **THEN** the `tool_call` handler blocks it and redirects to `hc_worker({ action: "spawn", ... })`, while allowing plain shell commands such as `hc run --bg --rm ...`

### Requirement: Verification division of labor between Lead and Workers
The extension MUST reinforce that workers execute build/test/lint/verification commands and report observed outputs or log paths, while the Lead focuses on inspecting and auditing verification evidence and diffs rather than executing verification suites directly.

#### Scenario: Nudge Lead on direct verification command execution
- **WHEN** the role is `hc_lead` and the Lead runs a test/build/lint/verify command directly in `bash` (e.g. `node --test`, `npm test`, `npm run lint`, `pytest`, `openspec validate`) while the guard is enabled
- **THEN** a non-blocking `[hc-delegation]` nudge is appended to the `bash` tool result reminding the Lead to delegate verification runs to `hc_worker` and audit the reported evidence instead; the command itself is not blocked

#### Scenario: No nudge outside lead role or when guard disabled
- **WHEN** the role is not `hc_lead`, or the Lead has disabled the guard via `/hc-guard off`
- **THEN** verification commands in `bash` produce no `[hc-delegation]` nudge

### Requirement: Anti-recursion guard in non-lead roles
When the role is `hc_worker`, `hc_peer`, or `subagent`, the extension MUST block `bash` commands invoking `hc run` unless the user explicitly enabled `/hc-role allow-subagents`.

#### Scenario: Block hc run inside worker or subagent
- **WHEN** a `hc_worker`, `hc_peer`, or `subagent` attempts to run `hc run ...` through `bash`
- **THEN** the `tool_call` handler blocks the call with an anti-recursion reason

### Requirement: hc_worker tool manages full Lead worker lifecycle
The `hc_worker` tool MUST support exactly `spawn`, `send`, `read`, `status`, `interrupt`, and `close`. It MUST NOT expose a blocking `wait` action: after `spawn` verifies first-message delivery the Lead reports to the human and ends its turn, and the worker pushes its result back when it finishes.

#### Scenario: Spawn places workers into one shared Herdr tab and verifies first_message
- **WHEN** `hc_worker({ action: "spawn", name, template, task, cwd? })` runs in a Herdr space
- **THEN** it checks for duplicate live worker names, attaches `herdr.space`, attaches `herdr.tab` only when a non-empty `tabId` is known, falls back to `herdr-app ls` matched by terminal `address` on the first worker to capture `tabId` and run `herdr-app do tab.rename`, verifies `first_message.sent`, and persists `{ tabId, ownedWorkers }` via `pi.appendEntry`

#### Scenario: Spawn hands the turn back instead of blocking
- **WHEN** `spawn` returns with `first_message.sent === true`
- **THEN** the Lead informs the human that the worker started and ends its turn, leaving the result to arrive as a worker push (`hc_report`) rather than polling

#### Scenario: Blocking wait is not part of the tool surface
- **WHEN** the Lead (or any role) tries to block on a worker result through the tool
- **THEN** no such action exists: the tool rejects the call as an unknown action, and progress is obtained through `hc_worker({ action: "status" })` or `hc_worker({ action: "read" })` instead

#### Scenario: Stale cached tab is re-resolved before reuse
- **WHEN** a persisted `herdr.tab` label is reused for the next spawn but `herdr-app ls` does not contain that `tabId` (the tab was closed or renamed)
- **THEN** the tool discards the stale `tabId`, re-resolves the tab from the terminal `address`, and renames it again instead of attaching a dead label

#### Scenario: Close pre-checks stray processes and worktrees
- **WHEN** `hc_worker({ action: "close", name })` targets an owned worker
- **THEN** it first inspects the terminal for still-running processes and the worker's worktree state, and reports what it found instead of silently removing a terminal that is still writing files

#### Scenario: Close refuses terminals not owned by this session
- **WHEN** `hc_worker({ action: "close", name })` targets a terminal neither in `ownedWorkers` nor having `parent === role.terminalId`
- **THEN** the tool refuses to kill or remove it and returns an error

### Requirement: hc_report tool manages Worker reporting and Peer messaging
The `hc_report` tool MUST support `done`, `blocked`, `peer`, and `list_peers`, auto-formatting parent reports and `peer: $HC_TERMINAL_ID ...` messages without `--force`.

### Requirement: Async push-first delegation, not blocking waits
Delegation MUST be push-first: the Lead starts a worker, ends its turn, and waits for the worker's `hc_report` to drive the next turn. The extension MUST NOT offer a blocking wait primitive, and MUST nudge (never block) the Lead that runs `hc wait` through `bash`.

#### Scenario: Nudge Lead who polls with bash hc wait
- **WHEN** the role is `hc_lead` with the guard enabled and the Lead runs `hc wait ...` in `bash`
- **THEN** a non-blocking `[hc-delegation]` nudge is appended to the `bash` tool result explaining that the worker push ends the wait, that the turn should end after `spawn`, and that `hc_worker({ action: "status" })` / `read` are the non-blocking progress checks; the command itself is not blocked

#### Scenario: No nudge outside lead role or when guard disabled
- **WHEN** the role is not `hc_lead`, or the Lead disabled the guard with `/hc-guard off`
- **THEN** `hc wait` through `bash` produces no `[hc-delegation]` nudge

### Requirement: Undelivered worker notifications follow a fixed protocol
The extension MUST handle `hc send` delivery failures deterministically. A worker blocked by an interactive dialog returns `kind=blocked` (CLI exit 9) and a `--if` status mismatch returns `kind=status_mismatch` (CLI exit 10); neither side may retry-spam or escalate with `--force`.

#### Scenario: Worker keeps its report and waits silently
- **WHEN** a worker's `hc_report` push to the parent fails with `kind=blocked` or `kind=status_mismatch`
- **THEN** the worker does not retry in a loop and does not add `--force`; it writes the full report to its `report_file`, leaves it visible in its own terminal, and waits silently for the human to clear the dialog

#### Scenario: Lead pings only idle or done workers after the dialog is cleared
- **WHEN** the Lead discovers that a worker notification was undelivered and the interactive dialog has been closed
- **THEN** the Lead issues a lightweight `hc_worker({ action: "status" })` first, and only sends a follow-up to workers whose status is `idle` or `done`; a worker reporting `working` is left alone

### Requirement: Report-file-first reporting
`hc_report` MUST accept an optional `report_file` parameter. The full four-section report (`Goal`, `Changes`, `Verification`, `Blockers`) MUST live in that file and in the worker's visible terminal, while the pushed parent report is a one-line summary plus the `report_file` path.

#### Scenario: Worker reports with a report file
- **WHEN** a worker calls `hc_report({ action: "done", summary, report_file })`
- **THEN** the file holds the four sections, the worker terminal shows the same report, and the parent receives only the short summary line and the path

#### Scenario: Report without a file still works
- **WHEN** `hc_report` is called without `report_file`
- **THEN** the behaviour is unchanged: the summary is pushed to the parent and no file is referenced

### Requirement: Verification honesty discipline
The extension MUST state, in `<hc_worker_role>` and in the global `AGENTS.md` guidance it complements, that verification is executed for real in the current turn, that no check may be deleted, skipped, or weakened to make a result pass, and that pre-existing baseline failures are noted in one line instead of being silently fixed or hidden.

#### Scenario: Worker contract carries the honesty rule
- **WHEN** the role is `hc_worker`
- **THEN** `sections.hc_worker_role` requires the real command, the observed output or log path, no deletion/skip/weakening of checks, and a one-line note for pre-existing baseline failures

#### Scenario: Lead audits evidence instead of re-running suites
- **WHEN** a worker reports verification results
- **THEN** the Lead checks the claimed commands and outputs against the diff, and direct verification runs in Lead `bash` remain a nudge rather than the expected path

### Requirement: Frontmatter-only Pi hc templates
The repository's Pi `hc` templates (`.pi/herdr-templates/{grunt,workhorse,peer}.md`) MUST contain only YAML frontmatter (`description` and `command`) with empty body text, delegating runtime role instructions to `hc-delegation.ts`.
