# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / 用户已确认
- 变更类型: `modified`
- 用户确认摘要: 单一 Modified Capability `fusion-harness-integration`，收紧 `/fusion` worker + fuser 产出契约，无新增 capability。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Fusion Worker Output Confinement

The `/fusion` worker agents (ARCHITECT, BUILDER) SHALL confine ALL file write operations (write, edit, and any workflow-driven publish phases) to the run's artifacts directory under `.scratch/fusion-harness/<run-id>/`, and SHALL NOT write to any repository canonical or business directory — including paths with role/model identity embedded into the slug.

When the worker is running under a skill or workflow that instructs it to publish to a repository-relative path, the worker SHALL relocate the path's root to `{{ARTIFACTS_DIR}}/{{ROLE}}/` while preserving every internal structure, filename, and slug exactly as the workflow defines them. Identity (role/model) SHALL live in the partition directory (`{{ROLE}}/`), nowhere else — never in filenames or directory slugs.

The worker SHALL complete the workflow fully (including publish phases such as a skill's Phase D/E), producing a complete workflow-shaped artifact tree mirrored under `{{ARTIFACTS_DIR}}/{{ROLE}}/`, rather than skipping publish phases or producing only a text answer.

#### Scenario: Worker relocates publish root instead of polluting canonical
- **GIVEN** a `/fusion` prompt invokes a publish-capable workflow (e.g. game-wiki-ingest) whose Phase D writes to `synthesis/digest/<slug>/`
- **WHEN** the worker reaches the publish phase
- **THEN** the worker SHALL write under `{{ARTIFACTS_DIR}}/{{ROLE}}/synthesis/digest/<slug>/` with the slug preserved verbatim (no role/model suffix)
- **AND** the repository path `synthesis/digest/<slug>/` (and any namespaced variant such as `synthesis/digest/<slug>-{{ROLE}}-<model>/`) SHALL remain untouched

#### Scenario: Worker embeds no identity into slugs or filenames
- **GIVEN** a workflow defines a canonical filename or directory slug
- **WHEN** the worker writes the artifact under its partition directory
- **THEN** the filename and slug SHALL match the workflow's definition exactly
- **AND** no role/model tag (e.g. `-ARCHITECT`, `-kimi-coding-k3`, `-BUILDER-grok-build`) SHALL appear in any path segment below `{{ROLE}}/`

#### Scenario: Cross-directory workflow output is uniformly relocated
- **GIVEN** a workflow publishes to multiple repository-relative roots (e.g. `synthesis/digest/` AND `synthesis/game-design-pattern/`)
- **WHEN** the worker writes each output
- **THEN** each path SHALL receive the same `{{ARTIFACTS_DIR}}/{{ROLE}}/` prefix independently
- **AND** the relative structure between them SHALL be preserved

#### Scenario: Worker runs publish phases rather than skipping them
- **GIVEN** the workflow defines publish phases (Phase D, Phase E, etc.)
- **WHEN** the worker executes under fusion mode
- **THEN** the worker SHALL execute those phases (relocated per the rule above) rather than omitting them
- **AND** the worker's partition directory SHALL contain a complete workflow-shaped artifact tree, not a text answer alone

#### Scenario: Worker passes artifacts dir to enable relocation
- **GIVEN** the `/fusion` command spawns Stage 1 workers
- **WHEN** the worker prompt template is rendered
- **THEN** the template SHALL have access to the run's `{{ARTIFACTS_DIR}}` value (the same artifacts directory the command created)
- **AND** the path-rewrite rule SHALL reference `{{ARTIFACTS_DIR}}/{{ROLE}}/` as a concrete, non-placeholder prefix

### Requirement: Fusion Worker Prompt Override Contract

The worker prompt SHALL establish fusion-mode output confinement via a layered override that supersedes any skill or workflow instruction to publish to the repository:

1. **Priority declaration (imperative)**: the prompt SHALL state that fusion mode overrides skill/workflow publish-location instructions — the publish target is relocated, not removed — and that the worker still runs the workflow fully.
2. **Path-rewrite rule (declarative)**: the prompt SHALL specify that every repository-relative path assigned by a skill or instruction is rewritten by prepending `{{ARTIFACTS_DIR}}/{{ROLE}}/`, with at least two concrete examples covering a nested directory and a bare file path.
3. **Slug purification**: the prompt SHALL forbid embedding role/model identity into filenames or directory slugs, stating that identity lives in the partition directory only.

The prompt SHALL NOT contain any language suggesting that a later agent (the fuser) will write the canonical deliverable on the worker's behalf — that suggestion creates a pass-the-baton loop in which no agent publishes to canonical and workers instead pollute the slug. The legacy "embed your identity in EVERY path" instruction is REMOVED in favor of the partition-directory model.

#### Scenario: Worker prompt declares fusion-mode priority over skill publish instructions
- **WHEN** the worker prompt template is rendered for a `/fusion` run
- **THEN** the prompt SHALL contain an imperative statement that fusion mode relocates publish targets named by any skill/workflow, and that the workflow is still executed fully
- **AND** the prompt SHALL NOT defer canonical publication to the fuser

#### Scenario: Worker prompt provides a concrete path-rewrite rule with examples
- **WHEN** the worker prompt template is rendered
- **THEN** the prompt SHALL state the prefix `{{ARTIFACTS_DIR}}/{{ROLE}}/` prepended to any repository-relative path
- **AND** SHALL include at least one example of a nested directory relocation and one example of a bare-file relocation
- **AND** SHALL instruct the worker to preserve internal structure, filenames, and slugs exactly

#### Scenario: Legacy identity-in-every-path instruction is removed
- **WHEN** the worker prompt template is rendered
- **THEN** the prompt SHALL NOT instruct the worker to embed its role/model identity into every created path
- **AND** identity SHALL be confined to the partition directory name only

### Requirement: Fusion Output Boundary Statement

The `/fusion` command's worker and fuser prompts SHALL carry an explicit, shared output-boundary statement declaring that the entire `/fusion` run (both Stage 1 workers and the Stage 2 fuser) produces NO canonical/repository-published artifact whatsoever, and that all deliverables live under `.scratch/fusion-harness/<run-id>/`. Official publication of any artifact to the repository is an action that occurs AFTER the fusion run, performed by a human or an authorized agent acting on the run's outputs — never as part of the run itself.

This statement SHALL be consistent between worker and fuser prompts so that no agent in the run is led to believe another agent will publish to canonical on its behalf.

#### Scenario: Worker prompt states the output boundary
- **WHEN** the worker prompt template is rendered
- **THEN** the prompt SHALL state that the `/fusion` run produces no canonical artifact and that all outputs are confined to the run's artifacts directory
- **AND** SHALL state that publication to the repository happens outside the run

#### Scenario: Fuser prompt states the output boundary consistently
- **WHEN** the fuser merge prompt template is rendered
- **THEN** the prompt SHALL carry the same output-boundary statement as the worker prompt
- **AND** SHALL reinforce that the fuser writes only under `{{ARTIFACTS_DIR}}`

### Requirement: Fusion Report Contains Publish Manifest

The fuser's merged report (`fused.md` and any `fused-answer-*.md`) SHALL include a dedicated section that inventories both workers' artifact trees and provides a promote recommendation, so a human or authorized agent can publish a chosen tree to canonical with zero path rewriting.

The inventory SHALL enumerate, for each worker partition (`{{ROLE}}/`), the repository-relative paths of all produced artifacts (i.e. the path minus the `{{ARTIFACTS_DIR}}/{{ROLE}}/` prefix, which is exactly where they would land if promoted). The promote recommendation SHALL give per-tree or per-artifact guidance on which worker's output to prefer and why, drawing on the fuser's consensus/divergence analysis.

This requirement does NOT mandate a machine-parseable schema — a stable Markdown section suffices. It exists so that the act of choosing which worker's tree to promote is informed by the fusion analysis, and so that promotion is a pure relocation (prefix stripping) rather than a re-derivation.

#### Scenario: Fused report inventories both worker trees
- **WHEN** the fuser produces its merged report and at least one worker partition contains a non-empty artifact tree
- **THEN** the report SHALL include a section listing the repository-relative paths of artifacts in each worker partition
- **AND** the section SHALL distinguish the ARCHITECT partition from the BUILDER partition

#### Scenario: Fused report provides promote recommendation
- **WHEN** the fuser produces its merged report and the two worker trees are not identical
- **THEN** the report SHALL include promote guidance stating which worker's output (or which per-artifact mix) the fuser recommends publishing
- **AND** the guidance SHALL reference the fuser's consensus/divergence analysis as the basis for the recommendation

#### Scenario: Inventory reflects cross-directory outputs
- **GIVEN** a worker published to multiple repository-relative roots (e.g. `synthesis/digest/` and `synthesis/game-design-pattern/`)
- **WHEN** the inventory is rendered
- **THEN** both roots SHALL appear in the inventory for that worker partition
- **AND** the promote guidance SHALL address each root

### Requirement: Non-Regression For Pure-Analysis Fusion Calls

The new output-confinement contract SHALL NOT alter the behavior of `/fusion` invocations whose prompt does not invoke a publish-capable workflow (i.e. pure analysis, research, technical tradeoff, or documentation-drafting requests). Such calls historically produce only text answers in the artifacts directory and never write to the repository; the confinement contract formalizes this as the default and adds no new constraint for them.

#### Scenario: Pure-analysis call behavior is unchanged
- **GIVEN** a `/fusion` prompt that does not instruct the worker to publish to any repository path
- **WHEN** the worker executes under the new contract
- **THEN** the worker SHALL produce a text answer written to `{{ARTIFACTS_DIR}}/{{ROLE}}.md` (or a partitioned location) as before
- **AND** SHALL NOT create a partition-directory artifact tree (none is expected)
- **AND** the fuser SHALL produce `fused.md` with consensus/divergence as before, and the publish-manifest section MAY be empty/omitted when no worker produced a tree
