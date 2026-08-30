# Capability: fusion-harness-integration

## Purpose

Register and operate the nantas fusion-harness Pi package for multi-model orchestration (`/opinion`, `/fusion`, `/auto-validate`), with project-local artifact persistence, sub-agent context inheritance, and global capability-table delivery of the unpinned package source plus `fusionHarness` defaults.

## Requirements

### Requirement: Extension Registration
The system SHALL register the fusion-harness extension as a Pi package in pi-config’s capability delivery surfaces, making `/opinion`, `/fusion`, and `/auto-validate` available without requiring `-e` or shell scripts. Global registration SHALL use the unpinned git package source in `global.settings.packages`. Project `.pi/settings.json` MAY still list the package until global sync dedupe removes a duplicate entry.

#### Scenario: Global registration source is unpinned git URL
- **WHEN** global registration is configured in the capability table
- **THEN** the package source SHALL be `git:github.com/nantas/fusion-harness`

#### Scenario: Project-only registration is no longer the sole delivery path
- **WHEN** capability-table apply for global delivery is complete
- **THEN** fusion-harness delivery SHALL be declared at global manifest scope
- **AND** relying solely on project `.pi/settings.json` without a capability-table entry SHALL be considered incomplete for cross-repository availability

#### Scenario: Extension loaded via fork with local modifications
- **WHEN** the package source is a local dev path during development
- **THEN** `/reload` in Pi TUI SHALL pick up code changes from the dev clone without requiring `pi install -l` or git push

### Requirement: Settings Configuration Block
The system SHALL support a `fusionHarness` configuration block that provides default values for architect model, builder model, architect thinking level, builder thinking level, and a `childExtensions` list declaring which installed extensions must be injected into child processes launched with `--no-extensions`.

For cross-repository defaults, the block SHALL be present under `.pi/capabilities.yaml` `global.settings.fusionHarness` with the values defined in **Global FusionHarness Defaults**. Project `.pi/settings.json` MAY retain a `fusionHarness` block as a local preference surface. CLI flags override settings; missing settings fall back to extension built-in defaults. The `childExtensions` default SHALL be `["pi-xai"]` at the global capability-table level (so that the grok-build provider works out-of-box for users who have pi-xai installed), and an empty array `[]` at the fork's built-in default (so users without pi-xai are unaffected).

#### Scenario: Global settings.json provides model defaults after deferred sync
- **GIVEN** an operator has later synced the capability table to `~/.pi/agent/settings.json`
- **WHEN** no `--architect` or `--builder` CLI flags are provided and no project override wins
- **THEN** the extension SHALL use the global `fusionHarness` values as settings defaults

#### Scenario: CLI flags override settings
- **GIVEN** settings provide an architect model
- **WHEN** `--architect <provider/model>` is passed
- **THEN** the CLI flag value SHALL take precedence over settings

#### Scenario: Missing settings block falls back to upstream defaults
- **GIVEN** no `fusionHarness` block is available in loaded settings
- **WHEN** no CLI flags are provided
- **THEN** the extension SHALL use its built-in defaults (upstream DEFAULT_ARCHITECT / DEFAULT_BUILDER)

#### Scenario: Capability-table apply does not require live global settings mutation
- **WHEN** global delivery is applied only in the capability table
- **THEN** writing `global.settings.fusionHarness` into `.pi/capabilities.yaml` SHALL satisfy the configuration-block delivery requirement for that apply
- **AND** live mutation of `~/.pi/agent/settings.json` MAY remain deferred until managed sync

#### Scenario: childExtensions defaults to empty at fork level
- **GIVEN** a `fusionHarness` block exists but has no `childExtensions` key
- **WHEN** child processes are spawned
- **THEN** no extensions SHALL be injected (behavior identical to pre-change), unless a global/project setting provides the list

#### Scenario: childExtensions global default includes pi-xai
- **WHEN** the capability table apply for global delivery is complete
- **THEN** `.pi/capabilities.yaml` `global.settings.fusionHarness.childExtensions` SHALL equal `["pi-xai"]`
- **AND** projects that inherit this default and have pi-xai installed SHALL get grok-build provider injection automatically

### Requirement: Global Package Delivery Via Capability Manifest
The system SHALL deliver fusion-harness as a global Pi package by listing `git:github.com/nantas/fusion-harness` (unpinned) in `.pi/capabilities.yaml` `global.settings.packages`, so that after an operator later runs the managed global sync, `~/.pi/agent/settings.json` includes that package and any repository session under the same global agent home can load the extension without a project-local package entry.

#### Scenario: Capability table declares global package source
- **WHEN** the capability table apply for global delivery is complete
- **THEN** `.pi/capabilities.yaml` `global.settings.packages` SHALL include `git:github.com/nantas/fusion-harness`
- **AND** the entry SHALL NOT include a version pin fragment

#### Scenario: Global sync is intentionally deferred
- **WHEN** capability-table apply tasks finish without running sync
- **THEN** absence of fusion-harness in `~/.pi/agent/settings.json` SHALL NOT fail verification of the capability-table work
- **AND** verification MAY record “sync deferred” as expected status

### Requirement: Global FusionHarness Defaults
The system SHALL publish default architect/builder model settings for fusion-harness through `.pi/capabilities.yaml` `global.settings.fusionHarness` with:
- `architect`: `kimi-coding/k3`
- `builder`: `grok-build/grok-4.5`
- `architectThinking`: `high`
- `builderThinking`: `high`

These values become the authoritative global defaults once global sync is later run. CLI flags and any later project-level settings continue to follow the existing override order defined by the extension (CLI > settings > built-in defaults).

#### Scenario: Manifest defaults match agreed sovereign stack
- **WHEN** `global.settings.fusionHarness` is read from the capability table after apply
- **THEN** the four keys SHALL equal the values listed above

#### Scenario: Extension still works if global block not yet synced
- **GIVEN** only the capability table was updated and global sync has not run
- **WHEN** a project still has a local `fusionHarness` block or the extension falls back to built-in defaults
- **THEN** project-local behavior SHALL remain usable independently of global runtime

### Requirement: Artifact Persistence
The system SHALL store fusion harness run artifacts in `.scratch/fusion-harness/` within the session's working directory, instead of `/tmp/`, and SHALL treat that tree as the sole lifecycle scope of `/fusion-housekeep` (run directories only; session cache excluded).

#### Scenario: Artifacts persist across sessions
- **WHEN** a `/fusion` or `/auto-validate` command completes
- **THEN** intermediate artifacts (agent outputs, gate scripts, gate run logs) SHALL be written under `<cwd>/.scratch/fusion-harness/<run-id>/`

#### Scenario: Session data follows artifacts root
- **WHEN** persistent role sessions are stored
- **THEN** they SHALL use `ARTIFACT_ROOT/fusion-harness-sessions/<project-slug>/` rather than `/tmp/fusion-harness-sessions/`

#### Scenario: Housekeep does not manage session cache
- **WHEN** the user runs any `/fusion-housekeep` subcommand or housekeep tools
- **THEN** the system SHALL NOT delete or archive `fusion-harness-sessions/` contents as part of status, archive, or clean

### Requirement: Sub-agent Context Inheritance
The system SHALL allow child agents (ARCHITECT worker, BUILDER worker, FUSION, VALIDATOR, TRIAGE) to inherit the repository's skills and context files while preventing recursive extension loading.

#### Scenario: Child agent inherits skills and AGENTS.md
- **WHEN** a child agent is spawned for any fusion harness command
- **THEN** it SHALL be launched with skills and context files enabled (no `--no-skills` or `--no-context-files` flags)

#### Scenario: Child agent does not load extensions recursively
- **WHEN** a child agent is spawned
- **THEN** it SHALL be launched with `--no-extensions` to prevent fusion-harness from spawning child agents that spawn more child agents

#### Scenario: Child agent loaded via fork hosts no extraneous extensions
- **GIVEN** the fork modifies the upstream spawn to remove `--no-skills` and `--no-context-files`
- **WHEN** the fork is in development mode (local path)
- **THEN** `/reload` in Pi SHALL NOT cause recursive extension loading

### Requirement: FUSION Agent Output Path Compliance
The system SHALL instruct the FUSION agent to write all outputs to the run's artifacts directory, not to `/tmp/`.

#### Scenario: FUSION prompt specifies correct output path
- **WHEN** the FUSION merge prompt is constructed
- **THEN** it SHALL contain an explicit instruction to write all artifacts under `{{ARTIFACTS_DIR}}` rather than `/tmp`

#### Scenario: No contradictory path instructions
- **WHEN** the FUSION merge prompt template is rendered
- **THEN** it SHALL NOT contain any instruction suggesting `/tmp` as a default output location

### Requirement: Run Index Dual-Write
The system SHALL maintain a run index file at `<cwd>/.scratch/fusion-harness/run-index.jsonl` by upserting a JSON line when `/opinion`, `/fusion`, or `/auto-validate` completes with an artifacts directory (including partial failure paths), and by reconciling that index against on-disk `fusion-harness-*` run directories when housekeep tools or `/fusion-housekeep` subcommands run.

For `/fusion` runs executed in merge-only mode, the index record SHALL additionally record `mode: "merge-only"` and `sourceDir` (the directory whose `architect.md`/`builder.md` were reused), so that the lineage between a merge-only fusion and its source opinion/fusion run is queryable.

#### Scenario: Command completion indexes the run
- **WHEN** `/opinion`, `/fusion`, or `/auto-validate` finishes and has created an artifacts run directory under `ARTIFACT_ROOT`
- **THEN** the extension SHALL upsert one index record that at least includes `ts`, `command`, `ok`, `dir`, and available cost/duration fields

#### Scenario: Merge-only run records lineage
- **WHEN** a `/fusion` merge-only run completes
- **THEN** the index record SHALL include `mode: "merge-only"` and `sourceDir` pointing at the reused run directory
- **AND** the record's cost/duration SHALL reflect only the fuser stage (not the skipped workers)

#### Scenario: Reconcile discovers runs without summary
- **WHEN** reconcile scans a run directory without `summary.json`
- **THEN** the system SHALL still create or keep an index row using directory mtime and basename (command/ok may be unknown or inferred)

### Requirement: Fusion Housekeep Command And Tools
The system SHALL register `/fusion-housekeep` and agent tools (`fusion_list_runs`, `fusion_run_inventory`, `fusion_archive_apply`) for run lifecycle management without spawning a child pi agent for housekeep itself.

#### Scenario: Status lists runs after reconcile
- **WHEN** the user runs `/fusion-housekeep status`
- **THEN** the command SHALL reconcile the index and display each known run with command (or unknown), ok, topic when available, cost if known, archived flag, and directory identity

#### Scenario: Archive is agent-driven
- **WHEN** the user runs `/fusion-housekeep` with no args or `archive`
- **THEN** the extension SHALL inject an agent workflow prompt (not a script "re-run with id" menu) so the agent lists runs, interacts with the user, and applies copies only after confirmation via tools

#### Scenario: Empty artifact root is non-fatal
- **WHEN** `ARTIFACT_ROOT` does not exist or contains no run directories
- **THEN** status/list tools SHALL report that there are no runs and SHALL NOT throw

### Requirement: Archive High-Value Artifacts
The system SHALL support archiving high-value run files to project paths, recording destinations on the index row, and marking the run archived without deleting the run directory.

#### Scenario: Default high-value file set
- **WHEN** inventory classifies high-value candidates
- **THEN** defaults SHALL include `fused-report*.md` and `gate.py` at the run root, and SHALL NOT treat `fused.md` as high-value by default

#### Scenario: Apply after confirmation
- **WHEN** the agent calls `fusion_archive_apply` (or equivalent apply mapping) with user-confirmed source→destination mappings
- **THEN** the system SHALL copy those files, set the index row `archived` to true with `copied` records, and leave the run directory on disk

### Requirement: Clean Run Directories
The system SHALL support `/fusion-housekeep clean` that deletes whole run directories under `ARTIFACT_ROOT`, retaining the most recent N runs by default (N = 3), after reconcile.

#### Scenario: Default retain last three runs
- **WHEN** the user runs `/fusion-housekeep clean` with no retention override
- **THEN** the command SHALL plan to delete all but the three most recent run directories and SHALL NOT delete `fusion-harness-sessions`

#### Scenario: High-value unarchived confirmation
- **WHEN** the planned delete set includes at least one run that is not archived and still contains a default high-value file
- **THEN** the command SHALL list those paths, request a single user confirmation, and only delete if confirmed

#### Scenario: Clean removes whole directory
- **WHEN** clean proceeds after any required confirmation
- **THEN** each selected run directory SHALL be removed entirely, and the index SHALL drop those rows on the next reconcile

### Requirement: Fusion Merge-Only Mode
The system SHALL support a merge-only invocation of `/fusion` that skips Stage 1 (the parallel ARCHITECT+BUILDER worker execution) and feeds an existing run's two answer files directly to the fuser. The purpose is to avoid paying worker token/time cost a second time when the two answers for the same topic already exist from a prior `/opinion` or `/fusion` run.

The fuser invocation in merge-only mode SHALL reuse the existing `fuserPrompt` construction and `USER_PROMPT_FUSION_MERGE.md` template unchanged — only the source of the two answers changes (read from a specified directory instead of produced by Stage 1).

#### Scenario: Merge-only via flag pointing to an existing run directory
- **WHEN** the user invokes `/fusion` with a merge-only flag and a path to an existing run directory that contains both `architect.md` and `builder.md` as successful worker outputs
- **THEN** the system SHALL NOT spawn ARCHITECT or BUILDER workers
- **AND** the system SHALL read those two files and feed them to a fresh FUSION agent with the same merge prompt template used by normal `/fusion`
- **AND** the system SHALL produce `fused.md` (and any named `fused-report-*.md`) under a new run's artifacts directory

#### Scenario: Merge-only with explicit fusion instruction
- **WHEN** merge-only mode is invoked together with a fusion instruction argument
- **THEN** the fusion instruction SHALL be forwarded to the fuser prompt identically to normal `/fusion`, overriding the default fusion prompt

#### Scenario: Merge-only result attribution records source run
- **WHEN** a merge-only run completes
- **THEN** the run's `summary.json` SHALL record `mode: "merge-only"` and the resolved source run directory (`sourceDir`) containing the reused answers
- **AND** the banner/panel rendered to the user SHALL visually distinguish merge-only from a normal two-stage fusion (e.g., explicit "MERGE-ONLY · source: <dir>" label, no worker cost/duration attributed to this run beyond the fuser's)

#### Scenario: Normal fusion is unchanged when no merge flag is present
- **WHEN** `/fusion` is invoked without the merge-only flag
- **THEN** the system SHALL execute the normal two-stage flow (Stage 1 parallel workers → Stage 2 fuser) with behavior identical to before this change

#### Scenario: Merge-only refuses missing worker files
- **WHEN** merge-only mode is invoked but the source directory lacks `architect.md` or `builder.md` (or either file is absent)
- **THEN** the system SHALL fail fast with a clear error naming the missing file and the resolved directory, and SHALL NOT silently fall back to running Stage 1

#### Scenario: Merge-only refuses FAILED worker outputs
- **WHEN** merge-only mode is invoked but one of the two answer files contains a FAILED marker (i.e., the prior worker did not succeed and the file holds `FAILED: <error>`)
- **THEN** the system SHALL fail fast with a clear error identifying which role's output failed in the source run, because fusion requires two successful inputs (mirroring the normal `/fusion` guard that skips fusion when either worker fails)

#### Scenario: Merge-only does not mutate the source run directory
- **WHEN** a merge-only run is in progress or completed
- **THEN** the system SHALL treat the source run directory as read-only and SHALL write all of its own outputs (fused artifacts, summary, index entry) under a NEW run's artifacts directory distinct from the source

### Requirement: Fusion Merge Agent Tool
The system SHALL register a `fusion_merge` agent tool that allows the host agent to execute a merge-only fusion via tool call (rather than requiring the user to type the `/fusion --merge-existing` slash command). This removes the burden of manually looking up a run id and assembling the slash-command arguments — the host agent (an LLM) resolves the user's natural-language intent, identifies the target run (optionally via `fusion_list_runs`), and invokes `fusion_merge`.

The tool SHALL reuse the same merge logic as `/fusion --merge-existing` (`loadMergeSource` + `runChild` fuser spawn), factored as a shared internal function so slash command and tool stay behavior-identical. The tool does NOT render live panels (panels are a TUI slash-command affordance); it returns the merge result as text to the agent.

#### Scenario: Agent invokes fusion_merge with a valid run dir
- **WHEN** the host agent calls `fusion_merge` with a `runDir` that resolves to an existing run containing successful `architect.md` + `builder.md`
- **THEN** the system SHALL spawn a fuser child agent (skip Stage 1), produce `fused.md` under a new run's artifacts directory, and return to the agent a result object containing at least `ok`, `fusedPath`, `sourceDir`, `mode: "merge-only"`, and a short content summary of the fused output

#### Scenario: fusion_merge with optional instruction
- **WHEN** `fusion_merge` is called with an `instruction` parameter
- **THEN** that instruction SHALL be forwarded to the fuser prompt identically to `/fusion --merge-existing`, overriding the default fusion prompt

#### Scenario: fusion_merge validates inputs identically to slash command
- **WHEN** `fusion_merge` is called with a run dir that is missing `architect.md`/`builder.md` or contains a FAILED marker
- **THEN** the tool SHALL return an error result (not throw) with the same diagnostic message as the slash command's fail-fast path, so the host agent can surface it to the user

#### Scenario: fused result enables downstream workflow
- **WHEN** `fusion_merge` returns successfully
- **THEN** the returned `fusedPath` SHALL point at a real on-disk file the host agent can `read` in subsequent turns, enabling the natural workflow of "merge → discuss result → act on it" without the user manually copying paths

### Requirement: Child Extension Injection
The system SHALL support injecting a configured set of extensions into fusion-harness child processes (ARCHITECT/BUILDER/FUSION/VALIDATOR), so that extensions that dynamically register providers (e.g., pi-xai registering the `grok-build` provider) remain functional inside children launched with `--no-extensions`.

The injection SHALL be driven by a `fusionHarness.childExtensions` setting (a list of package identifiers). For each identifier, the system SHALL resolve it to an installed extension entry path from the project-level and global settings packages, then append `-e <entry-path>` to the child's spawn arguments AFTER `--no-extensions`.

Extensions not found in installed packages, whose install directory does not exist, or whose `package.json` entry point cannot be resolved SHALL be silently skipped (no error, no spawn block) — a missing optional extension must never prevent a fusion run.

#### Scenario: Configured extension is injected into child spawn
- **WHEN** `fusionHarness.childExtensions` contains `"pi-xai"` AND `pi-xai` is installed (appears in project or global settings packages)
- **THEN** every child process spawned by runChild SHALL receive `-e <pi-xai-entry-path>` after `--no-extensions`
- **AND** the child process SHALL have the `grok-build` provider registered (via pi-xai's `api.registerProvider` call)
- **AND** a child spawned with `--model grok-build/grok-4.5` SHALL resolve the model successfully

#### Scenario: Empty or absent childExtensions changes nothing
- **WHEN** `fusionHarness.childExtensions` is absent, empty, or `[]`
- **THEN** child spawn arguments SHALL be identical to before this change (only `--no-extensions`, no `-e` injection)

#### Scenario: Configured extension not installed is skipped
- **WHEN** `fusionHarness.childExtensions` contains an identifier that matches no installed package in project or global settings
- **THEN** the system SHALL skip that identifier silently (no `-e` argument added for it)
- **AND** the spawn SHALL proceed normally with any other resolved extensions
- **AND** no error SHALL be raised to the user

#### Scenario: Extension entry path resolution uses package.json
- **WHEN** resolving an installed extension's entry path
- **THEN** the system SHALL read the extension's `package.json` and use `pi.extensions[0]` if present, otherwise `main`
- **AND** the resolved entry path SHALL be absolute and SHALL exist on disk before being passed to `-e`

#### Scenario: Injection applies to all child agent roles
- **WHEN** any child agent (ARCHITECT worker, BUILDER worker, FUSION, VALIDATOR, TRIAGE) is spawned
- **THEN** the `-e` injection SHALL apply uniformly — no role is exempt, because provider registration is needed by any role that may use a non-built-in provider model

### Requirement: Footer Builder Model Display
The system SHALL display the configured builder model in the status bar's BUILDER cell when no builder child is running, except when the host's current model equals the configured builder model (the launch-recipe scenario where the host IS the builder brain). This prevents the footer from showing a host-chosen model that differs from the model actual builder children use.

Note: this is a display-only concern. Actual builder children always receive `--model <builderModel()>`, which takes precedence over any forked session's saved model — the execution layer is unaffected.

#### Scenario: Host model differs from configured builder
- **WHEN** no builder child is running AND the host session's current model differs from `fusionSettings().builder`
- **THEN** the BUILDER footer cell SHALL display `builderModel()` (the configured builder), not the host's current model

#### Scenario: Host model matches configured builder (launch-recipe scenario)
- **WHEN** no builder child is running AND the host session's current model equals `fusionSettings().builder`
- **THEN** the BUILDER footer cell SHALL display the host's current model (preserving the original launch-recipe behavior where the host IS the builder brain)

#### Scenario: Builder child running shows the child's actual model
- **WHEN** a builder child is running
- **THEN** the BUILDER footer cell SHALL display that child's actual model (unchanged — the cell already reflected the live child)

### Requirement: Boot Banner Context Hygiene
The fusion-harness extension SHALL NOT inject non-semantic decorative text into the LLM conversation context, and SHALL NOT emit message content shapes that any pi protocol serializer forwards as an empty text block. Specifically, the `kind: "boot"` banner message emitted on TUI session startup (`session_start` with `reason === "startup"` and `ctx.mode === "tui"`) SHALL carry an **empty array** (`[]`) as its message `content`, because pi's `convertToLlm` unconditionally converts any string `CustomMessage.content` — including the empty string — into a `role: "user"` message with a single empty text block, which OpenAI-compatible backends (e.g., Zhipu's coding endpoint, error 1210) reject when the request also carries tool-call/tool-result sequences; every pi protocol serializer (openai-completions, openai-responses, anthropic-messages, google-generative-ai) skips messages whose content array is empty, so an empty array guarantees the banner never enters the request body on any protocol.

Rationale: the v0.2.4 approach (empty string) stopped the context leak for human-readable text but still produced a `role: "user"` message containing `[{"type":"text","text":""}]`. Zhipu's parameter validation rejects that empty text block whenever the request contains tool_calls/tool-result history (empirically reproduced via local recording proxy + session replay: requests with the empty-string boot message and a tool sequence fail with 1210; identical requests without it succeed). The boot banner's renderer reads only `details`, so content shape changes have zero display impact. The context-hygiene intent of the original requirement is preserved and strengthened: the banner is now invisible to every protocol serializer, not just textually empty.

#### Scenario: Boot banner content is an empty array
- **WHEN** the extension emits the `kind: "boot"` banner message on TUI session startup
- **THEN** the message's `content` field SHALL be the empty array `[]`, not the empty string `""`

#### Scenario: Empty banner message is skipped by all protocol serializers
- **WHEN** pi serializes a conversation containing the boot banner message into an API request for any supported protocol (openai-completions, openai-responses, anthropic-messages, google-generative-ai)
- **THEN** the serialized request body SHALL NOT contain any message with an empty text block originating from the boot banner (the message is dropped entirely)

#### Scenario: Tool-sequence requests on OpenAI-compatible backends succeed
- **WHEN** a TUI session that received the boot banner continues with a tool call (e.g., reading an image via the `read` tool) and the follow-up request is sent to an OpenAI-compatible backend (e.g., `zhipuai-coding-plan/glm-5.3-flash`)
- **THEN** the request SHALL be accepted without a `1210` parameter-validation error, and multimodal image content in tool results SHALL be unaffected

#### Scenario: Non-boot panels keep real text content
- **WHEN** the extension emits any other panel (opinion, fusion, duo, gate, validation, triage, error)
- **THEN** that message's `content` SHALL remain its actual text payload (truncated per existing limits) — the empty-array treatment applies only to messages whose content would otherwise be empty
