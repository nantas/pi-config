/**
 * /sr command handler — list recent sessions and resume a previous conversation.
 *
 * Flow: /sr → list recent sessions → user selects → switchSession
 * Direct path: /sr path/to/session.jsonl → validate → switchSession
 * JSONL only — HTML exports are rejected with a friendly message.
 */

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { updateIndex, listRecent } from "./indexer";
import type { SessionRecord } from "./types";
import { existsSync } from "node:fs";

/**
 * switchSession exists in the Pi runtime but may not yet be in the
 * installed type declarations. Use a minimal interface for safe access.
 */
interface CommandContextWithSwitch {
  switchSession(sessionPath: string): Promise<{ cancelled: boolean }>;
}

// ── Index Guard ────────────────────────────────────────────────

let _indexed = false;

function ensureIndexed(): void {
  if (_indexed) return;
  _indexed = true;
  try {
    updateIndex();
  } catch {
    // Index errors are non-fatal
  }
}

// ── Main Handler ───────────────────────────────────────────────

export async function handleSrInput(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const sessionPath = args.trim();

  // Direct path mode: /sr path/to/session.jsonl
  if (sessionPath) {
    await resumeByPath(sessionPath, ctx);
    return;
  }

  // List mode: show recent sessions for selection
  ensureIndexed();

  const sessions = listRecent();

  // sr-no-indexed-sessions: empty index
  if (sessions.length === 0) {
    ctx.ui.notify(
      "No sessions indexed yet. Run a few Pi sessions first, then try again.",
      "info",
    );
    return;
  }

  await resumeBySelection(sessions, ctx);
}

// ── Selection Flow ─────────────────────────────────────────────

async function resumeBySelection(
  sessions: SessionRecord[],
  ctx: ExtensionCommandContext,
): Promise<void> {
  // sr-list-recent-sessions: [N] project | timestamp | first_user_message[:60]
  const options = sessions.map((s, i) => {
    const project = s.project;
    const ts = s.session_ts;
    const msg = s.first_user_message.slice(0, 60);
    return `[${i + 1}] ${project} | ${ts} | ${msg}`;
  });

  const choice = await ctx.ui.select(
    `Recent Sessions (${sessions.length} total, Esc to cancel)`,
    options,
  );
  if (!choice) return; // cancelled

  const idx = options.indexOf(choice);
  if (idx === -1) return;

  const selected = sessions[idx];
  await resumeByPath(selected.path, ctx);
}

// ── Resume by Path ─────────────────────────────────────────────

async function resumeByPath(
  sessionPath: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  // sr-resume-jsonl-only: check file exists
  if (!existsSync(sessionPath)) {
    ctx.ui.notify(`Session file not found: ${sessionPath}`, "error");
    return;
  }

  // sr-resume-jsonl-only: reject HTML
  if (sessionPath.endsWith(".html")) {
    ctx.ui.notify(
      "Resume not supported for HTML exports (JSONL only).",
      "error",
    );
    return;
  }

  // sr-error-handling: catch switchSession failures
  try {
    const result = await (ctx as unknown as CommandContextWithSwitch).switchSession(sessionPath);
    if (result.cancelled) {
      ctx.ui.notify("Session resume cancelled.", "info");
    }
    // Success: Pi will switch to the new session automatically
  } catch (err) {
    ctx.ui.notify(
      `Failed to resume session: ${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
  }
}
