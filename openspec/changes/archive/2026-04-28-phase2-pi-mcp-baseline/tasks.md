# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 Review `pi-phase2-delivery-plan` and confirm the target planning document path, the four Phase 2 workstreams, their priority order, and the expected exit criteria for the first MCP track.
- [x] 1.2 Review `pi-mcp-shared-bridge` and confirm the shared-first MCP model, `.mcp.json` ownership, `.pi/settings.json` bridge role, and the explicit exclusion of `.pi/mcp.json` and runtime sync expansion.
- [x] 1.3 Re-check the current Phase 1 boundary docs and `pi-mcp-adapter` reference notes before editing repository files so the first MCP baseline does not violate existing source/runtime constraints.

## 2. 核心实现任务

- [x] 2.1 Author `docs/plans/pi-phase2-delivery-plan.md` as the repository-local Phase 2 planning baseline, covering the four workstreams, priority order, rationale for starting with `MCP`, and exit criteria for the first workstream.
- [x] 2.2 Create repository-root `.mcp.json` as the shared MCP source of truth with the minimal `gitnexus` sample configuration: `command: "gitnexus"` and `args: ["mcp"]`.
- [x] 2.3 Update `.pi/settings.json` so Pi can load the MCP bridge through `pi-mcp-adapter` without moving server truth into Pi-specific config files.
- [x] 2.4 Ensure the implementation leaves `.pi/mcp.json` absent and keeps `scripts/sync-pi-agent.sh` unchanged with respect to `.mcp.json`.
- [x] 2.5 Document the MCP baseline usage and boundary assumptions so contributors understand that `.mcp.json` is shared across agents while Pi consumes it through the bridge.

## 3. 收敛与验证准备

- [x] 3.1 Prepare evidence showing the planning document path, workstream decomposition, and first-track exit criteria satisfy `pi-phase2-delivery-plan`.
- [x] 3.2 Prepare evidence showing `.mcp.json`, `.pi/settings.json`, and the unchanged Phase 1 sync boundary satisfy `pi-mcp-shared-bridge`.
- [x] 3.3 Capture verification steps proving Pi can discover, connect to, and call the `gitnexus` MCP server through the shared-first setup.

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）。
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）。
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）。
