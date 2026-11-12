/**
 * Handoff contract: validates `self_compact` arguments and renders the note that
 * replaces live conversation history.
 *
 * The card has six fields. Five are the agent's own structured claim about where the
 * work stands; the sixth (`note`) is free-form and returned to the agent verbatim after
 * compaction, so it is the only place where long intermediate detail can survive.
 */

export const NOTE_MAX_CHARS = 24_000;
export const GOAL_MAX_CHARS = 2_000;
export const ITEM_MAX_CHARS = 2_000;
export const MAX_ITEMS = 40;

export interface SelfCompactParams {
  goal: string;
  done: string[];
  in_progress: string;
  decisions: string[];
  preserved_refs: string[];
  next_action: string;
  note?: string;
}

export interface HandoffCard {
  goal: string;
  done: string[];
  in_progress: string;
  decisions: string[];
  preserved_refs: string[];
  next_action: string;
  note: string | undefined;
}

export class HandoffValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandoffValidationError";
  }
}

function requireText(value: unknown, field: string, maxChars: number): string {
  if (typeof value !== "string") throw new HandoffValidationError(`${field} must be a string`);
  const text = value.trim();
  if (text.length === 0) throw new HandoffValidationError(`${field} must not be empty`);
  if (text.length > maxChars) {
    throw new HandoffValidationError(`${field} is ${text.length} chars; the limit is ${maxChars}`);
  }
  return text;
}

function requireList(value: unknown, field: string, { allowEmpty }: { allowEmpty: boolean }): string[] {
  if (!Array.isArray(value)) throw new HandoffValidationError(`${field} must be an array of strings`);
  if (!allowEmpty && value.length === 0) {
    throw new HandoffValidationError(`${field} must contain at least one entry`);
  }
  if (value.length > MAX_ITEMS) {
    throw new HandoffValidationError(`${field} has ${value.length} entries; the limit is ${MAX_ITEMS}`);
  }
  return value.map((item, index) => requireText(item, `${field}[${index}]`, ITEM_MAX_CHARS));
}

/**
 * Validate the tool arguments. Every message names the field and the limit, so the agent
 * can fix the call in one retry instead of guessing.
 */
export function validateHandoff(params: Partial<SelfCompactParams> | undefined): HandoffCard {
  if (!params || typeof params !== "object") throw new HandoffValidationError("arguments must be an object");
  const goal = requireText(params.goal, "goal", GOAL_MAX_CHARS);
  const done = requireList(params.done, "done", { allowEmpty: true });
  const in_progress = requireText(params.in_progress, "in_progress", ITEM_MAX_CHARS);
  const decisions = requireList(params.decisions, "decisions", { allowEmpty: true });
  const preserved_refs = requireList(params.preserved_refs, "preserved_refs", { allowEmpty: true });
  const next_action = requireText(params.next_action, "next_action", ITEM_MAX_CHARS);

  let note: string | undefined;
  if (params.note !== undefined && params.note !== null) {
    if (typeof params.note !== "string") throw new HandoffValidationError("note must be a string");
    const trimmed = params.note.trim();
    if (trimmed.length > NOTE_MAX_CHARS) {
      throw new HandoffValidationError(
        `note is ${trimmed.length} chars; the limit is ${NOTE_MAX_CHARS}. Keep the essential detail and let the rest be re-read from disk.`,
      );
    }
    note = trimmed.length > 0 ? trimmed : undefined;
  }

  return { goal, done, in_progress, decisions, preserved_refs, next_action, note };
}

function bullet(items: readonly string[], empty: string): string {
  if (items.length === 0) return `- ${empty}`;
  return items.map((item) => `- ${item.replace(/\n/g, "\n  ")}`).join("\n");
}

/** Render the handoff card exactly as the agent will see it after compaction. */
export function renderHandoffCard(card: HandoffCard, meta: { cycle: number; timestamp?: string } = { cycle: 0 }): string {
  const lines = [
    `[self-compact · handoff · cycle ${meta.cycle}]`,
    "Context was compacted at your request. Below is your verbatim structured handoff — continue directly from **Next Action**.",
    "",
    "## Goal",
    card.goal,
    "",
    "## Done",
    bullet(card.done, "nothing completed yet"),
    "",
    "## In Progress",
    card.in_progress,
    "",
    "## Key Decisions",
    bullet(card.decisions, "no decisions recorded"),
    "",
    "## Preserved References & Observation Handles",
    bullet(card.preserved_refs, "none"),
    "",
    "## Next Action",
    card.next_action,
  ];
  if (meta.timestamp) lines.push("", `_recorded ${meta.timestamp}_`);
  return lines.join("\n");
}

/**
 * The message that replaces the conversation: the card, the agent's own note verbatim, and
 * the one instruction that keeps the resumed turn on target.
 */
export function renderHandoffMessage(card: HandoffCard, meta: { cycle: number; timestamp?: string }): string {
  const parts = [renderHandoffCard(card, meta)];
  if (card.note) parts.push("", "<note_to_self>", card.note, "</note_to_self>");
  parts.push(
    "",
    `Continue from **Next Action** only: ${card.next_action}`,
    "If that action needs detail this card does not carry, read it from disk or ask; do not reconstruct it from memory.",
  );
  return parts.join("\n");
}

/** Lighter wake-up used when the card is already in the transcript after an interruption. */
export function renderResumeMessage(nextAction: string, meta: { cycle: number }): string {
  return `[self-compact · resumed · cycle ${meta.cycle}] The handoff card above is already in this conversation. Continue with **Next Action**: ${nextAction}`;
}

// ----------------------------------------------------------------- prompts

/** Placeholder syntax: `{{name}}`. Unknown placeholders are left untouched. */
export function renderTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export const NOTICE_PROMPT = `self-compact notice: context is at {{percent}} ({{used}} / {{window}} tokens). Soft watermark {{soft}}, recommend at {{warn}}, forced at {{forced}}.
This is a heads-up, not a request. Keep working. Prefer finishing the current step over opening a new one, and let file contents live on disk instead of in this conversation.`;

export const RECOMMEND_PROMPT = `self-compact recommend: context is at {{percent}} ({{used}} / {{window}} tokens), past the recommend watermark ({{warn}}). Forced compaction happens at {{forced}}.
When you reach a natural boundary — the current step is verified and the next step is clear — call \`self_compact\` with the six-field handoff. Do not start new exploration first. If you are mid-operation, finish it, then compact.`;

export const FORCED_PROMPT = `self-compact forced: context is at {{percent}} ({{used}} / {{window}} tokens). The hard ceiling is {{hard}}; this conversation must be rewritten now.
Call \`self_compact\` on your own, as the only tool call in this batch, with the six-field handoff describing the work as it stands. Do not finish the current step first. Never put an unverified claim in \`done\`.`;

/** Retry prompt when the agent's last handoff call failed validation. */
export const RETRY_PROMPT = `self-compact: your last \`self_compact\` call was rejected: {{error}}
Fix that field and call \`self_compact\` again as the only tool call in the batch. Retry {{attempt}} of {{max}}.`;

/** Suffix appended to Pi's own compaction prompt. */
export const SUMMARY_INSTRUCTIONS = `Rewrite the conversation as a handoff for the same agent resuming the same task.
Use this outline:
## Goal
## Constraints & Preferences
## Progress
## Key Decisions
## Next Steps
## Critical Context
<read-files>
<modified-files>

Preserve: verified results, decisions with their reasons, exact file paths and identifiers, open questions, and any \`obs_xxx\` observation handles. Drop exploratory dead ends and repeated tool output. Keep unresolved threads unresolved; do not invent results.
The agent's own structured handoff card is delivered separately after compaction; do not reproduce it in the summary.
{{cutPoint}}`;
