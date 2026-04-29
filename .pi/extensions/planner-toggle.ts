/**
 * planner-toggle
 *
 * Pi extension that toggles between default mode and read-only planner mode.
 * In planner mode, the model switches to deepseek/deepseek-v4-pro and
 * tools are restricted to a read-only set. File-modifying tools (write/edit)
 * are blocked, and bash commands are filtered by an allowlist.
 *
 * Features:
 * - Ctrl+Alt+P keyboard shortcut to toggle
 * - /planner command as alternative
 * - Model switches to deepseek/deepseek-v4-pro in planner mode
 * - Restores previous model when exiting planner mode
 * - Read-only tool set: read, bash, grep, find, ls
 * - Bash command allowlist (safe commands only)
 * - Status bar indicator and toast notifications
 * - State persistence via appendEntry (survives session resume)
 * - Context injection and cleanup
 *
 * Spec: openspec/changes/planner-toggle/specs/planner-toggle/spec.md
 */

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANNER_MODEL_PROVIDER = "deepseek";
const PLANNER_MODEL_ID = "deepseek-v4-pro";

const PLANNER_TOOLS = ["read", "bash", "grep", "find", "ls"];
const DEFAULT_TOOLS = ["read", "bash", "edit", "write"];

// Persistent state entry type
const STATE_ENTRY_TYPE = "planner-toggle-state";

// ---------------------------------------------------------------------------
// Bash allowlist: safe commands allowed in planner mode
// ---------------------------------------------------------------------------

// Destructive patterns — if matched, command is blocked
const DESTRUCTIVE_PATTERNS: RegExp[] = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bmv\b/i,
  /\bcp\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bchgrp\b/i,
  /\bln\b/i,
  /\btee\b/i,
  /\btruncate\b/i,
  /\bdd\b/i,
  /\bshred\b/i,
  /(^|[^<])>(?!>)/,        // file redirection > (but not >> comparison)
  />>/,                     // append redirection
  /\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
  /\byarn\s+(add|remove|install|publish)/i,
  /\bpnpm\s+(add|remove|install|publish)/i,
  /\bpip\s+(install|uninstall)/i,
  /\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
  /\bbrew\s+(install|uninstall|upgrade)/i,
  /\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone)/i,
  /\bsudo\b/i,
  /\bsu\b/i,
  /\bkill\b/i,
  /\bpkill\b/i,
  /\bkillall\b/i,
  /\breboot\b/i,
  /\bshutdown\b/i,
  /\bsystemctl\s+(start|stop|restart|enable|disable)/i,
  /\bservice\s+\S+\s+(start|stop|restart)/i,
  /\b(vim?|nano|emacs|code|subl)\b/i,
];

// Safe read-only patterns — if matched and not destructive, command is allowed
const SAFE_PATTERNS: RegExp[] = [
  /^\s*cat\b/,
  /^\s*head\b/,
  /^\s*tail\b/,
  /^\s*less\b/,
  /^\s*more\b/,
  /^\s*grep\b/,
  /^\s*find\b/,
  /^\s*ls\b/,
  /^\s*pwd\b/,
  /^\s*echo\b/,
  /^\s*printf\b/,
  /^\s*wc\b/,
  /^\s*sort\b/,
  /^\s*uniq\b/,
  /^\s*diff\b/,
  /^\s*file\b/,
  /^\s*stat\b/,
  /^\s*du\b/,
  /^\s*df\b/,
  /^\s*tree\b/,
  /^\s*which\b/,
  /^\s*whereis\b/,
  /^\s*type\b/,
  /^\s*command\s+-v\b/,
  /^\s*env\b/,
  /^\s*printenv\b/,
  /^\s*uname\b/,
  /^\s*whoami\b/,
  /^\s*id\b/,
  /^\s*date\b/,
  /^\s*cal\b/,
  /^\s*uptime\b/,
  /^\s*ps\b/,
  /^\s*top\b/,
  /^\s*free\b/,
  /^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i,
  /^\s*git\s+ls-/i,
  /^\s*git\s+blame\b/i,
  /^\s*git\s+stash\s+list\b/i,
  /^\s*git\s+tag\s*(-l|--list)?/i,
  /^\s*git\s+describe\b/i,
  /^\s*npm\s+(list|ls|view|info|search|outdated|audit)/i,
  /^\s*yarn\s+(list|info|why|audit)/i,
  /^\s*pip\s+(list|show|search)/i,
  /^\s*brew\s+(list|info|search)/i,
  /^\s*node\s+--version/i,
  /^\s*python\s+--version/i,
  /^\s*curl\s(?!.*\s(-o|-O|--output)\b)/i,   // curl without file output
  /^\s*wget\s+(?!.*-O\b)/i,                     // wget without file output
  /^\s*jq\b/,
  /^\s*rg\b/,
  /^\s*fd\b/,
  /^\s*bat\b/,
  /^\s*eza\b/,
  /^\s*locate\b/,
];

/**
 * Check if a bash command is safe for planner mode.
 * Returns true if the command is in the read-only allowlist.
 */
function isSafeCommand(command: string): boolean {
  const isDestructive = DESTRUCTIVE_PATTERNS.some((p) => p.test(command));
  const isSafe = SAFE_PATTERNS.some((p) => p.test(command));
  return !isDestructive && isSafe;
}

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

    pi.setActiveTools(DEFAULT_TOOLS);
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

    // Switch model and tools
    await pi.setModel(plannerModel);
    pi.setActiveTools(PLANNER_TOOLS);
    plannerEnabled = true;

    updateStatus(ctx);
    persistState();

    ctx.ui.notify(`Planner mode enabled. Tools: ${PLANNER_TOOLS.join(", ")}`, "info");
  }
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (piInstance: ExtensionAPI): void {
  // Deduplication — prevents double registration when the same extension
  // is loaded from both project-local (.pi/extensions/) and
  // global (~/.pi/agent/extensions/). Only the first-loaded copy registers.
  const _key = "__pi_ext_planner_toggle_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi = piInstance;

  // ========================================================================
  // 2.3.1: Register Ctrl+Alt+P shortcut
  // ========================================================================
  pi.registerShortcut(Key.ctrlAlt("p"), {
    description: "Toggle planner mode",
    handler: async (ctx) => {
      await togglePlannerMode(ctx);
    },
  });

  // ========================================================================
  // 2.3.2: Register /planner command
  // ========================================================================
  pi.registerCommand("planner", {
    description: "Toggle planner mode (read-only exploration)",
    handler: async (_args, ctx) => {
      await togglePlannerMode(ctx);
    },
  });

  // ========================================================================
  // 2.4.1: tool_call handler — block write/edit in planner mode
  // 2.4.2: Bash whitelist logic
  // ========================================================================
  pi.on("tool_call", async (event) => {
    if (!plannerEnabled) return; // Non-planner mode: pass through

    // Write/edit tools: block completely
    if (event.toolName === "write" || event.toolName === "edit") {
      return {
        block: true,
        reason: `Planner mode: tool "${event.toolName}" is blocked. Planner mode restricts file modifications. Use /planner to disable planner mode first.`,
      };
    }

    // Bash: check against allowlist
    if (event.toolName === "bash") {
      const command = (event.input as { command?: string }).command ?? "";
      if (!isSafeCommand(command)) {
        return {
          block: true,
          reason: `Planner mode: bash command blocked (not in allowlist). Use /planner to disable planner mode first.\nCommand: ${command}`,
        };
      }
    }
  });

  // ========================================================================
  // 2.5.1: before_agent_start handler — inject planner mode context
  // ========================================================================
  pi.on("before_agent_start", async () => {
    if (plannerEnabled) {
      return {
        message: {
          customType: "planner-mode-context",
          content:
            `[PLANNER MODE ACTIVE]
You are in planner mode — a read-only analysis mode for safe code exploration.

Restrictions:
- Available tools: ${PLANNER_TOOLS.join(", ")}
- You CANNOT use: write, edit (file modifications are disabled)
- Bash is restricted to a read-only allowlist (e.g., cat, ls, grep, find, git log/status/diff)
- All destructive commands (rm, mv, mkdir, sudo, etc.) are blocked

Your task is to analyze code, explore the codebase, and provide insights.
Do NOT attempt to make any file modifications.`,
          display: false,
        },
      };
    }
  });

  // ========================================================================
  // 2.5.2: context handler — filter stale planner-mode messages
  // ========================================================================
  pi.on("context", async (event) => {
    if (plannerEnabled) return; // Keep messages when planner is active

    return {
      messages: event.messages.filter((m) => {
        const msg = m as AgentMessage & { customType?: string };
        return msg.customType !== "planner-mode-context";
      }),
    };
  });

  // ========================================================================
  // 2.6.1: session_start handler — restore persisted state
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

    // If planner mode was active on resume, restore tools and status
    if (plannerEnabled) {
      pi.setActiveTools(PLANNER_TOOLS);
    }
    updateStatus(ctx);
  });
}
