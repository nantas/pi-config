# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / grilling 边界表 + `/opsx-propose` 确认
- 变更类型: modified
- 用户确认摘要: 扩展既有 capability，新增 run 索引与 `/fusion-housekeep`（status/archive/clean）；不新开 capability；OUT 含管道、语义 gate、sessions、自动清理

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件
- 既有主 spec（`openspec/specs/fusion-harness-integration/spec.md`）中未在此 MODIFIED/REMOVED 的 requirement 保持有效

## ADDED Requirements

### Requirement: Run Index Dual-Write
The system SHALL maintain a run index file at `<cwd>/.scratch/fusion-harness/run-index.jsonl` by appending one JSON line when `/opinion`, `/fusion`, or `/auto-validate` completes successfully enough to have an artifacts directory, and by reconciling that index against on-disk `fusion-harness-*` run directories when any `/fusion-housekeep` subcommand starts.

#### Scenario: Command completion appends index line
- **WHEN** `/opinion`, `/fusion`, or `/auto-validate` finishes and has created an artifacts run directory under `ARTIFACT_ROOT`
- **THEN** the extension SHALL append one JSONL record that at least includes `ts`, `command`, `ok`, `dir` (run directory basename), and available cost/duration fields from that run's summary

#### Scenario: Housekeep entry reconciles index with directories
- **WHEN** the user invokes `/fusion-housekeep` with any subcommand
- **THEN** the extension SHALL scan `ARTIFACT_ROOT` for `fusion-harness-*` run directories (excluding `fusion-harness-sessions`), upsert missing index rows from directory/`summary.json` evidence, and align index rows for directories that no longer exist

#### Scenario: Missing summary still yields a usable index row
- **WHEN** reconcile discovers a run directory without `summary.json`
- **THEN** the extension SHALL still create or keep an index row using directory mtime and basename, with `command`/`ok` left unknown or inferred only if unambiguous from filenames

### Requirement: Fusion Housekeep Command
The system SHALL register a slash command `/fusion-housekeep` on the fusion-harness extension that routes to `status`, `archive`, and `clean` without spawning a child pi agent.

#### Scenario: Status lists runs after reconcile
- **WHEN** the user runs `/fusion-housekeep status`
- **THEN** the command SHALL reconcile the index and display each known run with at least command (or unknown), ok, relative time or ts, cost if known, archived flag, and directory basename

#### Scenario: Empty artifact root is non-fatal
- **WHEN** `ARTIFACT_ROOT` does not exist or contains no run directories
- **THEN** `/fusion-housekeep status` SHALL report that there are no runs and SHALL NOT throw

#### Scenario: Unknown subcommand shows usage
- **WHEN** the user runs `/fusion-housekeep` with no args or an unknown subcommand
- **THEN** the command SHALL show brief usage for `status`, `archive`, and `clean`

### Requirement: Archive High-Value Artifacts
The system SHALL support `/fusion-housekeep archive` that copies high-value files out of a selected run directory, records destination paths on the index row, and marks that run as archived without deleting the run directory.

#### Scenario: High-value file set
- **WHEN** archive inspects a run directory
- **THEN** high-value candidates SHALL be files matching `fused-report*.md`, `fused.md`, and `gate.py` at the run directory root

#### Scenario: Per-file destination prompt
- **WHEN** archive proceeds on a selected run that has one or more high-value files
- **THEN** for each such file the command SHALL prompt for a destination path (skippable) via the Pi UI input API and copy only non-skipped files

#### Scenario: Archive marks index without deleting source
- **WHEN** archive completes for a run (including the case where every file was skipped)
- **THEN** the index row for that run SHALL set `archived` to true (and record any successful `copied` mappings), and the run directory SHALL remain on disk for later clean

#### Scenario: Archive selection when dir arg omitted
- **WHEN** the user runs `/fusion-housekeep archive` without a directory argument and multiple runs exist
- **THEN** the command SHALL present a choosable list (or equivalent selection UX) of runs from the reconciled index

### Requirement: Clean Run Directories
The system SHALL support `/fusion-housekeep clean` that deletes whole run directories under `ARTIFACT_ROOT`, retaining the most recent N runs by default (N = 3), after reconcile.

#### Scenario: Default retain last three runs
- **WHEN** the user runs `/fusion-housekeep clean` with no retention override
- **THEN** the command SHALL plan to delete all but the three most recent run directories (newest by index `ts` or directory mtime) and SHALL NOT delete `fusion-harness-sessions`

#### Scenario: Agent-driven retention override
- **WHEN** clean is invoked with an explicit keep count or an all-delete intent (implementation may accept parameters; end users are not required to memorize flags)
- **THEN** the command SHALL use that retention policy instead of the default keep-3

#### Scenario: High-value unarchived confirmation
- **WHEN** the planned delete set includes at least one run that is not archived and still contains a high-value file
- **THEN** the command SHALL list those high-value unarchived paths, request a single user confirmation, and only delete if confirmed; if not confirmed, the command SHALL abort without deleting any run in that invocation

#### Scenario: Archived or non-high-value runs do not need the special confirm
- **WHEN** a run in the delete set is archived or contains no high-value files
- **THEN** that run SHALL not by itself trigger the high-value confirmation (confirmation triggers only if any planned delete run is unarchived and high-value)

#### Scenario: Clean removes whole directory
- **WHEN** clean proceeds after any required confirmation
- **THEN** each selected run directory SHALL be removed entirely, and the index SHALL be updated to drop or mark those rows as gone on the next reconcile

## MODIFIED Requirements

### Requirement: Artifact Persistence
The system SHALL store fusion harness run artifacts in `.scratch/fusion-harness/` within the session's working directory, instead of `/tmp/`, and SHALL treat that tree as the sole lifecycle scope of `/fusion-housekeep` (run directories only; session cache excluded).

#### Scenario: Artifacts persist across sessions
- **WHEN** a `/fusion` or `/auto-validate` command completes
- **THEN** intermediate artifacts (agent outputs, gate scripts, gate run logs) SHALL be written under `<cwd>/.scratch/fusion-harness/<run-id>/`

#### Scenario: Session data follows artifacts root
- **WHEN** persistent role sessions are stored
- **THEN** they SHALL use `ARTIFACT_ROOT/fusion-harness-sessions/<project-slug>/` rather than `/tmp/fusion-harness-sessions/`

#### Scenario: Housekeep does not manage session cache
- **WHEN** the user runs any `/fusion-housekeep` subcommand
- **THEN** the command SHALL NOT delete or archive `fusion-harness-sessions/` contents as part of status, archive, or clean

## REMOVED Requirements

（无）

## RENAMED Requirements

（无）
