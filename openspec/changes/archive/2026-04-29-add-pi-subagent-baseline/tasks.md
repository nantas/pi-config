# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 Review `pi-subagent-agent-contract` and confirm the v1 `.pi/agents/*.md` frontmatter fields, their source-of-truth role, and the rule that per-agent policy must not be split across `.pi/settings.json` or runtime overrides.
- [x] 1.2 Review `pi-subagent-dispatch-baseline` and confirm the repository-owned `dispatch` contract, the unified `tasks[]` input shape, and the normalized result shape with `runId` and `taskId`.
- [x] 1.3 Re-check `docs/plans/pi-customization-blueprint.md`, `docs/plans/pi-customization-reference.md`, `docs/pi-phase1-boundary.md`, and the current `.pi/settings.json` so the implementation extends the existing Phase 2 subagent direction without changing Phase 1 sync boundaries.

## 2. 核心实现任务

- [x] 2.1 Add a project-local orchestration extension under the managed `.pi/extensions/` layer that registers the repository-owned `dispatch` tool and becomes the formal subagent entrypoint for `pi-config`.
- [x] 2.2 Implement the agent contract resolver so `.pi/agents/*.md` is parsed as the only per-agent policy truth source for `name`, `description`, `systemPromptMode`, `tools`, `extensions`, `cwd`, `inheritProjectContext`, and `inheritSkills`.
- [x] 2.3 Revise the v1 `dispatch` contract so the user-facing entrypoint remains natural language, while the repository-owned tool accepts top-level `mode` plus `tasks[]` with the internal planning fields needed for real orchestration (`agent`, `task`, `projectContext`, `context`, `skills`, `reads`, `model`, `cwd`) and still returns normalized `runId`, `results[]`, per-task `taskId`, and `aggregateSummary`.
- [x] 2.4 Replace the placeholder backend adapter with a real bridge to the installed `pi-subagents` execution substrate while keeping backend-specific invocation details hidden behind the local dispatch layer.
- [x] 2.5 Update `.pi/settings.json` to declare the required subagent package and load the local orchestration extension, and explicitly record whether any additional repository-managed Pi settings need to change.
- [x] 2.6 Add or update project-local agent definition files under `.pi/agents/` so the baseline includes at least one concrete agent contract sample that exercises the formal frontmatter schema.
- [x] 2.7 Keep `/dispatch` as a natural-language command wrapper that hands planning back to the main agent without requiring user-authored `tasks[]`, and tighten the injected instruction so the main agent routes delegated work through the repository-owned `dispatch` tool.
- [x] 2.8 Update the agent resolver so user-level agents from `~/.pi/agent/agents` are available by default and project-local `.pi/agents/*.md` override them when present.
- [x] 2.9 Add repository-owned agent policy for skill-sensitive delegated work so task planning does not depend on raw string `skill` overrides or naked `delegate`.
- [x] 2.10 Upgrade sync dispatch result handling so the repository-owned tool preserves child output fields (`finalOutput`, `artifactPaths`, `sessionFile`, `savedOutputPath`) instead of collapsing them to status-only summaries.
- [x] 2.11 Upgrade sync dispatch rendering so the main agent and human operator can read each child task's actual output and any real export paths directly from the sync response, without guessing temp file locations or relying on `status`.
- [x] 2.12 Clarify dispatch sync run identifier semantics so the response no longer implies that the top-level `runId` is a status-compatible async handle.

## 3. 收敛与验证准备

- [x] 3.1 Prepare evidence showing the repository-owned `dispatch` tool is discoverable, bridges to real `pi-subagents` execution, and callers do not need to depend on the raw `pi-subagents` interface contract.
- [x] 3.2 Prepare evidence showing `.pi/agents/*.md` is the single per-agent policy truth source, that agent-defined fixed skills can be expressed there, and that task-level `projectContext` supports `default`, `inherit`, and `strip`.
- [x] 3.3 Prepare evidence showing `.pi/settings.json` was assessed and updated if needed, and that the implementation preserved the Phase 1 sync boundary plus the post-verification global Pi settings sync confirmation workflow.
- [x] 3.4 Prepare evidence showing `/dispatch` exists as a natural-language slash-command wrapper and hands dispatch intent back to the main agent instead of requiring structured user payloads.
- [x] 3.5 Prepare evidence showing dispatch resolves user-level agents from `~/.pi/agent/agents` by default and does not fail when the current repository has no local `.pi/agents`.
- [x] 3.6 Prepare evidence showing skill-sensitive delegated runs can be expressed without depending on raw string `skill` task overrides.
- [x] 3.7 Prepare evidence showing sync dispatch results now expose directly consumable child outputs and export paths in both tool-visible text and normalized `details.results[]`.
- [x] 3.8 Prepare evidence showing sync dispatch no longer suggests that its top-level `runId` can be inspected via `subagent status`.

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 `pi-subagent-agent-contract`、`pi-subagent-dispatch-baseline` 的 spec-to-implementation 与 task-to-evidence）。
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（包含项目页摘要、settings 影响、以及是否执行全局 Pi settings sync confirmation）。
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）。
- [x] 4.4 基于自然语言 `/dispatch` 命令补充 verification.md 和 writeback.md 中的实现与证据记录。
- [x] 4.5 基于全局 agent fallback 修正 verification.md 和 writeback.md 中的实现与证据记录。
