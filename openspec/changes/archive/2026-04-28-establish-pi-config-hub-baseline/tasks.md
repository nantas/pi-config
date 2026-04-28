# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 Review `pi-project-source-layer` and confirm the exact Phase 1 managed `.pi/` paths, excluded paths, and the role of `.pi/settings.json`.
- [x] 1.2 Review `pi-runtime-bootstrap-sync` and confirm the runtime path mapping, one-way deployment contract, overwrite semantics, and managed deletion behavior.
- [x] 1.3 Re-check `repo://pi-mono` source or docs for any Phase 1 path or settings assumptions before editing repository files.

## 2. 核心实现任务

- [x] 2.1 Create the minimal managed `.pi/` skeleton in the repository with `.pi/settings.json`, `.pi/extensions/`, `.pi/prompts/`, `.pi/themes/`, and `.pi/agents/`.
- [x] 2.2 Initialize `.pi/settings.json` as the minimal project-level contract file using an empty object, without duplicating default resource discovery configuration.
- [x] 2.3 Add a bootstrap/sync entrypoint that only manages the approved Pi-specific source paths and maps them to the corresponding `~/.pi/agent/` runtime locations.
- [x] 2.4 Implement sync behavior so managed runtime paths are copied from the repository, overwritten when drift exists, and deleted when removed from the repository source layer.
- [x] 2.5 Ensure the bootstrap/sync flow preserves unmanaged runtime content outside the Phase 1 managed path set.
- [x] 2.6 Document the Phase 1 boundary so shared resources such as `.agents/skills/` and `.mcp.json` remain outside automated deployment in this change.

## 3. 收敛与验证准备

- [x] 3.1 Prepare evidence showing each managed `.pi/` path exists or is intentionally empty by contract.
- [x] 3.2 Prepare evidence for sync scope, target mapping, overwrite behavior, deletion behavior, and unmanaged-runtime preservation.
- [x] 3.3 Capture the `repo://pi-mono` references used to justify settings and path behavior in verification notes.

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）。
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）。
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）。
