/**
 * Self-compact state machine and crash recovery.
 *
 * The extension persists its own small state entry (`self-compact-state`) into the session
 * branch. That makes the cycle resumable: the session file is rewritten by Pi's compaction,
 * but the state entry and the handoff journal survive it, so a restart can tell the difference
 * between "compaction never happened", "compaction happened but the agent was never resumed",
 * and "the agent already answered".
 *
 * States: idle → pending → compacting → ready → done, plus failed.
 */

export const STATE_TYPE = "self-compact-state";
export const HANDOFF_TYPE = "self-compact-handoff";
export const PHASE_ENTRY_TYPE = "self-compact-phase";
export const INFO_ENTRY_TYPE = "self-compact-info";
export const STATE_VERSION = 1;
export const MAX_RETRIES = 2;

export type Phase = "idle" | "pending" | "compacting" | "ready" | "done" | "failed";

export interface HandoffRecord {
  id: string;
  cycle: number;
  /** Rendered six-field card, kept so recovery can re-render the resume message. */
  card: string;
  nextAction: string;
  note?: string | undefined;
  attempts: number;
  savedAt: string;
}

export interface PersistedState {
  version: number;
  phase: Phase;
  cycle: number;
  /** Set while the handoff card must not be replaced by another crossing. */
  locked: boolean;
  handoff?: HandoffRecord | undefined;
  lastNoticeAt?: string | undefined;
  lastRecommendAt?: string | undefined;
  error?: string | undefined;
}

export function initialState(): PersistedState {
  return { version: STATE_VERSION, phase: "idle", cycle: 0, locked: false };
}

/** Structural subset of a Pi session entry used for recovery. */
export interface RecoveryEntry {
  type?: string;
  id?: string;
  customType?: string;
  data?: unknown;
  message?: { role?: string; content?: unknown };
  firstKeptEntryId?: string;
}

function isStateEntry(entry: RecoveryEntry): boolean {
  return entry.type === "custom" && entry.customType === STATE_TYPE && Boolean(entry.data);
}

function isHandoffMessage(entry: RecoveryEntry): boolean {
  if (entry.type === "custom_message" && entry.customType === HANDOFF_TYPE) return true;
  const data = entry.data as { handoffType?: unknown } | undefined;
  return entry.type === "custom" && data?.handoffType === HANDOFF_TYPE;
}

/**
 * A handoff message is "answered" when an assistant message follows it before the next
 * compaction, i.e. the agent acted on the resumed note.
 */
function answeredAfter(entries: readonly RecoveryEntry[], index: number): boolean {
  for (let i = index + 1; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.type === "compaction") return false;
    if (entry.type === "message" && entry.message?.role === "assistant") {
      const content = entry.message.content;
      if (Array.isArray(content) ? content.length > 0 : Boolean(content)) return true;
    }
  }
  return false;
}

function lastHandoffMessageIndex(entries: readonly RecoveryEntry[], after: number): number {
  for (let i = entries.length - 1; i > after; i--) {
    if (isHandoffMessage(entries[i]!)) return i;
  }
  return -1;
}


function parseState(data: unknown): PersistedState | undefined {
  if (!data || typeof data !== "object") return undefined;
  const candidate = data as Partial<PersistedState>;
  if (candidate.version !== STATE_VERSION) return undefined;
  const phase = candidate.phase;
  if (typeof phase !== "string" || !PHASE_VALUES.has(phase as Phase)) return undefined;
  return {
    version: STATE_VERSION,
    phase: phase as Phase,
    cycle: typeof candidate.cycle === "number" ? candidate.cycle : 0,
    locked: Boolean(candidate.locked),
    handoff: (candidate.handoff as HandoffRecord | undefined) ?? undefined,
    lastNoticeAt: candidate.lastNoticeAt,
    lastRecommendAt: candidate.lastRecommendAt,
    error: candidate.error,
  };
}

const PHASE_VALUES = new Set<Phase>(["idle", "pending", "compacting", "ready", "done", "failed"]);

/** True while a handoff still owes the agent work: saved, compacting, or waiting to be resumed. */
export function handoffInFlight(state: PersistedState): boolean {
  return Boolean(state.handoff) && state.phase !== "done";
}

/**
 * Completion transition. The card is in the transcript and the agent is resuming from it, so the
 * lock must be released here — otherwise the resumed turn would have every tool blocked, would keep
 * receiving the forced prompt, and would re-deliver the same handoff forever.
 */
export function unlocked(state: PersistedState): PersistedState {
  return { ...state, phase: "done", locked: false, error: undefined };
}

/**
 * Whether ordinary tools must be blocked right now.
 *
 * Two cases block: a handoff is in flight (the agent owes a card / compaction), or the watermark is
 * forced with compactable material at hand. Forced without material must never lock, or a session
 * with nothing to summarize would deadlock.
 */
export function shouldBlockTools(state: PersistedState, level: string, hasMaterial: boolean): boolean {
  if (handoffInFlight(state)) return true;
  return state.locked || (level === "forced" && hasMaterial);
}

export type RecoveryAction = "none" | "deliver" | "resume" | "retry" | "abandon" | "unlock";

export interface RecoveryResult {
  state: PersistedState;
  action: RecoveryAction;
  /** Human-readable explanation, surfaced in the info panel and logs. */
  detail: string;
  handoff?: HandoffRecord | undefined;
}

function lastIndexWhere(list: readonly RecoveryEntry[], predicate: (entry: RecoveryEntry) => boolean): number {
  for (let i = list.length - 1; i >= 0; i--) {
    if (predicate(list[i]!)) return i;
  }
  return -1;
}

/**
 * Rebuild the cycle from the persisted state entry plus what actually landed in the branch.
 *
 * The state entry is appended *after* a successful compaction, so the compaction index must be
 * searched over the whole branch, not only after the state entry. Four recoverable situations:
 *
 *   handoff saved, no compaction yet        → Pi's compaction died; retry up to MAX_RETRIES
 *   compaction, no handoff message          → the resume message was never sent; deliver it
 *   compaction + handoff, no assistant reply → the agent was interrupted mid-answer; resume it
 *   compaction + handoff + reply            → the cycle completed; mark it done
 */
export function recoverState(entries: readonly RecoveryEntry[] | undefined): RecoveryResult {
  const list = entries ?? [];
  const stateIndex = lastIndexWhere(list, isStateEntry);
  if (stateIndex < 0) return { state: initialState(), action: "none", detail: "no saved state" };

  const state = parseState(list[stateIndex]!.data);
  if (!state) {
    return { state: initialState(), action: "none", detail: "saved state has an unknown version or phase" };
  }
  const handoff = state.handoff;
  const next: PersistedState = { ...state };

  if (state.phase === "done") {
    return { state: { ...state, locked: false }, action: "none", detail: "cycle already completed", handoff };
  }
  if (!handoff) {
    // Nothing was ever journaled: drop any stale lock and start clean.
    const cleared = state.locked ? { ...state, locked: false, phase: "idle" as Phase } : state;
    return {
      state: cleared,
      action: state.locked ? "unlock" : "none",
      detail: state.locked ? "stale lock without a handoff" : `phase ${state.phase} has no work in flight`,
    };
  }

  const compactionIndex = lastIndexWhere(list, (entry) => entry.type === "compaction");

  if (compactionIndex < 0) {
    // No compaction on this branch: either it never ran, or this branch has none of the history.
    const attempts = handoff.attempts ?? 0;
    if (state.phase === "ready") {
      // The material-less path and Pi's cancel path both land here: just hand the card over.
      return { state: { ...state, phase: "ready" }, action: "deliver", detail: "handoff saved but no compaction ran", handoff };
    }
    if (attempts >= MAX_RETRIES) {
      next.phase = "failed";
      next.locked = false;
      next.error = "compaction did not complete after the retry budget";
      return { state: next, action: "abandon", detail: "compaction never landed and retries are exhausted", handoff };
    }
    next.phase = "pending";
    return { state: next, action: "retry", detail: "handoff is saved but compaction never landed", handoff };
  }

  const handoffIndex = lastHandoffMessageIndex(list, compactionIndex);
  if (handoffIndex < 0) {
    return {
      state: { ...state, phase: "ready", locked: true },
      action: "deliver",
      detail: "compaction landed but the resume message was never sent",
      handoff,
    };
  }
  if (answeredAfter(list, handoffIndex)) {
    return { state: unlocked({ ...state }), action: "none", detail: "the resumed turn already ran", handoff };
  }
  return {
    state: { ...state, phase: "ready", locked: true },
    action: "resume",
    detail: "the agent was interrupted after resuming",
    handoff,
  };
}

/** Snapshot written into the session whenever the phase changes. */
export function toStateEntry(state: PersistedState): PersistedState {
  return { ...state, version: STATE_VERSION };
}

// --------------------------------------------------- compaction feasibility

export interface CompactionMessageLike {
  message?: { role?: string; content?: unknown; usage?: unknown };
}

const CHARS_PER_TOKEN = 4;

function textLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + textLength(item), 0);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text.length;
    return Object.values(record).reduce<number>((sum, item) => sum + textLength(item), 0);
  }
  return 0;
}

/**
 * Rough token estimate for one entry (chars/4 plus a per-tool-call overhead), mirroring
 * Pi's estimateTokens closely enough for a "is there anything to summarize" decision.
 */
export function estimateEntryTokens(entry: CompactionMessageLike): number {
  const message = entry.message;
  if (!message) return 0;
  const chars = textLength(message.content);
  const tokens = Math.ceil(chars / CHARS_PER_TOKEN);
  const images = Array.isArray(message.content)
    ? message.content.filter((block) => (block as { type?: unknown })?.type === "image").length
    : 0;
  return tokens + images * 1_500;
}

export interface CutPointLike {
  firstKeptEntryIndex: number;
  turnStartIndex: number;
  isSplitTurn: boolean;
}

/** Local fallback for Pi's `findCutPoint`, used when no helper is injected. */
export function findCutPointLocal(
  entries: readonly CompactionMessageLike[],
  startIndex: number,
  endIndex: number,
  keepRecentTokens: number,
): CutPointLike {
  let tokens = 0;
  let firstKeptEntryIndex = endIndex;
  for (let i = endIndex - 1; i >= startIndex; i--) {
    const entryTokens = estimateEntryTokens(entries[i]!);
    if (tokens + entryTokens > keepRecentTokens) break;
    tokens += entryTokens;
    firstKeptEntryIndex = i;
  }
  const firstKept = entries[firstKeptEntryIndex] as CompactionMessageLike & { type?: string } | undefined;
  const startsTurn = firstKept?.type === "message" && firstKept.message?.role === "user";
  if (startsTurn || firstKeptEntryIndex >= endIndex) {
    return { firstKeptEntryIndex, turnStartIndex: firstKeptEntryIndex, isSplitTurn: false };
  }
  let turnStartIndex = firstKeptEntryIndex;
  for (let i = firstKeptEntryIndex - 1; i >= startIndex; i--) {
    const entry = entries[i] as CompactionMessageLike & { type?: string };
    if (entry.type === "message" && entry.message?.role === "user") {
      turnStartIndex = i;
      break;
    }
  }
  return { firstKeptEntryIndex, turnStartIndex, isSplitTurn: turnStartIndex < firstKeptEntryIndex };
}

export interface CompactionHelpers {
  findCutPoint?: (entries: never[], startIndex: number, endIndex: number, keepRecentTokens: number) => CutPointLike;
  hasMessages?: (entry: never) => boolean;
}

function yieldsMessages(entry: RecoveryEntry & CompactionMessageLike): boolean {
  if (entry.type === "compaction") return false;
  if (entry.type === "custom_message" || entry.type === "branch_summary") return true;
  if (entry.type !== "message") return false;
  const message = entry.message;
  if (!message) return false;
  const content = message.content;
  if (typeof content === "string") return content.trim().length > 0;
  return Array.isArray(content) && content.length > 0;
}

/**
 * Mirror of Pi's `prepareCompaction()` feasibility check: false means Pi would fail with
 * "Nothing to compact" because everything fits inside `keepRecentTokens`, or because the
 * branch already ends in a compaction.
 */
export function hasCompactionMaterial(
  entries: readonly (RecoveryEntry & CompactionMessageLike)[] | undefined,
  keepRecentTokens: number,
  helpers: CompactionHelpers = {},
): boolean {
  const list = entries ?? [];
  if (list.length === 0) return false;
  if (list[list.length - 1]!.type === "compaction") return false;

  let previous = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]!.type === "compaction") {
      previous = i;
      break;
    }
  }
  let boundaryStart = 0;
  if (previous >= 0) {
    const firstKeptId = list[previous]!.firstKeptEntryId;
    const firstKept = firstKeptId ? list.findIndex((entry) => entry.id === firstKeptId) : -1;
    boundaryStart = firstKept >= 0 ? firstKept : previous + 1;
  }
  if (boundaryStart >= list.length) return false;

  const findCutPoint = helpers.findCutPoint ?? (findCutPointLocal as unknown as NonNullable<CompactionHelpers["findCutPoint"]>);
  const cut = findCutPoint(list as never[], boundaryStart, list.length, keepRecentTokens);
  const historyEnd = cut.isSplitTurn ? cut.turnStartIndex : cut.firstKeptEntryIndex;
  for (let i = boundaryStart; i < historyEnd; i++) {
    if (yieldsMessages(list[i]!)) return true;
  }
  if (cut.isSplitTurn) {
    for (let i = cut.turnStartIndex; i < cut.firstKeptEntryIndex; i++) {
      if (yieldsMessages(list[i]!)) return true;
    }
  }
  return false;
}
