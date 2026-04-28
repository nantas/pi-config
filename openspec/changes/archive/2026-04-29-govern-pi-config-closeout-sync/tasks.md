# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 Review `pi-config-closeout-settings-governance` and confirm the mandatory closeout settings assessment, repository source-of-truth semantics, and required verification result vocabulary.
- [x] 1.2 Review `pi-global-runtime-sync-confirmation` and confirm the post-verification user confirmation step, the `~/.pi/agent/settings.json` deployment target, and the explicit exclusion of `.mcp.json` from this rule.
- [x] 1.3 Re-check the current Phase 1 boundary docs, `AGENTS.md`, and `scripts/sync-pi-agent.sh` so the new governance rule extends the existing managed sync contract without changing overwrite semantics.

## 2. 核心实现任务

- [x] 2.1 Update repository governance instructions so future `pi-config` feature/config changes must explicitly assess `.pi/settings.json` impact during closeout, and must update repository `.pi/settings.json` before verification when required.
- [x] 2.2 Author a stable repository-local governance/runbook document that explains the closeout sequence: assess repo settings impact, update repo truth if needed, complete verification, ask for sync confirmation, and if confirmed deploy through the existing Phase 1 sync workflow.
- [x] 2.3 Update the relevant boundary or workflow documentation so contributors can distinguish Pi-managed runtime config from shared-layer config, especially that `.mcp.json` remains outside the global Pi settings sync confirmation rule.
- [x] 2.4 Ensure the implementation keeps `scripts/sync-pi-agent.sh` and the `~/.pi/agent/settings.json` target semantics unchanged while clarifying that global deployment after closeout is a confirmed use of the existing Phase 1 managed sync path.

## 3. 收敛与验证准备

- [x] 3.1 Prepare evidence showing the new governance instructions require every `pi-config` feature/config change to record either `repo-settings-updated` or `repo-settings-unchanged`.
- [x] 3.2 Prepare evidence showing the global sync confirmation workflow records `global-sync-confirmed-and-run`, `global-sync-declined`, or `global-sync-deferred-blocked`, and still targets `~/.pi/agent/settings.json`.
- [x] 3.3 Prepare evidence showing `.mcp.json` and other shared-layer resources remain outside this governance rule and that Phase 1 overwrite semantics were not redefined.

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）。
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）。
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）。
