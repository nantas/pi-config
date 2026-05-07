/**
 * planner-toggle
 *
 * Pi extension that toggles between default mode and planner mode.
 * In planner mode, the model switches to deepseek/deepseek-v4-pro and
 * plans are enforced via a system prompt instruction rather than tool
 * restriction. All tools remain available; the LLM is trusted to follow
 * the plan mode instructions encoded in the system prompt.
 *
 * Design: prompt-based (not whitelist-based)
 * - No tool whitelist: all tools available in planner mode
 * - No bash regex allowlist: bash fully available
 * - Plan mode instructions injected via event.systemPrompt
 * - Codex-style three-phase workflow: ground → intent → plan
 *
 * Features:
 * - Ctrl+Alt+P keyboard shortcut to toggle
 * - /planner command as alternative
 * - Model switches to deepseek/deepseek-v4-pro in planner mode
 * - Restores previous model when exiting planner mode
 * - System prompt instruction for read-only behavior (no tool restriction)
 * - Status bar indicator and toast notifications
 * - State persistence via appendEntry (survives session resume)
 *
 * Spec: openspec/changes/prompt-based-plan-mode/specs/planner-toggle/spec.md
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANNER_MODEL_PROVIDER = "deepseek";
const PLANNER_MODEL_ID = "deepseek-v4-pro";

// Persistent state entry type
const STATE_ENTRY_TYPE = "planner-toggle-state";

// ---------------------------------------------------------------------------
// Plan Mode System Prompt
//
// Injected into the system prompt (not as a custom message) when planner
// mode is active. Follows Codex-style three-phase workflow design.
//
// Design principles:
// - Behavioral boundaries (not tool-name listing)
// - Self-contained: no dependency on tool enumeration
// - High authority: positioned at the end of system prompt
// ---------------------------------------------------------------------------

const PLAN_MODE_SYSTEM_PROMPT = `\
===== PLAN MODE ACTIVE =====

You are currently in **Plan Mode** — a focused analysis and planning mode for
safe code exploration. This mode persists for the entire conversation until
you or the user explicitly toggles it off (via /planner or Ctrl+Alt+P).

### What You CAN Do (Allowed Actions)

- Read and explore any file in the workspace
- Run read-only bash commands (cat, ls, grep, find, head, tail, diff, etc.)
- Use grep, find, ls, and other search/recon tools to understand the codebase
- Ask clarifying questions about the user's intent and requirements
- Propose implementation plans and architectures
- Create structured analysis documents in your responses
- Discuss code patterns, dependencies, and design trade-offs

### What You Should NOT Do (Restricted Actions)

- Write or edit any file — do not use write, edit, or any tool that modifies files
- Run destructive bash commands — do not use rm, mv, cp, mkdir, sed -i, or any
  command that mutates the filesystem
- Install or uninstall packages (npm install, pip install, brew install, etc.)
- Modify git history (git commit, git push, git reset, git rebase, etc.)
- Modify system state (sudo, systemctl, service, etc.)
- Create or delete files or directories
- Run commands that have side effects on external systems

### Three-Phase Exploration Workflow

Follow this workflow for each planning request:

**Phase 1 — Ground: Understand Existing State**
Before making any proposal, explore the relevant parts of the codebase.
Read key files, understand the current architecture, and identify patterns.
Confirm your understanding with the user before proceeding.

**Phase 2 — Intent: Clarify Requirements**
Propose your understanding of what needs to be done. Ask clarifying questions
if the request is ambiguous. Discuss trade-offs and alternatives. Only move
to Phase 3 when the user confirms the intent is correct.

**Phase 3 — Implement: Produce the Plan**
Once intent is confirmed, produce a detailed implementation plan. The plan
should include:
- Files that need to be created or modified
- The order of changes (dependencies)
- Key design decisions and rationale
- Any risks or considerations

### Plan Format

When presenting a plan, use this structure:

\\\`\\\`\\\`
## Implementation Plan

### Summary
<brief overview of what will be done>

### Files to Modify
1. \`path/to/file.ts\` — <what changes>
2. \`path/to/new-file.md\` — <create>

### Change Order
1. <first step>
2. <second step>
...

### Risks
- <any risks or considerations>
\\\`\\\`\\\`

Remember: You are in plan mode. Do NOT implement changes — only analyze, discuss
and plan. The user will toggle out of plan mode when ready to implement.
`;

// ---------------------------------------------------------------------------
// Planner State (closure variables)
// ---------------------------------------------------------------------------

let plannerEnabled = false;
let previousModelKey: string | null = null;

// Planner state interface for serialization
interface PlannerState {
  enabled: boolean;
  previousModelKey: string | null;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Update the status bar indicator based on planner mode state.
 */
function updateStatus(ctx: ExtensionContext): void {
  if (plannerEnabled) {
    ctx.ui.setStatus("planner-toggle", ctx.ui.theme.fg("warning", "⏸ planner"));
  } else {
    ctx.ui.setStatus("planner-toggle", undefined);
  }
}

/**
 * Persist the current planner mode state via appendEntry for session survival.
 */
function persistState(): void {
  const state: PlannerState = {
    enabled: plannerEnabled,
    previousModelKey: previousModelKey,
  };
  pi.appendEntry(STATE_ENTRY_TYPE, state);
}

// Reference to pi for use in helper functions that don't receive pi
let pi: ExtensionAPI;

/**
 * Toggle between default mode and planner mode.
 */
async function togglePlannerMode(ctx: ExtensionContext): Promise<void> {
  if (plannerEnabled) {
    // ---- Exit planner mode ----
    plannerEnabled = false;

    // Restore previous model
    if (previousModelKey) {
      const [provider, ...idParts] = previousModelKey.split("/");
      const modelId = idParts.join("/");
      const model = ctx.modelRegistry.find(provider, modelId);
      if (model) {
        await pi.setModel(model);
      }
      // If model is no longer available, don't crash — user can set manually
    }

    updateStatus(ctx);
    persistState();
    previousModelKey = null;

    ctx.ui.notify("Planner mode disabled. Full access restored.", "info");
  } else {
    // ---- Enter planner mode ----

    // Find the planner model
    const plannerModel = ctx.modelRegistry.find(PLANNER_MODEL_PROVIDER, PLANNER_MODEL_ID);
    if (!plannerModel) {
      ctx.ui.notify(
        `Planner model ${PLANNER_MODEL_PROVIDER}/${PLANNER_MODEL_ID} not found. Cannot activate planner mode.`,
        "error",
      );
      return; // Don't activate
    }

    // Save current model key before switching
    previousModelKey = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : null;

    // Switch model
    await pi.setModel(plannerModel);
    plannerEnabled = true;

    updateStatus(ctx);
    persistState();

    ctx.ui.notify("Planner mode enabled. All tools available, file modifications restricted by instructions.", "info");
  }
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (piInstance: ExtensionAPI): void {
  // Deduplication — prevents double registration when the same extension
  // is loaded from both project-local (.pi/extensions/) and
  // global (~/.pi/agent/extensions/). Uses session-scoped key.
  const _key = "__pi_ext_planner_toggle_loaded";
  const SESSION_COUNTER = "__pi_ext_session_counter";

  const sessionId = (globalThis as any)[SESSION_COUNTER] ?? 0;
  const sessionKey = `${_key}_session_${sessionId}`;

  if ((globalThis as any)[sessionKey]) return;
  (globalThis as any)[sessionKey] = true;

  pi = piInstance;

  pi.on("session_shutdown", () => {
    (globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
  });

  // ========================================================================
  // Register Ctrl+Alt+P shortcut
  // ========================================================================
  pi.registerShortcut(Key.ctrlAlt("p"), {
    description: "Toggle planner mode",
    handler: async (ctx) => {
      await togglePlannerMode(ctx);
    },
  });

  // ========================================================================
  // Register /planner command
  // ========================================================================
  pi.registerCommand("planner", {
    description: "Toggle planner mode (read-only exploration)",
    handler: async (_args, ctx) => {
      await togglePlannerMode(ctx);
    },
  });

  // No tool_call handler — all tools remain available in planner mode.
  // The LLM is trusted to follow the system prompt instructions.

  // ========================================================================
  // before_agent_start handler — inject plan mode instructions via systemPrompt
  // ========================================================================
  pi.on("before_agent_start", async (event) => {
    if (plannerEnabled) {
      return {
        systemPrompt: (event.systemPrompt ?? "") + "\n\n" + PLAN_MODE_SYSTEM_PROMPT,
      };
    }
  });

  // No context handler needed — instructions are in the system prompt,
  // not as custom assistant messages that need filtering.

  // ========================================================================
  // session_start handler — restore persisted state
  // ========================================================================
  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();

    // Find the most recent planner-toggle-state entry
    const stateEntry = [...entries]
      .reverse()
      .find(
        (e): e is { type: string; customType?: string; data?: PlannerState } =>
          (e as { type: string }).type === "custom" &&
          (e as { customType?: string }).customType === STATE_ENTRY_TYPE,
      );

    if (stateEntry?.data) {
      plannerEnabled = stateEntry.data.enabled ?? false;
      previousModelKey = stateEntry.data.previousModelKey ?? null;
    }

    // No tool restore needed — all tools remain available.
    // Planner mode behavior is enforced by the system prompt injection
    // in the before_agent_start handler.
    updateStatus(ctx);
  });
}
