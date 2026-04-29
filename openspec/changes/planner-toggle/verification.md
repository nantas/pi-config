# Verification: planner-toggle

## Summary

| Item | Status |
|------|--------|
| Deliverable: `.pi/extensions/planner-toggle.ts` | ✅ Created, 280+ lines, syntax-valid, loads without errors |
| Prerequisites: pi binary | ✅ `/opt/homebrew/bin/pi` v0.70+ |
| Planner model `deepseek/deepseek-v4-pro` | ✅ Available in model registry (confirmed via `--list-models`) |
| No npm dependencies | ✅ Single file, no package.json needed |

---

## Spec Coverage Verification

### Requirement: Shortcut Toggle

| Scenario | Status | Evidence |
|---|---|---|
| Toggle from default to planner via `Ctrl+Alt+P` | ✅ | `pi.registerShortcut(Key.ctrlAlt("p"), ...)` handler calls `togglePlannerMode(ctx)` |
| Toggle from planner to default via `Ctrl+Alt+P` | ✅ | Same handler; `togglePlannerMode()` checks `plannerEnabled` to determine action |

### Requirement: Command Toggle

| Scenario | Status | Evidence |
|---|---|---|
| Toggle via `/planner` command | ✅ | `pi.registerCommand("planner", ...)` handler calls `togglePlannerMode(ctx)` |

### Requirement: Planner Mode Model

| Scenario | Status | Evidence |
|---|---|---|
| Model switch on planner activation | ✅ | `togglePlannerMode()` finds `deepseek/deepseek-v4-pro` via `ctx.modelRegistry.find()`, calls `await pi.setModel(plannerModel)` |
| Unknown model handling | ✅ | If `modelRegistry.find()` returns null: `ctx.ui.notify("error")`, returns without activating |

### Requirement: Default Mode Model Restore

| Scenario | Status | Evidence |
|---|---|---|
| Model restore on planner deactivation | ✅ | `previousModelKey` stored on activation; deactivation looks up model by provider/id via `modelRegistry.find()`, calls `pi.setModel()` |
| First activation without prior model context | ✅ | Uses `ctx.model` to capture current `provider/id` before switching; if `ctx.model` is undefined, `previousModelKey` stays null |

### Requirement: Read-Only Tool Restriction

| Scenario | Status | Evidence |
|---|---|---|
| Tool set switch on activation | ✅ | `togglePlannerMode()` calls `pi.setActiveTools(PLANNER_TOOLS)` where `PLANNER_TOOLS = ["read", "bash", "grep", "find", "ls"]` |
| Tool set restore on deactivation | ✅ | `pi.setActiveTools(DEFAULT_TOOLS)` where `DEFAULT_TOOLS = ["read", "bash", "edit", "write"]` |
| Write tool blocked in planner mode | ✅ | `tool_call` handler: if `plannerEnabled` and `toolName === "write"` or `"edit"`, returns `{ block: true, reason: "..." }` |

### Requirement: Bash Command Whitelist

| Scenario | Status | Evidence |
|---|---|---|
| Safe command allowed (ls, cat, grep, git log) | ✅ | `isSafeCommand()` returns `true` for SAFE_PATTERNS that are not DESTRUCTIVE_PATTERNS; handler does not block |
| Destructive command blocked (rm, mv, > redirect) | ✅ | `isSafeCommand()` returns `false`; handler returns `{ block: true, reason: "..." }` |

### Requirement: UI Status Indicator

| Scenario | Status | Evidence |
|---|---|---|
| Status bar in planner mode | ✅ | `updateStatus()` calls `ctx.ui.setStatus("planner-toggle", "⏸ planner")` when `plannerEnabled` |
| Status bar cleared on exit | ✅ | `updateStatus()` calls `ctx.ui.setStatus("planner-toggle", undefined)` when not `plannerEnabled` |
| Toast on activation | ✅ | `togglePlannerMode()` calls `ctx.ui.notify("Planner mode enabled. Tools: ...", "info")` |
| Toast on deactivation | ✅ | `ctx.ui.notify("Planner mode disabled. Full access restored.", "info")` |

### Requirement: Stale Context Cleanup

| Scenario | Status | Evidence |
|---|---|---|
| Context messages stripped on deactivation | ✅ | `context` handler: if not `plannerEnabled`, filters messages with `customType === "planner-mode-context"` |

### Requirement: State Persistence

| Scenario | Status | Evidence |
|---|---|---|
| State saved on change | ✅ | `persistState()` calls `pi.appendEntry("planner-toggle-state", { enabled, previousModelKey })` |
| State restored on resume | ✅ | `session_start` handler reads entries, finds latest `planner-toggle-state`, restores `plannerEnabled` and `previousModelKey`, calls `pi.setActiveTools(PLANNER_TOOLS)` if active |

### Requirement: Planner Mode System Instruction

| Scenario | Status | Evidence |
|---|---|---|
| Instruction injected before agent start | ✅ | `before_agent_start` handler returns `{ message: { customType: "planner-mode-context", content: "[PLANNER MODE ACTIVE]...", display: false } }` when `plannerEnabled` |

---

## File Verification

| File | Path | Status |
|---|---|---|
| Extension | `.pi/extensions/planner-toggle.ts` | ✅ 280+ lines, valid TypeScript, loads without errors |
| Spec | `openspec/changes/planner-toggle/specs/planner-toggle/spec.md` | ✅ 10 requirements defined |
| Design | `openspec/changes/planner-toggle/design.md` | ✅ 7 design decisions documented |
| Tasks | `openspec/changes/planner-toggle/tasks.md` | ✅ All 19 tasks defined, 16/19 complete |

---

## Conclusion

All 10 spec requirements have full implementation coverage. The extension loads successfully, all imports resolve, and all event handlers are properly registered. Verification and writeback closure tasks remain to complete the change lifecycle.
