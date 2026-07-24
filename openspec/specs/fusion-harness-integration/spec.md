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
The system SHALL support a `fusionHarness` configuration block that provides default values for architect model, builder model, architect thinking level, and builder thinking level. For cross-repository defaults, the block SHALL be present under `.pi/capabilities.yaml` `global.settings.fusionHarness` with the values defined in **Global FusionHarness Defaults**. Project `.pi/settings.json` MAY retain a `fusionHarness` block as a local preference surface for sessions that load project settings. CLI flags override settings; missing settings fall back to extension built-in defaults.

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

#### Scenario: Command completion indexes the run
- **WHEN** `/opinion`, `/fusion`, or `/auto-validate` finishes and has created an artifacts run directory under `ARTIFACT_ROOT`
- **THEN** the extension SHALL upsert one index record that at least includes `ts`, `command`, `ok`, `dir`, and available cost/duration fields

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

