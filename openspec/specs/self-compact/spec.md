# self-compact

## Purpose

Provide agent-driven context compaction and structured handoff resumption for long-horizon tasks using three-tier percentage watermarks (`10%` notice / `20%` recommend / `30%` forced, 90% hard cap), TypeSafe Jev System One semantic boundary gating and dynamic cut-point selection, a six-field structured handoff contract, crash recovery, and coexistence with `SoL-Pi` observation reduction and `pi-powerline`.

## Requirements

### Requirement: Extension Self-Deduplication and Coexistence with SoL-Pi

The system SHALL prevent duplicate registration of `self-compact` when loaded from both global (`~/.pi/agent/extensions/self-compact/`) and project-local (`.pi/extensions/self-compact/`) paths, and SHALL decouple `SoL-Pi`'s online compaction from `self-compact`'s session compaction lifecycle.

#### Scenario: Dual global and project-local loading inside pi-config
- **WHEN** Pi loads both `~/.pi/agent/extensions/self-compact/index.ts` and `.pi/extensions/self-compact/index.ts` in the same process
- **THEN** the first loaded instance SHALL set a process-level marker on `globalThis[Symbol.for("pi.self-compact.loaded")]` and register all tools, commands, flags, and lifecycle hooks
- **THEN** the second loaded instance SHALL detect the marker and return immediately without registering duplicate tools, commands, flags, or event listeners

#### Scenario: SoL-Pi observation reduction preserved while online compaction is disabled
- **WHEN** `.pi/managed/sol-pi.json` is loaded by `SoL-Pi`
- **THEN** `onlineContextCompact` SHALL be `false` so `SoL-Pi` does not register `session_before_compact` or `agent_settled` compaction triggers
- **THEN** `actionFusion`, `observationPack` (`obs_recall`), and `evidencePreservingReducer` SHALL remain `true`

---

### Requirement: Three-Tier Percentage Watermark and Configuration Precedence

The system SHALL compute three monotonically increasing context watermarks (`soft` / Notice, `warning` / Recommend, and `forced` / Hard Cutoff) against the active model's `contextWindow`, supporting both percentage strings (default) and token count strings across a layered configuration hierarchy.

#### Scenario: Default percentage watermarks on a 1M context window
- **WHEN** no CLI flags or project overrides are provided and the active model has `contextWindow = 1,000,000`
- **THEN** the extension SHALL load defaults from `.pi/managed/self-compact.json` (`softAt: "10%"`, `at: "20%"`, `buffer: "10%"`)
- **THEN** it SHALL resolve `soft = 100,000` tokens (`10%`), `warning = 200,000` tokens (`20%`), and `forced = 300,000` tokens (`30%`)

#### Scenario: Hard ceiling clamp and ordering validation
- **WHEN** `at + buffer` exceeds `90%` of `contextWindow`
- **THEN** `forced` SHALL be clamped to `Math.floor(contextWindow * 0.90)`
- **WHEN** `soft > warning` or `warning >= forced`
- **THEN** threshold calculation SHALL throw a descriptive configuration error

#### Scenario: Configuration precedence order
- **WHEN** threshold or Jev settings are defined in multiple sources
- **THEN** the system SHALL resolve values in strict precedence: CLI flags (`--compact-soft-at`, `--compact-at`, `--compact-buffer`, `--compact-prompt`) > project config (`<cwd>/.pi/self-compact.json`) > global managed config (`~/.pi/agent/self-compact.json` or repo `.pi/managed/self-compact.json`) > built-in defaults

#### Scenario: Compaction material floor check
- **WHEN** `usedTokens` exceeds `soft` or `warning` on a small-window model, but the session entries since the last compaction do not exceed Pi's `keepRecentTokens` (default `20,000` tokens)
- **THEN** `hasCompactionMaterial` SHALL return `false` and the extension SHALL NOT prompt or lock the agent to compact until compressible history exists

---

### Requirement: Native Jev System One Semantic Boundary Gating

The system SHALL evaluate whether the agent is at a natural task boundary on `turn_end` using a built-in `JevClient` (`typesafe`, `openrouter`, or `mock` provider) when context usage lies within `[soft, forced)` and compaction material is available.

#### Scenario: Pre-Notice idle range skips Jev API calls
- **WHEN** `turn_end` fires and `usedTokens < soft` (or `hasCompactionMaterial` is `false`, or fewer than 2 user requests exist and no tools ran in the turn)
- **THEN** the extension SHALL NOT call Jev and SHALL keep the active prompt tier at `silent`

#### Scenario: Jev 4-question evaluation suppresses prompts during mid-operation
- **WHEN** `turn_end` fires with `soft <= usedTokens < forced` and compaction material is available
- **THEN** the extension SHALL query Jev with four typed questions on the current turn state (`current_request`, `previous_work`, `recent_turn`, `tools_this_turn`):
  1. `switched_gears` (`noul`): Has the user's current request moved on to a different topic or task from the previous work?
  2. `at_boundary` (`noul`): Did the assistant just finish a self-contained unit of work (e.g., tests passing, commit completed, final answer delivered)?
  3. `needs_history` (`score`: `low` / `medium` / `high`): How much does the next step depend on exact details from earlier turns?
  4. `mid_operation` (`noul`): Is the assistant in the middle of an unfinished multi-step operation (e.g., investigating a failure, half-way through edits)?
- **WHEN** `mid_operation > 0.6` OR neither `switched_gears > 0.6` nor (`at_boundary > 0.6` and `needs_history !== "high"`) holds
- **THEN** the extension SHALL set the prompt tier to `silent` and SHALL NOT inject a compaction reminder into the next turn's context

#### Scenario: Jev detects a task boundary in Notice or Recommend range
- **WHEN** `soft <= usedTokens < forced`, `mid_operation <= 0.6`, and either `switched_gears > 0.6` or (`at_boundary > 0.6` and `needs_history !== "high"`)
- **THEN** the extension SHALL set the prompt tier to `notice` (if `usedTokens < warning` and not already noticed in the current cycle) or `recommend` (if `usedTokens >= warning`)
- **THEN** on the next `context` hook, the extension SHALL append a transient user message containing the rendered Notice or Recommend prompt template along with Jev's diagnostic reason

#### Scenario: Jev API timeout or network failure fallback
- **WHEN** the Jev HTTP call times out (default `5,000ms` for `turn_end` gating) or returns a network/API error, or neither `TYPESAFE_API_KEY` nor `OPENROUTER_API_KEY` is set
- **THEN** the extension SHALL log a non-fatal diagnostic status and fall back to pure watermark gating (`notice` once per cycle when `>= soft`, `recommend` when `>= warning`) without failing the agent turn

---

### Requirement: Three-Tier Enforcement and Forced Tool Lock

The system SHALL enforce a hard tool execution lock once context usage reaches or exceeds `forced` (default `30%`) and compaction material exists.

#### Scenario: Forced threshold blocks non-compaction tools
- **WHEN** `usedTokens >= forced` and `hasCompactionMaterial` is `true` (or a `self_compact` handoff is already locked/pending)
- **AND** the agent invokes any tool other than `self_compact` or `view_context`
- **THEN** the `tool_call` hook SHALL return `{ block: true, reason: ... }` instructing the agent to immediately call `self_compact` with its structured handoff

#### Scenario: Parallel tool call batch mixed with self_compact is rejected
- **WHEN** the agent emits a single assistant message containing `self_compact` alongside any other tool call (e.g., `bash` or `edit`)
- **THEN** the `tool_call` hook SHALL block every tool call in that assistant message (including `self_compact`) and require `self_compact` to be called alone in the next turn

---

### Requirement: Dual Tool Contract (`view_context` and `self_compact`)

The system SHALL register `view_context` and `self_compact` tools for agent-driven inspection and structured handoff compaction.

#### Scenario: Agent inspects context and boundary status via `view_context`
- **WHEN** the agent calls `view_context({ check_boundary?: boolean })`
- **THEN** the tool SHALL return a formatted text and `details` payload containing `used_tokens`, `used_percent`, `cached_tokens`, `remaining_tokens`, `context_window`, `soft_tokens`/`soft_percent`, `warning_tokens`/`warning_percent`, `forced_tokens`/`forced_percent`, `remaining_to_forced`, and `cycle`
- **WHEN** `check_boundary` is `true` (or a cached Jev evaluation exists for the current turn)
- **THEN** the tool output SHALL include the Jev boundary assessment (`should_compact`, `tier`, `reason`, and probabilities)

#### Scenario: Agent submits structured handoff via `self_compact`
- **WHEN** the agent calls `self_compact` with parameters:
  - `goal: string` (non-empty)
  - `done: string[]`
  - `in_progress: string` (non-empty)
  - `decisions: string[]`
  - `preserved_refs: string[]` (file paths, symbols, and `SoL-Pi` `obs_xxx` observation IDs)
  - `next_action: string` (non-empty)
  - `note?: string` (optional freeform supplement)
- **THEN** the extension SHALL validate that `goal`, `in_progress`, and `next_action` are non-empty and that the total rendered Markdown Handoff Card does not exceed `NOTE_MAX_CHARS` (`24,000` characters)
- **THEN** the extension SHALL persist a `self-compact-state` entry with `phase: "pending"`, lock non-compaction tools, and return `{ terminate: true }` so the current turn ends immediately
- **WHEN** the agent settles (`agent_end`), the extension SHALL transition to `phase: "compacting"` and invoke `ctx.compact()`
- **WHEN** compaction completes, the extension SHALL transition to `phase: "done"` and call `pi.sendMessage({ customType: "self-compact-handoff", content: renderedHandoffCard, display: true }, { triggerTurn: true })` so the agent resumes immediately with its exact structured handoff

---

### Requirement: Dynamic Cut-Point Selection and Native Compaction Summary Augmentation

The system SHALL intercept `session_before_compact` to block unauthorized automatic compactions when locked, compute a dynamic turn cut-point (`live_from`) via Jev, and inject structured summarization instructions via `customInstructions`.

#### Scenario: Unauthorized automatic compaction while handoff is locked
- **WHEN** `session_before_compact` fires while `locked` is `true` and `compactionInFlight` is `false`
- **THEN** the hook SHALL return `{ cancel: true }` so Pi's built-in auto-compaction cannot bypass the pending `self_compact` handoff

#### Scenario: Jev selects dynamic `live_from` cut-point on multi-turn history
- **WHEN** compaction runs with at least 3 user turns in the current branch
- **THEN** the extension SHALL extract a concise `TurnSummary[]` (`id`, `request`, `reply`) and query Jev with:
  1. `has_completed_prefix` (`noul`): Are there earlier turns in this conversation whose work is finished or superseded so they only need a brief summary?
  2. `live_from` (`choice` over turn IDs): Which user turn starts the work that is still live and needed in detail?
- **WHEN** `has_completed_prefix > 0.5` and the chosen `live_from` turn is later than `turn_1` with option probability `>= 0.5`
- **THEN** the extension SHALL append a cut-point directive to `customInstructions` instructing the summarizer to condense turns before `live_from` to 1–2 sentences and preserve full technical detail (decisions, file paths, open questions, `obs_xxx` handles) from `live_from` onward

#### Scenario: Structured summary instructions without fragile prompt string replacement
- **WHEN** compaction runs for a `self_compact` handoff
- **THEN** the extension SHALL pass the structured summary template (`## Goal`, `## Constraints & Preferences`, `## Progress`, `## Key Decisions`, `## Next Steps`, `## Critical Context`, `<read-files>`, `<modified-files>`) and the rule `"The agent's own structured handoff card is delivered separately; do not duplicate it"` via `customInstructions` without replacing or parsing Pi's internal `<conversation>` prompt string

---

### Requirement: Persistent Compaction State Machine and Crash Recovery

The system SHALL persist compaction lifecycle transitions in `self-compact-state` custom session entries and recover deterministically across reloads, crashes, failed compactions, and `/tree` branch switches.

#### Scenario: Compaction landed on disk before process exit (`ready` recovery)
- **WHEN** `session_start` or `session_tree` runs and a `compaction` entry exists with no subsequent `self-compact-handoff` message for the active handoff
- **THEN** `recoverState` SHALL restore `phase: "ready"` and deliver the pending Handoff Card via `pi.sendMessage(..., { triggerTurn: true })`

#### Scenario: Handoff message was journaled before crash with no assistant reply (`resumed` recovery)
- **WHEN** `session_start` or `session_tree` runs and a `self-compact-handoff` custom message exists after the latest `compaction` entry with no subsequent assistant message
- **THEN** `recoverState` SHALL send a transient resume nudge (`[self-compact · resumed]`) and unlock the session (`phase: "done", locked: false`) so the agent continues from `next_action` without duplicating the handoff card

#### Scenario: Compaction interrupted or failed while locked (`pending` / `failed` retry)
- **WHEN** `ctx.compact()` fails or the session reloads while in `pending` or `compacting` phase without a landed `compaction` entry
- **THEN** the extension SHALL retry compaction up to `MAX_RETRIES = 2` times when idle, and if retries are exhausted, SHALL unlock the session, record `phase: "failed"`, and surface a warning so the user and agent are not permanently deadlocked

---

### Requirement: TUI Status Integration and Slash Commands

The system SHALL display compaction status via `ctx.ui.setStatus("self-compact", ...)` without calling `ctx.ui.setFooter()`, and SHALL register `/self-compact-info` and `/self-compact-now` commands.

#### Scenario: Coexistence with `pi-powerline` footer
- **WHEN** `self-compact` updates its TUI indicator on `session_start`, `turn_end`, `session_compact`, or `session_tree`
- **THEN** it SHALL call `ctx.ui.setStatus("self-compact", ...)` with a compact status string (showing usage percent, current tier, cycle count, and latest Jev gate verdict) and SHALL NEVER call `ctx.ui.setFooter()`

#### Scenario: User runs `/self-compact-info` or `/self-compact-now`
- **WHEN** the user runs `/self-compact-info`
- **THEN** the extension SHALL display a 20-cell ASCII/Unicode context bar (`#` cached, `=` used, `-` free, `~` soft, `!` warning, `|` forced), exact token/percentage thresholds, active Jev provider status, and the latest Jev boundary assessment
- **WHEN** the user runs `/self-compact-now`
- **THEN** the extension SHALL send a user message instructing the agent to immediately call `self_compact` with its structured handoff

---

### Requirement: Capability Manifest and Documentation Governance

The system SHALL register `self-compact` and its managed configuration in `.pi/capabilities.yaml` and update repository documentation to reflect the new capability.

#### Scenario: Manifest registration for global sync
- **WHEN** `.pi/capabilities.yaml` is inspected
- **THEN** `global.extensions` SHALL include `self-compact`
- **THEN** `global.files` SHALL include `self-compact.json: managed/self-compact.json`
- **THEN** `global.env` SHALL include a `self-compact` entry declaring `TYPESAFE_API_KEY` (`required: false`, with fallback note for `OPENROUTER_API_KEY`)
