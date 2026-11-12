/**
 * Self-compact — the agent rewrites its own conversation into a handoff note.
 *
 * Watermark crossings (10% / 20% / forced) do not compact by themselves. They ask the agent
 * to compact at a boundary it chooses, through the `self_compact` tool, which writes a
 * six-field card. The card replaces the conversation, and the agent resumes from its own
 * note instead of from a summarizer's guess.
 *
 * See openspec/changes/self-compact-extension/ for the specification this implements.
 */

import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Container, Text } from "@earendil-works/pi-tui";
import {
  SettingsManager,
  findCutPoint,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  NOTICE_PROMPT,
  RECOMMEND_PROMPT,
  FORCED_PROMPT,
  RETRY_PROMPT,
  SUMMARY_INSTRUCTIONS,
  HandoffValidationError,
  NOTE_MAX_CHARS,
  renderHandoffMessage,
  renderResumeMessage,
  renderTemplate,
  validateHandoff,
  type HandoffCard,
} from "./handoff.ts";
import {
  extractTurnSummaries,
  evaluateBoundary,
  extractCompactState,
  pickCutPoint,
  type BoundaryDecision,
  type CompactTier,
  type CutPoint,
} from "./boundary-gate.ts";
import { JevClient } from "./jev-client.ts";
import {
  checkThresholds,
  computeThresholds,
  extractUsage,
  isTrip,
  loadConfig,
  maxLevel,
  type ResolvedThresholds,
  type SelfCompactConfig,
  type UsageLevel,
  type UsageSnapshot,
} from "./thresholds.ts";
import {
  HANDOFF_TYPE,
  INFO_ENTRY_TYPE,
  MAX_RETRIES,
  PHASE_ENTRY_TYPE,
  STATE_TYPE,
  estimateEntryTokens,
  findCutPointLocal,
  handoffInFlight,
  hasCompactionMaterial,
  initialState,
  isStaleLock,
  recoverState,
  shouldBlockTools,
  toStateEntry,
  unlocked,
  type HandoffRecord,
  type PersistedState,
} from "./state.ts";
import { formatPct, formatStatus, formatTokens, renderContextBar, renderInfoPanel } from "./context-bar.ts";

const GUARD = Symbol.for("pi.self-compact.loaded");

const GUIDANCE_TYPE = "self-compact-guidance";
const TOOL_NAME = "self_compact";
const VIEW_TOOL_NAME = "view_context";
const STATUS_KEY = "self-compact";

export default function selfCompactExtension(pi: ExtensionAPI) {
  const globals = globalThis as Record<symbol, unknown>;
  if (globals[GUARD]) return;
  globals[GUARD] = true;

  const R = {
    alive: true,
    epoch: 0,
    deliveryTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    retryTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    config: undefined as SelfCompactConfig | undefined,
    thresholds: undefined as ResolvedThresholds | undefined,
    // Set while the model is being switched: the last usage snapshot still belongs to the previous
    // model, so any watermark read now would compare old tokens against a new window.
    staleUsage: false,
    usage: { usedTokens: 0, cachedTokens: 0, window: 0, percent: 0 } as UsageSnapshot,
    level: "idle" as UsageLevel,
    decision: undefined as BoundaryDecision | undefined,
    state: initialState() as PersistedState,
    jev: undefined as JevClient | undefined,
    configNotes: [] as string[],
    cutPoint: undefined as CutPoint | undefined,
    compacting: false,
    delivering: false,
    retryPending: undefined as string | undefined,
    toolsThisTurn: [] as string[],
    noticedLevel: "idle" as UsageLevel,
    /**
     * Forced enforcement is armed until one handoff completes. Without this, a compaction that does
     * not drop usage below the forced watermark would immediately demand another card, forever.
     */
    forceArmed: true,
  };

  // ------------------------------------------------------------- config

  pi.registerFlag("compact-soft-at", {
    description: "self-compact: notice watermark (e.g. 10% or 20000)",
    type: "string",
  });
  pi.registerFlag("compact-at", {
    description: "self-compact: recommend watermark (e.g. 20% or 40000)",
    type: "string",
  });
  pi.registerFlag("compact-buffer", {
    description: "self-compact: distance from `at` to the forced tier (e.g. 10%)",
    type: "string",
  });
  pi.registerFlag("compact-prompt", {
    description: "self-compact: extra instructions appended to Pi's compaction prompt",
    type: "string",
  });

  function flagValue(name: string): string | undefined {
    const value = pi.getFlag(name);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  function loadSettings(ctx: ExtensionContext) {
    const loaded = loadConfig({
      cwd: ctx.cwd,
      flags: {
        softAt: flagValue("compact-soft-at"),
        at: flagValue("compact-at"),
        buffer: flagValue("compact-buffer"),
        compactPrompt: flagValue("compact-prompt"),
      } as never,
    });
    R.config = loaded.config;
    R.configNotes = loaded.notes;
    R.jev = loaded.config.jev.enabled
      ? new JevClient({
          config: loaded.config.jev,
          provider: loaded.config.jev.provider === "auto" ? undefined : loaded.config.jev.provider,
        })
      : undefined;
  }

  // ------------------------------------------------------- usage tracking

  function branch(ctx: ExtensionContext) {
    return ctx.sessionManager.getBranch() as never[];
  }

  function resolveThresholds(ctx: ExtensionContext) {
    const window = ctx.getContextUsage()?.contextWindow ?? ctx.model?.contextWindow ?? 0;
    if (!window || !R.config) {
      R.thresholds = undefined;
      return;
    }
    try {
      R.thresholds = computeThresholds(R.config, window);
    } catch (error) {
      R.thresholds = undefined;
      note(ctx, `self-compact configuration rejected: ${(error as Error).message}`, "error");
    }
  }

  function trackLevel(ctx: ExtensionContext): { material: boolean; state: ReturnType<typeof extractCompactState> } {
    const entries = branch(ctx);
    const usage = extractUsage({
      contextUsage: ctx.getContextUsage(),
      entries: entries as never,
      windowFallback: ctx.model?.contextWindow,
    });
    R.usage = usage;
    if (R.staleUsage) {
      // Deferred measurement: keep the previous tier and lock untouched until a real turn runs.
      return { material: false, state: extractCompactState(entries as never, { toolsThisTurn: R.toolsThisTurn }) };
    }
    if (!R.thresholds || R.thresholds.contextWindow !== usage.window) resolveThresholds(ctx);
    const t = R.thresholds;
    const watermark = t ? checkThresholds(usage.usedTokens, t) : "idle";
    const previous = R.level;
    R.level = maxLevel(watermark, "idle");
    // A newer, higher crossing invalidates the old boundary read.
    if (R.level !== previous) R.decision = undefined;
    const material = hasCompactionMaterial(entries as never, keepRecentTokens(ctx), { findCutPoint });
    // A lock only holds while usage is actually at the forced tier or a handoff is still owed.
    if (isStaleLock(R.state, R.level, R.compacting)) unlock(ctx);
    // Re-arm only after usage actually falls back below the forced tier.
    if (R.level !== "forced") R.forceArmed = true;
    if (R.level === "forced" && R.forceArmed && material && !handoffInFlight(R.state)) lock(ctx);
    refreshStatus(ctx);
    return { material, state: extractCompactState(entries as never, { toolsThisTurn: R.toolsThisTurn }) };
  }

  function keepRecentTokens(ctx: ExtensionContext): number {
    try {
      return SettingsManager.create(ctx.cwd).getCompactionKeepRecentTokens(ctx.model ?? undefined);
    } catch {
      return 20_000;
    }
  }

  function refreshStatus(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;
    ctx.ui.setStatus(
      STATUS_KEY,
      formatStatus({
        percent: R.usage.window > 0 ? R.usage.percent : null,
        level: R.level,
        cycle: R.state.cycle,
        silent: R.decision?.tier === "silent" && R.decision.mode === "jev",
        locked: R.state.locked,
      }),
    );
  }

  // ------------------------------------------------------------- state

  function save(ctx: ExtensionContext) {
    try {
      pi.appendEntry(STATE_TYPE, toStateEntry(R.state));
    } catch {
      // Session writes can race a shutdown; the in-memory state stays authoritative.
    }
    refreshStatus(ctx);
  }

  function lock(ctx: ExtensionContext) {
    if (R.state.locked) return;
    // A finished cycle leaves its card behind; a new lock starts a fresh one rather than reviving it.
    const fresh = !handoffInFlight(R.state);
    R.state = {
      ...R.state,
      locked: true,
      phase: fresh ? "pending" : R.state.phase,
      handoff: fresh ? undefined : R.state.handoff,
      error: fresh ? undefined : R.state.error,
    };
    R.retryPending = undefined;
    save(ctx);
  }

  /**
   * The card is in the transcript and the agent works from it: release the lock, mark the cycle
   * done, and forget the crossing so the next watermark produces fresh guidance.
   */
  function unlock(ctx: ExtensionContext) {
    if (!R.state.locked && R.state.phase === "done") return;
    R.state = unlocked(R.state);
    R.noticedLevel = "idle";
    R.decision = undefined;
    R.forceArmed = false;
    save(ctx);
  }

  // ----------------------------------------------------------- guidance

  /** The tier that actually interrupts: Jev's read when it exists, the watermark otherwise. */
  function effectiveTier(): UsageLevel {
    if (R.level === "forced") return "forced";
    if (R.state.locked) return "forced";
    if (R.decision) return R.decision.tier === "silent" ? "idle" : (R.decision.tier as UsageLevel);
    return R.level;
  }

  function guidanceText(material: boolean): string | undefined {
    const t = R.thresholds;
    const values = {
      percent: formatPct(R.usage.percent, 1),
      used: formatTokens(R.usage.usedTokens),
      window: formatTokens(R.usage.window),
      soft: formatPct(t?.softPct ?? null, 0),
      warn: formatPct(t?.warnPct ?? null, 0),
      forced: formatPct(t?.forcedPct ?? null, 0),
      hard: t ? formatPct(t.hardCap.tokens / t.contextWindow * 100, 0) : "90%",
    };
    if (handoffInFlight(R.state)) return renderTemplate(FORCED_PROMPT, values);
    if (R.retryPending) {
      return renderTemplate(RETRY_PROMPT, {
        error: R.retryPending,
        attempt: (R.state.handoff?.attempts ?? 0) + 1,
        max: MAX_RETRIES,
      });
    }
    const tier = effectiveTier();
    if (tier === "forced" && !R.forceArmed && R.state.phase === "done" && !handoffInFlight(R.state)) {
      // A card was just delivered and usage has not fallen yet: say nothing rather than loop.
      return undefined;
    }
    if (tier === "forced") {
      return material
        ? renderTemplate(FORCED_PROMPT, values)
        : `${renderTemplate(FORCED_PROMPT, values)}\n\nNothing is compactable yet (everything fits in the retained recent window), so keep working and compact once there is history to summarize.`;
    }
    if (tier === "recommend") return renderTemplate(RECOMMEND_PROMPT, values);
    if (tier === "notice") return renderTemplate(NOTICE_PROMPT, values);
    return undefined;
  }

  // ---------------------------------------------------------- compaction

  function customInstructions(): string {
    const extra = R.config?.compactPrompt ? `\n${R.config.compactPrompt}` : "";
    return renderTemplate(SUMMARY_INSTRUCTIONS, { cutPoint: R.cutPoint?.instructions ?? "" }) + extra;
  }

  function clearTimers() {
    if (R.deliveryTimer) {
      clearTimeout(R.deliveryTimer);
      R.deliveryTimer = undefined;
    }
    if (R.retryTimer) {
      clearTimeout(R.retryTimer);
      R.retryTimer = undefined;
    }
  }

  function scheduleDelivery(fn: () => void, delayMs = 25) {
    if (R.deliveryTimer || !R.alive) return;
    const epoch = R.epoch;
    R.deliveryTimer = setTimeout(() => {
      R.deliveryTimer = undefined;
      if (R.alive && R.epoch === epoch) fn();
    }, delayMs);
  }

  function scheduleRetry(ctx: ExtensionContext, delayMs = 2_000) {
    if (R.retryTimer || !R.alive) return;
    const epoch = R.epoch;
    R.retryTimer = setTimeout(() => {
      R.retryTimer = undefined;
      if (R.alive && R.epoch === epoch && R.state.phase === "pending" && ctx.isIdle()) {
        startCompaction(ctx, `auto-retry ${(R.state.handoff?.attempts ?? 0) + 1}`);
      }
    }, delayMs);
  }

  function startCompaction(ctx: ExtensionContext, reason: string) {
    if (R.compacting) return;
    const handoff = R.state.handoff;
    if (!handoff) return;
    const material = hasCompactionMaterial(branch(ctx) as never, keepRecentTokens(ctx), { findCutPoint });
    if (!material) {
      // Nothing older than the retained window: skip Pi's summarizer and resume from the card.
      R.state = { ...R.state, phase: "ready" };
      save(ctx);
      R.compacting = false;
      void deliverHandoff(ctx);
      return;
    }
    R.compacting = true;
    R.state = { ...R.state, phase: "compacting", locked: true };
    save(ctx);
    note(ctx, `self-compact: compacting (${reason}).`, "info");
    try {
      ctx.compact({
        customInstructions: customInstructions(),
        onComplete: () => {
          R.compacting = false;
          void deliverHandoff(ctx);
        },
        onError: (error) => {
          // Counting happens in session_compact_failed, which always fires; keep this to logging so
          // one failure never consumes two retries.
          R.compacting = false;
          R.retryPending = error.message;
          note(ctx, `self-compact: compaction error (${error.message}).`, "error");
        },
      });
    } catch (error) {
      R.compacting = false;
      const message = error instanceof Error ? error.message : String(error);
      R.state = { ...R.state, phase: "failed", error: message };
      R.retryPending = message;
      save(ctx);
      note(ctx, `self-compact: could not start compaction (${message}).`, "error");
    }
  }

  async function deliverHandoff(ctx: ExtensionContext) {
    const handoff = R.state.handoff;
    if (!R.alive || !handoff || R.delivering) return;
    if (R.state.phase !== "ready") return;
    if (!ctx.isIdle()) {
      // Inside `session_compact`, Pi's `AgentSession.compact()` has not called
      // `_clearManualCompactionState()` yet, so `ctx.isIdle()` is `false` and `compaction_end`
      // has not finished updating the TUI. Defer delivery until `ctx.isIdle()` turns true.
      scheduleDelivery(() => {
        void deliverHandoff(ctx);
      });
      return;
    }
    if (R.deliveryTimer) {
      clearTimeout(R.deliveryTimer);
      R.deliveryTimer = undefined;
    }
    R.delivering = true;
    try {
      pi.sendMessage(
        {
          customType: HANDOFF_TYPE,
          content: handoff.card,
          display: true,
          details: { id: handoff.id, cycle: handoff.cycle, card: handoff.card, note: handoff.note ?? "" },
        },
        { triggerTurn: true },
      );
      unlock(ctx);
    } finally {
      R.delivering = false;
    }
  }

  /** After an interruption the card is already in the transcript; wake the agent with a one-liner. */
  async function resumeHandoff(ctx: ExtensionContext) {
    const handoff = R.state.handoff;
    if (!R.alive || !handoff || R.delivering) return;
    if (R.state.phase !== "ready") return;
    if (!ctx.isIdle()) {
      scheduleDelivery(() => {
        void resumeHandoff(ctx);
      });
      return;
    }
    if (R.deliveryTimer) {
      clearTimeout(R.deliveryTimer);
      R.deliveryTimer = undefined;
    }
    R.delivering = true;
    try {
      pi.sendMessage(
        {
          customType: HANDOFF_TYPE,
          content: renderResumeMessage(handoff.nextAction, { cycle: handoff.cycle }),
          display: true,
          details: { id: handoff.id, cycle: handoff.cycle, card: handoff.card, resumed: true },
        },
        { triggerTurn: true },
      );
      unlock(ctx);
    } finally {
      R.delivering = false;
    }
  }

  // --------------------------------------------------------------- tools

  pi.registerTool({
    name: VIEW_TOOL_NAME,
    label: "View context usage",
    description:
      "Report live context-window usage, the self-compact watermarks, the current tier, and whether a compaction would have anything to summarize. Pass check_boundary=true to ask the boundary model whether this is a good moment to compact.",
    promptSnippet: "view_context: context usage, watermarks, and boundary check",
    parameters: Type.Object({
      check_boundary: Type.Optional(
        Type.Boolean({ description: "Ask the boundary model whether now is a good moment to compact." }),
      ),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const tracked = trackLevel(ctx);
      const t = R.thresholds;
      const lines = [
        `context: ${formatTokens(R.usage.usedTokens)} / ${formatTokens(R.usage.window)} tokens (${formatPct(R.usage.percent, 1)})`,
        t
          ? `watermarks: notice ${formatPct(t.softPct, 0)} (${t.softAt.tokens} tokens) · recommend ${formatPct(t.warnPct, 0)} (${t.at.tokens}) · forced ${formatPct(t.forcedPct, 0)} (${t.forcedAt.tokens}) · hard ceiling ${t.hardCap.tokens}`
          : "watermarks: unresolved (no context window yet)",
        `tier: ${R.level}${R.state.locked ? " (locked: compaction required)" : ""}`,
        `compaction material: ${tracked.material ? "yes" : "no (everything fits in the retained window)"}`,
        `cycle: ${R.state.cycle}, phase: ${R.state.phase}`,
        `jev: ${R.jev ? R.jev.describe() : "disabled"}`,
      ];
      if (params.check_boundary) {
        const decision = await evaluateBoundary(
          R.jev,
          tracked.state,
          R.usage,
          t ?? computeThresholds(R.config!, Math.max(1, R.usage.window)),
          { timeoutMs: R.config?.jev.timeoutMs },
        );
        R.decision = decision;
        lines.push(`boundary check: ${decision.tier} via ${decision.mode} — ${decision.reason}`);
      }
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: {
          usage: R.usage,
          level: R.level,
          thresholds: t
            ? {
                soft: t.softAt.tokens,
                at: t.at.tokens,
                forced: t.forcedAt.tokens,
                hardCap: t.hardCap.tokens,
                contextWindow: t.contextWindow,
              }
            : undefined,
          material: tracked.material,
        },
      };
    },
  });

  pi.registerTool({
    name: TOOL_NAME,
    label: "Rewrite the conversation as a handoff",
    description:
      "Replace the conversation with a six-field handoff card and continue from it. Call this alone, as the only tool call in the batch, when the context report asks for it. `done` must contain only verified results; unresolved work belongs in `in_progress`.",
    promptSnippet: "self_compact: rewrite the conversation into a handoff card",
    promptGuidelines: [
      "Call self_compact alone: it must be the only tool call in its batch, and the run ends after it.",
      "Never claim an unverified result in `done`.",
      "`note` is the only place long detail survives; it is returned to you verbatim after compaction.",
    ],
    // The card is written once; the run ends so compaction can own the session file.
    executionMode: "sequential",
    parameters: Type.Object({
      goal: Type.String({ description: "What the task is, as it stands now." }),
      done: Type.Array(Type.String(), { description: "Verified results only, one per entry." }),
      in_progress: Type.String({ description: "The step currently under way, and how far it got." }),
      decisions: Type.Array(Type.String(), { description: "Decisions taken, each with its reason." }),
      preserved_refs: Type.Array(Type.String(), { description: "File paths, identifiers, URLs the next step needs." }),
      next_action: Type.String({ description: "The single next action to perform after resuming." }),
      note: Type.Optional(
        Type.String({ maxLength: NOTE_MAX_CHARS, description: `Free-form detail returned to you verbatim (max ${NOTE_MAX_CHARS} chars).` }),
      ),
    }),
    async execute(_id, params, signal, _onUpdate, ctx) {
      let card: HandoffCard;
      try {
        card = validateHandoff(params as never);
      } catch (error) {
        const message = error instanceof HandoffValidationError ? error.message : String(error);
        R.retryPending = message;
        save(ctx);
        return {
          content: [{ type: "text" as const, text: `self_compact rejected: ${message}. Fix that field and call self_compact again, alone.` }],
          details: { error: message },
          isError: true,
        };
      }
      R.retryPending = undefined;
      const cycle = R.state.cycle + 1;

      const entries = branch(ctx);
      const turns = extractTurnSummaries(entries as never);
      R.cutPoint = await pickCutPoint(R.jev, turns, R.config?.jev.minCutPointConfidence ?? 0.5, {
        signal,
        timeoutMs: R.config?.jev.cutPointTimeoutMs,
      });

      const rendered = renderHandoffMessage(card, { cycle, timestamp: new Date().toISOString() });
      const record: HandoffRecord = {
        id: randomUUID(),
        cycle,
        card: rendered,
        nextAction: card.next_action,
        note: card.note,
        // Retries are counted by failures, not by handoff calls: a new cycle starts clean.
        attempts: 0,
        savedAt: new Date().toISOString(),
      };
      R.state = { ...R.state, phase: "pending", cycle, locked: true, handoff: record, error: undefined };
      save(ctx);
      note(ctx, `self-compact: handoff saved (cycle ${cycle}, ${rendered.length} chars). Compacting next.`, "info");

      return {
        content: [
          {
            type: "text" as const,
            text: `Handoff saved for cycle ${cycle}. The conversation will be rewritten now and you will be resumed from this card. Do not do any more work in this turn.`,
          },
        ],
        details: { cycle, handoffId: record.id, cutPoint: R.cutPoint?.turnId },
        terminate: true,
      };
    },
  });

  // ---------------------------------------------------------- tool guard

  function sameBatchToolCalls(ctx: ExtensionContext, toolCallId: string) {
    const entries = branch(ctx);
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i] as { type?: string; message?: { role?: string; content?: unknown } };
      if (entry.type !== "message" || entry.message?.role !== "assistant") continue;
      const content = Array.isArray(entry.message.content) ? (entry.message.content as Array<Record<string, unknown>>) : [];
      const calls = content.filter((block) => block.type === "toolCall");
      if (!calls.some((call) => call.id === toolCallId)) return undefined;
      return calls.map((call) => ({ id: String(call.id ?? ""), name: String(call.name ?? "") }));
    }
    return undefined;
  }

  pi.on("tool_call", async (event, ctx) => {
    trackLevel(ctx);
    if (!R.toolsThisTurn.includes(event.toolName)) R.toolsThisTurn.push(event.toolName);

    // Whole-batch preflight: `self_compact` is only valid as the sole call in its batch.
    const batch = sameBatchToolCalls(ctx, event.toolCallId);
    if (batch && batch.length > 1 && batch.some((call) => call.name === TOOL_NAME)) {
      return {
        block: true,
        reason: `Tool "${event.toolName}" is blocked by self-compact: call ${TOOL_NAME} alone as your only tool call.`,
      };
    }
    if (event.toolName === TOOL_NAME || event.toolName === VIEW_TOOL_NAME) return undefined;
    const material = hasCompactionMaterial(branch(ctx) as never, keepRecentTokens(ctx), { findCutPoint });
    if (shouldBlockTools(R.state, R.level, material) && (handoffInFlight(R.state) || R.forceArmed)) {
      return {
        block: true,
        reason: `Tool "${event.toolName}" is blocked by self-compact: context is at ${formatPct(R.usage.percent, 1)} and compaction is required. Call ${TOOL_NAME} now with the six-field handoff.`,
      };
    }
    return undefined;
  });

  // -------------------------------------------------------------- events

  const recover = (ctx: ExtensionContext, reason: string) => {
    clearTimers();
    R.alive = true;
    R.epoch += 1;
    R.compacting = false;
    R.delivering = false;
    R.level = "idle";
    R.staleUsage = false;
    R.retryPending = undefined;
    R.toolsThisTurn = [];
    R.noticedLevel = "idle";
    R.decision = undefined;
    R.forceArmed = true;
    loadSettings(ctx);
    resolveThresholds(ctx);
    const recovered = recoverState(branch(ctx) as never);
    R.state = recovered.state;
    R.retryPending = recovered.state.error;
    save(ctx);
    if (recovered.action !== "none") {
      note(ctx, `self-compact: recovered on ${reason} — ${recovered.detail}.`, recovered.action === "abandon" ? "error" : "warning");
    }
    return recovered;
  };

  /** Act on what recovery found. Shared by session start and tree switches. */
  function resumeFromRecovery(ctx: ExtensionContext, recovered: ReturnType<typeof recoverState>) {
    if (recovered.action === "deliver") {
      R.state = { ...recovered.state, phase: "ready" };
      void deliverHandoff(ctx);
    } else if (recovered.action === "resume") {
      R.state = { ...recovered.state, phase: "ready" };
      void resumeHandoff(ctx);
    } else if (recovered.action === "retry") {
      startCompaction(ctx, "recovered pending handoff");
    }
  }

  pi.on("session_start", async (event, ctx) => {
    resumeFromRecovery(ctx, recover(ctx, event.reason));
  });

  pi.on("session_tree", async (_event, ctx) => {
    resumeFromRecovery(ctx, recover(ctx, "tree switch"));
  });

  pi.on("session_shutdown", async () => {
    clearTimers();
    R.alive = false;
    R.epoch += 1;
    delete globals[GUARD];
  });

  pi.on("model_select", async (_event, ctx) => {
    // Cycling `enabledModels` with the model shortcut fires this several times a second. The usage
    // numbers still describe the previous model, so measuring here reads an old percentage against
    // a new window and can lock the session on a phantom crossing. Drop the cached watermarks and
    // wait for a real user message (`turn_start`) before measuring again.
    R.thresholds = undefined;
    R.staleUsage = true;
    resolveThresholds(ctx);
  });

  pi.on("turn_start", async () => {
    R.toolsThisTurn = [];
    // A real prompt is the first trustworthy measurement point after a model switch.
    R.staleUsage = false;
  });

  /**
   * Phase one of the decision model: ask Jev for a boundary read once per crossing, and only
   * inside [soft, forced) where a reminder is still useful and material to compact exists.
   */
  pi.on("turn_end", async (_event, ctx) => {
    const tracked = trackLevel(ctx);
    const t = R.thresholds;
    if (!t || !R.jev?.available) return;
    if (R.state.locked || R.compacting || !tracked.material) return;
    if (R.usage.usedTokens < t.softAt.tokens || R.usage.usedTokens >= t.forcedAt.tokens) return;
    if (tracked.state.turns < 2 && tracked.state.toolsThisTurn.length === 0) return;

    const decision = await evaluateBoundary(R.jev, tracked.state, R.usage, t, {
      alreadyNoticed: R.noticedLevel !== "idle" && R.level === "notice",
      alreadyRecommended: R.level === "recommend" && R.decision?.tier === "recommend",
      signal: ctx.signal,
      timeoutMs: R.config?.jev.timeoutMs,
    });
    R.decision = decision;
    if (decision.tier === "notice" || decision.tier === "recommend") R.noticedLevel = decision.tier;
    refreshStatus(ctx);
  });

  pi.on("context", async (event, ctx) => {
    const tracked = trackLevel(ctx);
    const messages = event.messages.filter(
      (message) => !(message.role === "custom" && (message as { customType?: string }).customType === GUIDANCE_TYPE),
    );
    const text = guidanceText(tracked.material);
    if (text) {
      messages.push({ role: "custom", customType: GUIDANCE_TYPE, content: text, display: false } as never);
    }
    return { messages };
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role === "assistant") {
      trackLevel(ctx);
      return;
    }
    const message = event.message as { role?: string; customType?: string };
    if (message.role === "custom" && message.customType === HANDOFF_TYPE) {
      // The card is journaled verbatim: the cycle is complete and the lock must go, or the resumed
      // turn would have every tool blocked and would be told to write the card again.
      unlock(ctx);
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    const tracked = trackLevel(ctx);
    if (R.level !== "forced" || !R.forceArmed || handoffInFlight(R.state) || !tracked.material) return;
    // Forced is the only tier allowed to keep the agent awake on its own.
    pi.sendMessage(
      { customType: GUIDANCE_TYPE, content: renderTemplate(FORCED_PROMPT, forcedValues()), display: false },
      { triggerTurn: true, deliverAs: "followUp" },
    );
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (!R.alive) return;
    trackLevel(ctx);
    if (!ctx.isIdle()) return;
    if (R.state.phase === "pending" || R.state.phase === "compacting") {
      startCompaction(ctx, R.state.phase === "pending" ? "agent idle" : "resuming compaction");
      return;
    }
    if (R.state.phase === "ready") {
      await deliverHandoff(ctx);
    }
  });

  pi.on("session_before_compact", async (event, ctx) => {
    if (event.reason !== "manual") {
      // Pi's own threshold compaction would race the agent's own handoff: refuse it and lock
      // the session so the next turn writes a card instead.
      lock(ctx);
      R.level = maxLevel(R.level, "forced");
      return { cancel: true };
    }
    if (handoffInFlight(R.state) && R.state.phase !== "compacting") {
      // `startCompaction` already persisted this phase; only an external /compact lands here.
      R.state = { ...R.state, phase: "compacting", locked: true };
      save(ctx);
    }
    return undefined;
  });

  pi.on("session_compact", async (event, ctx) => {
    R.compacting = false;
    if (handoffInFlight(R.state)) {
      R.state = { ...R.state, phase: "ready", locked: true };
      save(ctx);
      await deliverHandoff(ctx);
    } else if (R.state.locked) {
      unlock(ctx);
    }
    void event;
  });

  pi.on("session_compact_failed", async (event, ctx) => {
    R.compacting = false;
    if (!handoffInFlight(R.state)) return;
    const attempts = (R.state.handoff?.attempts ?? 0) + 1;
    const exhausted = attempts >= MAX_RETRIES;
    R.state = {
      ...R.state,
      phase: exhausted ? "failed" : "pending",
      // Exhausted retries must not deadlock the session: unlock and surface the failure.
      locked: exhausted ? false : R.state.locked,
      handoff: R.state.handoff ? { ...R.state.handoff, attempts } : undefined,
      error: event.errorMessage ?? (event.aborted ? "compaction aborted" : "compaction failed"),
    };
    R.retryPending = exhausted ? undefined : R.state.error;
    save(ctx);
    note(
      ctx,
      exhausted
        ? `self-compact: compaction failed ${attempts} times (${R.state.error}). Unlocking every tool; your handoff is kept.`
        : `self-compact: compaction failed (${R.state.error}). Retry ${attempts}/${MAX_RETRIES}.`,
      "error",
    );
    if (!exhausted && !event.aborted) {
      scheduleRetry(ctx, 2_000 * attempts);
    }
  });

  function forcedValues() {
    const t = R.thresholds;
    return {
      percent: formatPct(R.usage.percent, 1),
      used: formatTokens(R.usage.usedTokens),
      window: formatTokens(R.usage.window),
      soft: formatPct(t?.softPct ?? null, 0),
      warn: formatPct(t?.warnPct ?? null, 0),
      forced: formatPct(t?.forcedPct ?? null, 0),
      hard: t ? formatPct((t.hardCap.tokens / t.contextWindow) * 100, 0) : "90%",
    };
  }

  // ----------------------------------------------------------- commands

  pi.registerCommand("self-compact-info", {
    description: "Show self-compact state: context bar, watermarks, tier, handoff, Jev status.",
    handler: async (_args, ctx) => {
      const tracked = trackLevel(ctx);
      const t = R.thresholds;
      const bar = renderContextBar({
        usedPct: R.usage.window > 0 ? R.usage.percent : null,
        cachedPct: R.usage.window > 0 ? (R.usage.cachedTokens / R.usage.window) * 100 : 0,
        softPct: t?.softPct ?? 0,
        warnPct: t?.warnPct ?? 0,
        forcedPct: t?.forcedPct ?? 0,
        usedTokens: R.usage.usedTokens,
        window: R.usage.window,
      });
      const decision = R.decision;
      const probabilities = decision?.scores
        ? `switched_gears ${fmtScore(decision.scores.switchedGears)} · at_boundary ${fmtScore(decision.scores.atBoundary)} · mid_operation ${fmtScore(decision.scores.midOperation)} · needs_history ${decision.scores.needsHistory?.split(" ")[0] ?? "?"}`
        : "not evaluated";
      const lines = renderInfoPanel({
        title: "self-compact",
        rows: [
          ["bar", `${bar.cells.join("")} ${bar.label}`],
          ["context", `${formatTokens(R.usage.usedTokens)} / ${formatTokens(R.usage.window)} (${formatPct(R.usage.percent, 1)})`],
          ["cached", `${formatTokens(R.usage.cachedTokens)} tokens`],
          [
            "watermarks",
            t
              ? `notice ${t.softAt.raw} (${t.softAt.tokens}) · at ${t.at.raw} (${t.at.tokens}) · forced ${formatPct(t.forcedPct, 1)} (${t.forcedAt.tokens}) · hard ${t.hardCap.tokens}`
              : "unresolved (no context window yet)",
          ],
          ["tier", `${effectiveTier()}${R.state.locked ? " (locked)" : ""}`],
          ["decision", decision ? `${decision.tier} via ${decision.mode} — ${decision.reason}` : "not evaluated"],
          ["probabilities", probabilities],
          ["phase", `${R.state.phase} · cycle ${R.state.cycle}`],
          ["material", tracked.material ? "yes" : "no (everything fits the retained window)"],
          ["jev", R.jev ? R.jev.describe() : "disabled"],
          ["handoff", R.state.handoff ? `${R.state.handoff.id.slice(0, 8)} · attempts ${R.state.handoff.attempts}` : "none"],
          ["config", R.configNotes.length > 0 ? R.configNotes.join("; ") : "ok"],
        ],
      });
      try {
        pi.appendEntry(INFO_ENTRY_TYPE, { lines, at: Date.now() });
      } catch {
        // Non-fatal: the panel is also delivered as a notification.
      }
      note(ctx, lines.join("\n"), "info");
    },
  });

  pi.registerCommand("self-compact-now", {
    description: "Ask the agent to write its handoff and compact immediately.",
    handler: async (_args, ctx) => {
      trackLevel(ctx);
      pi.sendUserMessage(
        `Write your six-field handoff now and call \`${TOOL_NAME}\` alone as your only tool call. Context is at ${formatPct(R.usage.percent, 1)}.`,
        { deliverAs: "followUp" },
      );
      note(ctx, "self-compact: queued an immediate handoff request.", "info");
    },
  });

  function fmtScore(value: number | undefined): string {
    return (value ?? 0).toFixed(2);
  }

  // ----------------------------------------------------------- renderers
  //
  // A message/entry renderer must return a TUI `Component` — `render(width)` plus `invalidate()`.
  // Returning a hand-rolled `{ render: () => string[] }` made the layout reserve the wrong height
  // (the multi-line card counted as a single row) and skip invalidation, which left stale
  // fragments of the card on screen above the editor. The handoff card now uses Pi's default
  // rendering, which draws the card as Markdown in a labelled box.

  pi.registerEntryRenderer(PHASE_ENTRY_TYPE, (entry, _options, theme) => {
    const data = entry.data as { level?: CompactTier; text?: string } | undefined;
    return new Text(theme.fg("dim", data?.text ?? "self-compact"), 0, 0) as never;
  });

  pi.registerEntryRenderer(INFO_ENTRY_TYPE, (entry, _options, theme) => {
    const lines = (entry.data as { lines?: string[] } | undefined)?.lines ?? [];
    const [title, ...rest] = lines;
    const box = new Container();
    box.addChild(new Text(theme.fg("accent", theme.bold(title ?? "self-compact")), 0, 0));
    for (const line of rest) box.addChild(new Text(theme.fg("text", line), 0, 0));
    return box as never;
  });

  function note(ctx: ExtensionContext, text: string, kind: "info" | "warning" | "error") {
    if (ctx.hasUI) ctx.ui.notify(text, kind);
  }

  void isTrip;
  void estimateEntryTokens;
  void findCutPointLocal;
}
