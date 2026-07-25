# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: grilling 收敛于单一 modified capability——`/fusion` 增加 merge-only 模式（复用已有 run 的两个 worker 答案，跳过 Stage 1 重跑，直接进 fuser merge）。链路 B（fused→后续工作流）确认为现有能力无需改动。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

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

## MODIFIED Requirements

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
