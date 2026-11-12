/**
 * Boundary gating: decides whether a watermark crossing may interrupt the agent, and
 * where the conversation should be cut.
 *
 * Two inputs combine here:
 *   1. the watermark tier from `thresholds.ts` (soft / at / forced), and
 *   2. a Jev (TypeSafe System One) read of the live conversation state.
 *
 * Jev may downgrade a crossing to `silent`, but it can never suppress the forced tier — the
 * hard ceiling is a safety limit, not a suggestion. When Jev is unavailable, slow, or returns
 * nothing usable, gating falls back to the watermark tier alone.
 */

import {
  choice,
  choiceProbabilities,
  noul,
  noulProbability,
  score,
  scoreIndex,
  scoreLabel,
  type Answers,
  type JevClient,
  type Questions,
} from "./jev-client.ts";
import { checkThresholds, type ResolvedThresholds, type UsageLevel, type UsageSnapshot } from "./thresholds.ts";

/** Scores above this are treated as "the agent is in the middle of something". */
export const MID_OPERATION_CUTOFF = 0.6;
/** Scores above this are treated as a decision boundary / gear switch. */
export const BOUNDARY_CUTOFF = 0.6;

export const NEEDS_HISTORY_SCALE = [
  "low - the next step follows from the tail of the conversation",
  "medium - some earlier context matters but the recent tail is enough",
  "high - the work cannot continue without older decisions or references",
];

export type CompactTier = "silent" | "notice" | "recommend" | "forced";

export type GateMode = "jev" | "watermark";

export interface BoundaryDecision {
  tier: CompactTier;
  mode: GateMode;
  reason: string;
  /** Raw Jev probabilities, for logs and the info panel. */
  scores?: {
    switchedGears?: number;
    atBoundary?: number;
    needsHistory?: string;
    midOperation?: number;
  } | undefined;
}

export interface CompactBoundaryState {
  /** Newest user request, truncated for the question payload. */
  currentRequest: string;
  /** Up to six messages from before the current request, summarized. */
  previousWork: string[];
  /** Up to four messages after the current request, summarized. */
  recentTurn: string[];
  /** Tool names invoked during the current turn. */
  toolsThisTurn: string[];
  /** User turns answered since the last compaction boundary. */
  turns: number;
  /** Role of the last context-visible message. */
  lastRole: string | null;
  /** Tool calls in the newest assistant message that never received a result. */
  pendingToolCalls: number;
  /** Total context-visible messages in the branch. */
  messages: number;
}

/** Structural subset of a Pi session entry; keeps this module free of Pi imports. */
export interface BoundaryEntry {
  type?: string;
  id?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
}

const EXCERPT_REQUEST = 600;
const EXCERPT_PREVIOUS = 220;
const EXCERPT_RECENT = 220;
const PREVIOUS_WORK_MESSAGES = 6;
const RECENT_TURN_MESSAGES = 4;

function contentBlocks(entry: BoundaryEntry): Array<Record<string, unknown>> {
  const content = entry.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === "object");
}

function isToolCall(block: Record<string, unknown>): boolean {
  return block.type === "toolCall" || block.type === "tool_use" || block.type === "tool_call";
}

function isToolResult(block: Record<string, unknown>): boolean {
  return block.type === "toolResult" || block.type === "tool_result";
}

function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function describeEntry(entry: BoundaryEntry): string {
  const role = entry.message?.role ?? "?";
  const parts: string[] = [];
  for (const block of contentBlocks(entry)) {
    if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
    else if (isToolCall(block) && typeof block.name === "string") parts.push(`[tool ${block.name}]`);
    else if (isToolResult(block)) parts.push("[tool result]");
  }
  const body = parts.join(" ").trim();
  return body.length > 0 ? `${role}: ${body}` : role;
}

/**
 * Summarize the agent's position in the conversation.
 *
 * Only the entries after the most recent compaction matter: that is the history a compaction
 * would summarize right now.
 */
export function extractCompactState(
  entries: readonly BoundaryEntry[] | undefined,
  options: { toolsThisTurn?: readonly string[] } = {},
): CompactBoundaryState {
  const list = entries ?? [];
  let start = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]!.type === "compaction") {
      start = i + 1;
      break;
    }
  }
  const window = list.slice(start).filter((entry) => entry.type === "message" && entry.message);

  let turns = 0;
  let lastRole: string | null = null;
  let lastUserIndex = -1;
  for (let i = 0; i < window.length; i++) {
    const role = window[i]!.message?.role ?? null;
    if (role === "user") {
      turns++;
      lastUserIndex = i;
    }
    if (role) lastRole = role;
  }

  const currentRequest = lastUserIndex >= 0 ? excerpt(describeEntry(window[lastUserIndex]!).replace(/^user:\s*/, ""), EXCERPT_REQUEST) : "";
  const previousWork =
    lastUserIndex > 0
      ? window.slice(Math.max(0, lastUserIndex - PREVIOUS_WORK_MESSAGES), lastUserIndex).map((entry) => excerpt(describeEntry(entry), EXCERPT_PREVIOUS))
      : [];
  const recentTurn =
    lastUserIndex >= 0
      ? window.slice(lastUserIndex + 1, lastUserIndex + 1 + RECENT_TURN_MESSAGES).map((entry) => excerpt(describeEntry(entry), EXCERPT_RECENT))
      : [];

  const toolsThisTurn = [...(options.toolsThisTurn ?? [])];
  if (toolsThisTurn.length === 0 && lastUserIndex >= 0) {
    for (const entry of window.slice(lastUserIndex + 1)) {
      for (const block of contentBlocks(entry)) {
        if (isToolCall(block) && typeof block.name === "string" && !toolsThisTurn.includes(block.name)) {
          toolsThisTurn.push(block.name);
        }
      }
    }
  }

  let pendingToolCalls = 0;
  for (let i = window.length - 1; i >= 0; i--) {
    const entry = window[i]!;
    if (entry.message?.role !== "assistant") continue;
    const blocks = contentBlocks(entry);
    const calls = blocks.filter(isToolCall).length;
    const results = blocks.filter(isToolResult).length;
    pendingToolCalls = Math.max(0, calls - results);
    break;
  }

  return { currentRequest, previousWork, recentTurn, toolsThisTurn, turns, lastRole, pendingToolCalls, messages: window.length };
}

/** Human-readable state string handed to Jev. Kept stable so findings are comparable. */
export function describeState(state: CompactBoundaryState, usage: UsageSnapshot, thresholds: ResolvedThresholds): string {
  const percent = usage.percent.toFixed(1);
  const previousWork = state.previousWork ?? [];
  const recentTurn = state.recentTurn ?? [];
  const toolsThisTurn = state.toolsThisTurn ?? [];
  const lines = [
    "This is an autonomous coding agent session. It can rewrite its own conversation into a handoff note at any moment.",
    `Context window: ${thresholds.contextWindow} tokens. Currently used: ${usage.usedTokens} tokens (${percent}%).`,
    `Watermarks: notice at ${thresholds.softPct.toFixed(1)}%, recommend at ${thresholds.warnPct.toFixed(1)}%, forced at ${thresholds.forcedPct.toFixed(1)}%.`,
    `Conversation messages since the last compaction: ${state.messages}. User turns: ${state.turns}.`,
    `Last message role: ${state.lastRole ?? "none"}. Pending tool calls: ${state.pendingToolCalls}.`,
    `Tools used in this turn: ${toolsThisTurn.length > 0 ? toolsThisTurn.join(", ") : "none"}.`,
    "",
    `Current request: ${state.currentRequest || "(none)"}`,
    "",
    "Previous work:",
    ...(previousWork.length > 0 ? previousWork.map((line) => `- ${line}`) : ["- (none)"]),
    "",
    "This turn so far:",
    ...(recentTurn.length > 0 ? recentTurn.map((line) => `- ${line}`) : ["- (none)"]),
  ];
  return lines.join("\n");
}

export function boundaryQuestions(): Questions {
  return {
    switched_gears: noul(
      "The agent just moved to a different subtask, problem, or approach compared with the work immediately before it, so the previous thread is finished enough to be written down and dropped from live memory.",
    ),
    at_boundary: noul(
      "The agent has just reached a natural stopping point where it is between steps, and nothing it decided so far is mid-flight.",
    ),
    needs_history: score(
      "How much of the older conversation must stay live for the agent's next step to be correct?",
      NEEDS_HISTORY_SCALE,
    ),
    mid_operation: noul(
      "The agent is in the middle of a single operation: an unfinished edit, a running tool call, a half-applied refactor, or an in-progress multi-step command it has not verified yet.",
    ),
  };
}

/** Probability of the named choice from a `choice` answer, defaulting to 0 when missing. */
function choiceProbability(answers: Answers | undefined, id: string, name: string): number {
  return choiceProbabilities(answers, id)?.[name] ?? 0;
}

/**
 * Truth table over the four scores.
 *
 *   mid_operation > 0.6                                  → silent
 *   switched_gears > 0.6                                 → boundary
 *   at_boundary > 0.6 AND needs_history != "high"        → boundary
 *   otherwise                                            → silent
 *
 * `forced` is applied by the caller and never reaches this function.
 */
export function decideTier(scores: BoundaryDecision["scores"], base: Exclude<CompactTier, "forced" | "silent">): CompactTier {
  if (!scores) return base;
  const mid = scores.midOperation ?? 0;
  if (mid > MID_OPERATION_CUTOFF) return "silent";
  const switched = (scores.switchedGears ?? 0) > BOUNDARY_CUTOFF;
  const boundary = (scores.atBoundary ?? 0) > BOUNDARY_CUTOFF && scores.needsHistory !== "high";
  if (!switched && !boundary) return "silent";
  return base;
}

export interface GateOptions {
  /** Once the notice tier has already been delivered for this crossing. */
  alreadyNoticed?: boolean | undefined;
  /** Once the recommend tier has already been delivered for this crossing. */
  alreadyRecommended?: boolean | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
}

/**
 * Decide what to do at this watermark crossing.
 *
 * The watermark sets the ceiling of the outcome; Jev only decides whether the agent is at a place
 * where an interruption is welcome. A Jev failure of any kind degrades to the watermark tier.
 */
export async function evaluateBoundary(
  client: JevClient | undefined,
  state: CompactBoundaryState,
  usage: UsageSnapshot,
  thresholds: ResolvedThresholds,
  options: GateOptions = {},
): Promise<BoundaryDecision> {
  const watermark: UsageLevel = checkThresholds(usage.usedTokens, thresholds);
  if (watermark === "idle") return { tier: "silent", mode: "watermark", reason: "below every watermark" };
  if (watermark === "forced") return { tier: "forced", mode: "watermark", reason: "hard ceiling reached" };

  const base: Exclude<CompactTier, "forced" | "silent"> = watermark === "recommend" ? "recommend" : "notice";
  if (watermark === "notice" && options.alreadyNoticed) {
    return { tier: "silent", mode: "watermark", reason: "notice already delivered for this crossing" };
  }
  if (watermark === "recommend" && options.alreadyRecommended) {
    return { tier: "silent", mode: "watermark", reason: "recommend already delivered for this crossing" };
  }

  if (!client || !client.available) {
    return { tier: base, mode: "watermark", reason: "jev unavailable" };
  }

  try {
    const result = await client.ask(
      describeState(state, usage, thresholds),
      boundaryQuestions(),
      { signal: options.signal, timeoutMs: options.timeoutMs },
    );
    const scores: NonNullable<BoundaryDecision["scores"]> = {
      switchedGears: noulProbability(result.answers, "switched_gears"),
      atBoundary: noulProbability(result.answers, "at_boundary"),
      needsHistory: scoreLabel(result.answers, "needs_history") ?? NEEDS_HISTORY_SCALE[scoreIndex(result.answers, "needs_history") ?? 0],
      midOperation: noulProbability(result.answers, "mid_operation"),
    };
    const tier = decideTier(scores, base);
    return {
      tier,
      mode: "jev",
      reason:
        tier === "silent"
          ? `jev kept it quiet (mid_operation ${fmt(scores.midOperation)}, switched_gears ${fmt(scores.switchedGears)}, at_boundary ${fmt(scores.atBoundary)}, needs_history ${scores.needsHistory?.split(" ")[0]})`
          : `jev confirmed a boundary (switched_gears ${fmt(scores.switchedGears)}, at_boundary ${fmt(scores.atBoundary)})`,
      scores,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { tier: base, mode: "watermark", reason: `jev unavailable (${message})` };
  }
}

function fmt(value: number | undefined): string {
  return (value ?? 0).toFixed(2);
}

// --------------------------------------------------------------- cut points

/** Minimum number of completed turns required before asking Jev to place a cut. */
export const MIN_TURNS_FOR_CUT = 3;

export interface TurnSummary {
  /** Index into the entry list this turn starts at. */
  index: number;
  /** Session entry id, used as the `choice` criterion key. */
  id: string;
  /** Short excerpt of the user request. */
  request: string;
  /** Short excerpt of the assistant's answer. */
  reply: string;
}

export interface CutPoint {
  turnIndex: number;
  turnId: string;
  confidence: number;
  /** Instruction text injected into Pi's compaction prompt. */
  instructions: string;
}

export const CUT_CHOICES = {
  keep: "preserved",
  drop: "compressible",
} as const;

export function cutPointQuestions(turns: readonly TurnSummary[]): Questions {
  const criteria: Record<string, string> = {};
  for (const turn of turns) {
    criteria[turn.id] = `LIVE_START ${turn.id}: ${truncate(turn.request, 120)} -> ${truncate(turn.reply, 120)}`;
  }
  return {
    live_from: choice(
      "Which of these turns is the first one that must stay fully live for the agent to keep working? Every earlier turn can be replaced by a summary.",
      criteria,
    ),
    has_completed_prefix: noul(
      "Do the turns before that handoff point form a completed stretch of work, with no unfinished step that must be carried forward in full?",
    ),
  };
}

/** Build the cut-point directive appended to Pi's own compaction prompt. */
export function cutPointInstructions(turn: TurnSummary, hasCompletedPrefix: boolean): string {
  return [
    `Cut-point guidance (Jev live_from = ${turn.id}: "${truncate(turn.request, 80)}"):`,
    `- Earlier turns are ${hasCompletedPrefix ? "completed earlier work" : "work that is unfinished but no longer live"}: condense them into 1-2 sentences of high-level outcomes.`,
    `- From ${turn.id} onward is still live work: preserve full technical detail, exact file paths, architectural decisions, open issues, and any obs_xxx observation handles.`,
  ].join("\n");
}

/** Minimum probability the chosen turn itself must carry, per the decision rule. */
export const CUT_PROBABILITY_FLOOR = 0.5;
/** Minimum probability that earlier turns are finished before a cut is placed. */
export const COMPLETED_PREFIX_FLOOR = 0.5;

/**
 * Ask Jev where to cut. Returns undefined when the conversation is too short, the earlier turns
 * are not finished, the choice lands on the first turn, or the answer is not confident enough —
 * in every one of those cases Pi's own boundary is used unchanged.
 */
export async function pickCutPoint(
  client: JevClient | undefined,
  turns: readonly TurnSummary[],
  minConfidence: number,
  options: { signal?: AbortSignal | undefined; timeoutMs?: number | undefined } = {},
): Promise<CutPoint | undefined> {
  if (!client || !client.available) return undefined;
  if (turns.length < MIN_TURNS_FOR_CUT) return undefined;
  const byId = new Map(turns.map((turn) => [turn.id, turn]));
  try {
    const result = await client.ask(
      [
        "A long agent conversation is being reduced to a summary.",
        `It contains ${turns.length} user turns, listed as choice criteria with short excerpts.`,
        "Pick the earliest turn that still has to stay live, verbatim.",
      ].join("\n"),
      cutPointQuestions(turns),
      { signal: options.signal, timeoutMs: options.timeoutMs },
    );
    const answer = result.answers.live_from;
    if (!answer || answer.type !== "choice") return undefined;
    const turn = byId.get(answer.choice);
    if (!turn) return undefined;
    const chosenIndex = turns.findIndex((candidate) => candidate.id === turn.id);
    if (chosenIndex <= 0) return undefined;
    if ((answer.probabilities[answer.choice] ?? 0) < CUT_PROBABILITY_FLOOR) return undefined;
    if (answer.confidence < minConfidence) return undefined;
    const hasCompletedPrefix = noulProbability(result.answers, "has_completed_prefix") > COMPLETED_PREFIX_FLOOR;
    if (!hasCompletedPrefix) return undefined;
    return {
      turnIndex: turn.index,
      turnId: turn.id,
      confidence: answer.confidence,
      instructions: cutPointInstructions(turn, hasCompletedPrefix),
    };
  } catch {
    return undefined;
  }
}

/** Probability the answered choice points at each turn, for the info panel. */
export function cutPointDistribution(answers: Answers | undefined): Record<string, number> | undefined {
  return choiceProbabilities(answers, "live_from");
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/**
 * Condense a branch into user/assistant turn pairs for the cut-point question.
 * Text is excerpted, never quoted in full, so the question stays small.
 */
export function extractTurnSummaries(entries: readonly BoundaryEntry[] | undefined, options: { afterIndex?: number } = {}): TurnSummary[] {
  const list = entries ?? [];
  let start = options.afterIndex ?? 0;
  if (options.afterIndex === undefined) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]!.type === "compaction") {
        start = i + 1;
        break;
      }
    }
  }

  const turns: TurnSummary[] = [];
  let current: TurnSummary | undefined;
  for (let i = start; i < list.length; i++) {
    const entry = list[i]!;
    if (entry.type !== "message" || !entry.message) continue;
    const role = entry.message.role;
    const text = ownText(entry);
    if (role === "user") {
      current = { index: i, id: entryId(entry, i), request: text, reply: "" };
      turns.push(current);
      continue;
    }
    if (role === "assistant" && current) {
      current.reply = current.reply ? `${current.reply} ${text}` : text;
    }
  }
  return turns;
}

function entryId(entry: BoundaryEntry, index: number): string {
  const id = (entry as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : `turn-${index}`;
}

function ownText(entry: BoundaryEntry): string {
  const blocks = contentBlocks(entry);
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
    else if (isToolCall(block) && typeof block.name === "string") parts.push(`[tool ${block.name}]`);
  }
  return parts.join(" ").trim();
}
