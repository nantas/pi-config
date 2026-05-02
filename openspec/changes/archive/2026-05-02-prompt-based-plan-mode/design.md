# Design

## Context

Current `planner-toggle.ts` (`.pi/extensions/planner-toggle.ts`) implements plan mode via:

1. `pi.setActiveTools(PLANNER_TOOLS)` — restricts tools to read-only names
2. `pi.on("tool_call")` handler — blocks `write`/`edit` by name; blocks bash commands via regex allowlist (`isSafeCommand`)
3. `before_agent_start` → `message` injection — injects a short `[PLANNER MODE ACTIVE]` block as a custom assistant message

Per `specs/planner-toggle/spec.md`, the redesign replaces #1, #2, and the mechanism of #3 with:

- No tool restriction (all tools available)
- No bash regex allowlist
- Comprehensive Codex-style plan mode instructions injected into the **system prompt** (not as a custom message)

Per `specs/codex-plan-mode-reference/spec.md`, a reference document `docs/reference/plan-mode-comparison.md` is created alongside the code change.

## Goals / Non-Goals

**Goals:**

- Delete `PLANNER_TOOLS` / `DEFAULT_TOOLS` constants, `isSafeCommand`, `DESTRUCTIVE_PATTERNS`, `SAFE_PATTERNS` (~80 lines)
- Delete `tool_call` handler for `write`/`edit` blocking and bash filtering
- Inject plan mode instructions via `event.systemPrompt` in `before_agent_start`
- Retain all existing auxiliary features: `Ctrl+Alt+P`, `/planner` command, model switch to `deepseek/deepseek-v4-pro`, model restore, status bar indicator, toast notifications, state persistence
- Deliver `docs/reference/plan-mode-comparison.md` with cross-repo research evidence from Codex

**Non-Goals:**

- No changes to pi agent framework or tool architecture
- No `<proposed_plan>` streaming parser (pi has no equivalent to Codex's stream-parser)
- No `request_user_input`-like mode-restricted tool (pi's questionnaire tool is optional, not mode-gated)
- No behavior change visible to end users beyond the tool-access change and notification text

## Decisions

### Decision 1: Use `event.systemPrompt` (not `message`) for instruction injection

- **Option A (chosen)**: `before_agent_start` → `return { systemPrompt: (event.systemPrompt ?? "") + "\n\n" + PLAN_MODE_SYSTEM_PROMPT }`
- **Option B (rejected)**: Keep the current custom message approach with `message.customType`

Rationale: Codex uses `developer_instructions` (injected into the system prompt, not conversation history) for plan mode rules. pi's `event.systemPrompt` is the closest equivalent. This avoids polluting conversation history with system-level instructions and keeps the plan mode rules inside the system boundary where the LLM gives them maximum attention.

Consequence: The `context` event handler for filtering stale `planner-mode-context` messages is no longer needed, simplifying cleanup.

### Decision 2: Self-contained PLAN_MODE_SYSTEM_PROMPT (not tool-name-driven)

- **Option A (chosen)**: Behavioral boundary descriptions ("reading files ✅" / "editing files ❌")
- **Option B (rejected)**: Tool-name listing ("Available tools: read, bash, grep...")

Rationale: The entire purpose of this redesign is to decouple plan mode from tool name enumeration. Behavioral descriptions adapt automatically as new tools are added or renamed. Tool names like `read` or `edit` are pi-specific implementation details that the LLM already understands through the system prompt's `Available tools` section — we don't need to repeat them.

### Decision 3: Simplify notification text for activation

- **Current**: `Planner mode enabled. Tools: ${PLANNER_TOOLS.join(", ")}`
- **New**: `Planner mode enabled. All tools available, file modifications restricted by instructions.`

Rationale: Since we're no longer changing active tools, listing tool names is misleading. The notification should describe the intent ("restricted") rather than the mechanism.

### Decision 4: Reference document structure

The reference doc follows the Codex cross-repo-research evidence pattern:
- Each claim anchored to file:line
- Comparison organized by dimension (not monolithic description)
- Separate sections for Codex analysis, pi analysis, comparison, and migration implications

## Risks / Migration

| Risk | Mitigation |
|------|-----------|
| LLM ignores prompt and writes files | Prompt is high-authority (system-level); add repeated emphasis at key boundaries; user can monitor via status bar |
| Bash `sed -i` or similar indirect writes go undetected | Accept — same risk model as Codex; any write-capable tool could be misused; trust the prompt |
| Users accustomed to tool-count notifications are confused | Notification text updated to describe behavior rather than tool list |
| Future pi extension adds a tool that inherently mutates (e.g., `patch` tool) | The behavioral boundary ("mutating actions") covers it automatically; no whitelist update needed |
