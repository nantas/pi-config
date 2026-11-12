/**
 * Unit tests for the pure modules of the self-compact extension.
 *
 * Run with: node --test .pi/extensions/self-compact/test/self-compact.test.ts
 *
 * Nothing here imports Pi or `typebox`, so the suite runs without the Pi runtime installed.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BUILTIN_CONFIG,
  checkThresholds,
  computeThresholds,
  extractUsage,
  latestCachedTokens,
  loadConfig,
  parseSpec,
  type SelfCompactConfig,
} from "../thresholds.ts";
import { JevClient, choiceProbabilities, mockAnswers, noul, score } from "../jev-client.ts";
import {
  MIN_TURNS_FOR_CUT,
  boundaryQuestions,
  decideTier,
  evaluateBoundary,
  extractCompactState,
  extractTurnSummaries,
  pickCutPoint,
} from "../boundary-gate.ts";
import {
  NOTE_MAX_CHARS,
  HandoffValidationError,
  renderHandoffCard,
  renderHandoffMessage,
  renderResumeMessage,
  renderTemplate,
  validateHandoff,
} from "../handoff.ts";
import {
  MAX_RETRIES,
  STATE_TYPE,
  findCutPointLocal,
  handoffInFlight,
  hasCompactionMaterial,
  initialState,
  isStaleLock,
  recoverState,
  shouldBlockTools,
  unlocked,
} from "../state.ts";
import { BAR_CELLS, formatStatus, markerIndex, renderContextBar } from "../context-bar.ts";

const WINDOW = 200_000;

function config(overrides: Partial<SelfCompactConfig> = {}): SelfCompactConfig {
  return { ...BUILTIN_CONFIG, ...overrides, jev: { ...BUILTIN_CONFIG.jev, ...overrides.jev } };
}

// ------------------------------------------------------------------ thresholds

describe("thresholds", () => {
  it("parses percentages and absolute token counts", () => {
    assert.equal(parseSpec("10%", "softAt", WINDOW).tokens, 20_000);
    assert.equal(parseSpec("32000", "softAt", WINDOW).tokens, 32_000);
    assert.equal(parseSpec("2.5%", "softAt", WINDOW).tokens, 5_000);
    assert.equal(parseSpec("100k", "softAt", WINDOW).tokens, 100_000);
    assert.equal(parseSpec("1m", "softAt", WINDOW).tokens, 1_000_000);
    assert.equal(parseSpec("32K", "softAt", WINDOW).tokens, 32_000);
    assert.equal(parseSpec("0.5k", "softAt", WINDOW).tokens, 500);
  });

  it("rejects unusable threshold strings", () => {
    assert.throws(() => parseSpec("abc", "softAt", WINDOW), /must look like/);
    assert.throws(() => parseSpec("0%", "softAt", WINDOW), /greater than 0/);
    assert.throws(() => parseSpec("-5", "softAt", WINDOW), /must look like/);
  });

  it("resolves 10% / 20% / +10% to 20k, 40k, 60k on a 200k window", () => {
    const t = computeThresholds(config(), WINDOW);
    assert.equal(t.softAt.tokens, 20_000);
    assert.equal(t.at.tokens, 40_000);
    assert.equal(t.forcedAt.tokens, 60_000);
    assert.equal(t.hardCap.tokens, 180_000);
    assert.equal(t.forcedPct, 30);
  });

  it("clamps the forced tier to the hard ceiling", () => {
    const t = computeThresholds(config({ at: "85%", buffer: "20%" }), WINDOW);
    assert.equal(t.at.tokens, 170_000);
    assert.equal(t.forcedAt.tokens, 180_000);
    assert.equal(t.forcedAt.tokens, t.hardCap.tokens);
  });

  it("rejects inverted watermarks", () => {
    assert.throws(() => computeThresholds(config({ softAt: "30%", at: "20%" }), WINDOW), /must not exceed/);
    assert.throws(() => computeThresholds(config({ buffer: "0%" }), WINDOW), /greater than 0|must leave room/);
    assert.throws(() => computeThresholds(config({ at: "95%" }), WINDOW), /hard ceiling/);
  });

  it("classifies token counts into the four tiers", () => {
    const t = computeThresholds(config(), WINDOW);
    assert.equal(checkThresholds(0, t), "idle");
    assert.equal(checkThresholds(19_999, t), "idle");
    assert.equal(checkThresholds(20_000, t), "notice");
    assert.equal(checkThresholds(39_999, t), "notice");
    assert.equal(checkThresholds(40_000, t), "recommend");
    assert.equal(checkThresholds(60_000, t), "forced");
    assert.equal(checkThresholds(500_000, t), "forced");
  });
});

describe("usage extraction", () => {
  it("takes cached tokens from the newest assistant message", () => {
    const entries = [
      { type: "message", message: { role: "user", usage: null } },
      { type: "message", message: { role: "assistant", usage: { cacheRead: 1_000 } } },
      { type: "message", message: { role: "assistant", usage: { cacheRead: 9_000 } } },
      { type: "message", message: { role: "user", usage: null } },
    ];
    assert.equal(latestCachedTokens(entries), 9_000);
  });

  it("ignores cached tokens from before the last compaction", () => {
    const entries = [
      { type: "message", message: { role: "assistant", usage: { cacheRead: 9_000 } } },
      { type: "compaction" },
      { type: "message", message: { role: "user", usage: null } },
    ];
    assert.equal(latestCachedTokens(entries), 0);
  });

  it("derives the percentage from tokens and never exceeds the used count", () => {
    const usage = extractUsage({
      contextUsage: { tokens: 50_000, contextWindow: WINDOW },
      entries: [{ type: "message", message: { role: "assistant", usage: { cacheRead: 80_000 } } }],
    });
    assert.equal(usage.percent, 25);
    assert.equal(usage.cachedTokens, 50_000);
  });

  it("falls back to zero when usage is unknown", () => {
    const usage = extractUsage({ contextUsage: { tokens: null, contextWindow: WINDOW } });
    assert.equal(usage.usedTokens, 0);
    assert.equal(usage.percent, 0);
  });
});

describe("config loading", () => {
  const files: Record<string, string> = {
    "/managed/.pi/managed/self-compact.json": JSON.stringify({ softAt: "5%", jev: { provider: "mock" } }),
    "/home/.pi/agent/self-compact.json": JSON.stringify({ at: "30%" }),
    "/repo/.pi/self-compact.json": JSON.stringify({ buffer: "15%" }),
  };
  const readFile = (path: string) => files[path];

  it("merges managed < global < project < flags", () => {
    const loaded = loadConfig({
      cwd: "/repo",
      home: "/home",
      managedPath: "/managed/.pi/managed/self-compact.json",
      flags: { softAt: "3%" },
      readFile,
    });
    assert.equal(loaded.config.softAt, "3%");
    assert.equal(loaded.config.at, "30%");
    assert.equal(loaded.config.buffer, "15%");
    assert.equal(loaded.config.jev.provider, "mock");
    assert.equal(loaded.config.hardCeilingPercent, 90);
    assert.deepEqual(
      loaded.sources.map((source) => source.kind),
      ["builtin", "managed", "global", "project", "flag"],
    );
  });

  it("ignores a malformed file instead of failing to start", () => {
    const loaded = loadConfig({
      cwd: "/repo",
      home: "/home",
      managedPath: "/missing.json",
      readFile: (path) => (path === "/repo/.pi/self-compact.json" ? "{not json" : undefined),
    });
    assert.equal(loaded.config.softAt, BUILTIN_CONFIG.softAt);
    assert.equal(loaded.notes.length, 1);
  });
});

// -------------------------------------------------------------------- jev

describe("jev client", () => {
  it("is unavailable without a credential", () => {
    const client = new JevClient({ config: BUILTIN_CONFIG.jev, env: {} });
    assert.equal(client.available, false);
    assert.match(client.describe(), /jev unavailable/);
  });

  it("prefers TypeSafe and falls back to OpenRouter", () => {
    const typesafe = new JevClient({ config: BUILTIN_CONFIG.jev, env: { TYPESAFE_API_KEY: "a", OPENROUTER_API_KEY: "b" } });
    assert.equal(typesafe.provider, "typesafe");
    const openrouter = new JevClient({ config: BUILTIN_CONFIG.jev, env: { OPENROUTER_API_KEY: "b" } });
    assert.equal(openrouter.provider, "openrouter");
  });

  it("answers every question type through the mock responder", async () => {
    const client = new JevClient({ config: BUILTIN_CONFIG.jev, provider: "mock" });
    const questions = {
      a: noul("is it?") ,
      b: { type: "choice" as const, prompt: "pick", criteria: { x: "first", y: "second" } },
      c: score("how much", ["low", "high"]),
    };
    const result = await client.ask("state", questions);
    assert.equal(result.answers.a?.type, "noul");
    assert.equal(result.answers.b?.type, "choice");
    assert.equal(result.answers.c?.type, "score");
    assert.deepEqual(Object.keys(choiceProbabilities(result.answers, "b") ?? {}), ["x", "y"]);
  });

  it("retries a retryable status then succeeds", async () => {
    let calls = 0;
    const client = new JevClient({
      config: { ...BUILTIN_CONFIG.jev, timeoutMs: 5_000 },
      provider: "typesafe",
      apiKey: "k",
      retryDelayMs: 0,
      fetchImpl: (async () => {
        calls++;
        if (calls === 1) return new Response("busy", { status: 429 });
        return new Response(JSON.stringify({ answers: { a: { type: "noul", noul: 0.9, confidence: 0.8 } } }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    const result = await client.ask("state", { a: noul("is it?") });
    assert.equal(calls, 2);
    assert.equal(result.attempts, 2);
    assert.equal(result.answers.a?.type, "noul");
  });

  it("throws JevUnavailableError on a non-retryable status", async () => {
    const client = new JevClient({
      config: BUILTIN_CONFIG.jev,
      provider: "typesafe",
      apiKey: "k",
      fetchImpl: (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch,
    });
    await assert.rejects(() => client.ask("state", { a: noul("is it?") }), /TYPESAFE_API_KEY/);
  });

  it("drops answers whose shape does not match the question", async () => {
    const client = new JevClient({
      config: BUILTIN_CONFIG.jev,
      provider: "mock",
      respond: () => ({ a: { type: "choice", choice: "x", probabilities: {}, confidence: 1 } }),
    });
    const result = await client.ask("state", { a: noul("is it?") });
    assert.deepEqual(result.answers, {});
  });
});

// ----------------------------------------------------------- boundary gate

describe("boundary gate", () => {
  const thresholds = computeThresholds(config(), WINDOW);
  const usage = { usedTokens: 50_000, cachedTokens: 0, window: WINDOW, percent: 25 };
  const state = {
    currentRequest: "wire the gate",
    previousWork: ["assistant: wrote thresholds.ts", "assistant: wrote jev-client.ts"],
    recentTurn: ["assistant: [tool bash]"],
    toolsThisTurn: ["bash"],
    turns: 4,
    lastRole: "assistant",
    pendingToolCalls: 0,
    messages: 9,
  };

  function gateOptions(extra: { alreadyNoticed?: boolean; alreadyRecommended?: boolean } = {}) {
    return extra;
  }

  function gateClient(answers: Record<string, number | string | number[]>) {
    return new JevClient({
      config: BUILTIN_CONFIG.jev,
      provider: "mock",
      respond: () => {
        const out: Record<string, unknown> = {};
        for (const [id, question] of Object.entries(boundaryQuestions())) {
          const value = answers[id];
          if (question.type === "noul") {
            out[id] = { type: "noul", noul: typeof value === "number" ? value : 0.5, confidence: 0.9 };
          } else {
            out[id] = {
              type: "score",
              score: 0,
              probabilities: { "0": 0.8, "1": 0.15, "2": 0.05 },
              legend: { "0": "low", "1": "medium", "2": "high" },
              confidence: 0.9,
            };
          }
        }
        return out as never;
      },
    });
  }

  it("asks four questions", () => {
    assert.deepEqual(Object.keys(boundaryQuestions()).sort(), [
      "at_boundary",
      "mid_operation",
      "needs_history",
      "switched_gears",
    ]);
  });

  it("keeps quiet mid-operation", async () => {
    const decision = await evaluateBoundary(
      gateClient({ mid_operation: 0.9, switched_gears: 0.9, at_boundary: 0.9 }),
      state,
      usage,
      thresholds,
      gateOptions(),
    );
    assert.equal(decision.tier, "silent");
    assert.equal(decision.mode, "jev");
  });

  it("speaks at a gear switch", async () => {
    const decision = await evaluateBoundary(
      gateClient({ mid_operation: 0.1, switched_gears: 0.9, at_boundary: 0.9 }),
      state,
      usage,
      thresholds,
      gateOptions(),
    );
    assert.equal(decision.tier, "recommend");
  });

  it("stays quiet at a boundary that needs older history", () => {
    assert.equal(
      decideTier({ midOperation: 0.1, switchedGears: 0.1, atBoundary: 0.9, needsHistory: "high" }, "recommend"),
      "silent",
    );
    assert.equal(
      decideTier({ midOperation: 0.1, switchedGears: 0.1, atBoundary: 0.9, needsHistory: "low" }, "recommend"),
      "recommend",
    );
  });

  it("never lets Jev suppress the forced tier", async () => {
    const forcedUsage = { usedTokens: 61_000, cachedTokens: 0, window: WINDOW, percent: 30.5 };
    const decision = await evaluateBoundary(gateClient({ mid_operation: 0.99 }), state, forcedUsage, thresholds);
    assert.equal(decision.tier, "forced");
  });

  it("falls back to the watermark when Jev is unavailable", async () => {
    const unavailable = new JevClient({ config: BUILTIN_CONFIG.jev, env: {} });
    const decision = await evaluateBoundary(unavailable, state, usage, thresholds);
    assert.equal(decision.tier, "recommend");
    assert.equal(decision.mode, "watermark");
  });

  it("falls back to the watermark when the Jev call fails", async () => {
    const broken = new JevClient({
      config: BUILTIN_CONFIG.jev,
      provider: "typesafe",
      apiKey: "k",
      fetchImpl: (async () => {
        throw new Error("socket hang up");
      }) as unknown as typeof fetch,
    });
    const noticeUsage = { usedTokens: 21_000, cachedTokens: 0, window: WINDOW, percent: 10.5 };
    const decision = await evaluateBoundary(broken, state, noticeUsage, thresholds);
    assert.equal(decision.tier, "notice");
    assert.match(decision.reason, /socket hang up/);
  });

  it("does not repeat a delivered notice", async () => {
    const noticeUsage = { usedTokens: 21_000, cachedTokens: 0, window: WINDOW, percent: 10.5 };
    const decision = await evaluateBoundary(gateClient({}), state, noticeUsage, thresholds, { alreadyNoticed: true });
    assert.equal(decision.tier, "silent");
  });
});

describe("cut points", () => {
  const turns = [
    { index: 0, id: "t1", request: "first", reply: "done" },
    { index: 2, id: "t2", request: "second", reply: "done" },
    { index: 4, id: "t3", request: "third", reply: "still going" },
  ];

  function client(choice: string, confidence: number, completed = 0.9) {
    return new JevClient({
      config: BUILTIN_CONFIG.jev,
      provider: "mock",
      respond: () => ({
        live_from: { type: "choice", choice, probabilities: { t1: 0.1, t2: 0.2, t3: 0.7 }, confidence },
        has_completed_prefix: { type: "noul", noul: completed, confidence: 0.9 },
      }),
    });
  }

  it("returns the chosen turn and injects a cut instruction", async () => {
    const cut = await pickCutPoint(client("t3", 0.9), turns, 0.5);
    assert.ok(cut);
    assert.equal(cut.turnId, "t3");
    assert.match(cut.instructions, /t3/);
    assert.match(cut.instructions, /completed earlier work/);
    assert.match(cut.instructions, /preserve full technical detail/);
  });

  it("refuses to cut when the earlier turns are not finished", async () => {
    assert.equal(await pickCutPoint(client("t2", 0.9, 0.1), turns, 0.5), undefined);
  });

  it("refuses a cut that lands on the first turn", async () => {
    assert.equal(await pickCutPoint(client("t1", 0.9), turns, 0.5), undefined);
  });

  it("refuses a choice the model itself only weakly prefers", async () => {
    const weak = new JevClient({
      config: BUILTIN_CONFIG.jev,
      provider: "mock",
      respond: () => ({
        live_from: { type: "choice", choice: "t3", probabilities: { t1: 0.4, t2: 0.35, t3: 0.25 }, confidence: 0.4 },
        has_completed_prefix: { type: "noul", noul: 0.9, confidence: 0.9 },
      }),
    });
    assert.equal(await pickCutPoint(weak, turns, 0.1), undefined);
  });

  it("gives up on low confidence", async () => {
    assert.equal(await pickCutPoint(client("t3", 0.2), turns, 0.5), undefined);
  });

  it("gives up on an unknown turn", async () => {
    assert.equal(await pickCutPoint(client("t9", 0.99), turns, 0.5), undefined);
  });

  it("never asks with fewer than three turns", async () => {
    assert.equal(await pickCutPoint(client("t1", 0.99), turns.slice(0, MIN_TURNS_FOR_CUT - 1), 0), undefined);
  });

  it("extracts turns from the entries after the last compaction", () => {
    const entries = [
      { type: "message", id: "old", message: { role: "user", content: "old request" } },
      { type: "compaction" },
      { type: "message", id: "t1", message: { role: "user", content: "new request" } },
      { type: "message", id: "a1", message: { role: "assistant", content: [{ type: "text", text: "reply" }] } },
    ];
    const summaries = extractTurnSummaries(entries as never);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0]!.id, "t1");
    assert.equal(summaries[0]!.reply, "reply");
  });

  it("counts turns and pending tool calls for the state description", () => {
    const state = extractCompactState([
      { type: "message", message: { role: "user", content: "go" } },
      {
        type: "message",
        message: { role: "assistant", content: [{ type: "toolCall", name: "bash" }, { type: "text", text: "ok" }] },
      },
    ]);
    assert.equal(state.turns, 1);
    assert.equal(state.pendingToolCalls, 1);
    assert.equal(state.lastRole, "assistant");
  });
});

// ----------------------------------------------------------------- handoff

describe("handoff", () => {
  const valid = {
    goal: "Ship the extension",
    done: ["wrote thresholds"],
    in_progress: "writing tests",
    decisions: ["pure modules only"],
    preserved_refs: [".pi/extensions/self-compact/index.ts"],
    next_action: "run node --test",
  };

  it("accepts a complete card", () => {
    const card = validateHandoff(valid);
    assert.equal(card.goal, valid.goal);
    assert.deepEqual(card.done, valid.done);
    assert.equal(card.note, undefined);
  });

  it("names the offending field and its limit", () => {
    assert.throws(() => validateHandoff({ ...valid, goal: "  " }), /goal must not be empty/);
    assert.throws(() => validateHandoff({ ...valid, done: "no" as never }), /done must be an array/);
    assert.throws(() => validateHandoff({ ...valid, note: "x".repeat(NOTE_MAX_CHARS + 1) }), /limit is 24000/);
  });

  it("renders the six fields in order", () => {
    const card = validateHandoff({ ...valid, note: "remember the seam" });
    const text = renderHandoffCard(card, { cycle: 3 });
    const order = [
      "[self-compact · handoff · cycle 3]",
      "## Goal",
      "## Done",
      "## In Progress",
      "## Key Decisions",
      "## Preserved References & Observation Handles",
      "## Next Action",
    ];
    let cursor = -1;
    for (const heading of order) {
      const at = text.indexOf(heading);
      assert.ok(at > cursor, `${heading} out of order`);
      cursor = at;
    }
    assert.match(text, /cycle 3/);
    assert.doesNotMatch(text, /remember the seam/);
  });

  it("returns the note verbatim in the delivered message", () => {
    const card = validateHandoff({ ...valid, note: "exact detail" });
    const message = renderHandoffMessage(card, { cycle: 1 });
    assert.match(message, /<note_to_self>\nexact detail\n<\/note_to_self>/);
    assert.match(message, /Continue from \*\*Next Action\*\* only: run node --test/);
  });

  it("keeps the resumed wake-up short and does not repeat the card", () => {
    const message = renderResumeMessage("run node --test", { cycle: 2 });
    assert.match(message, /\[self-compact · resumed · cycle 2\]/);
    assert.match(message, /run node --test/);
    assert.doesNotMatch(message, /## Goal/);
  });

  it("fills template placeholders and leaves unknown ones alone", () => {
    assert.equal(renderTemplate("a {{x}} b {{y}}", { x: 1 }), "a 1 b {{y}}");
  });

  it("rejects a non-string note", () => {
    assert.throws(() => validateHandoff({ ...valid, note: 5 as never }), HandoffValidationError);
  });
});

// ------------------------------------------------------------------- state

describe("state recovery", () => {
  const handoff = {
    id: "h1",
    cycle: 1,
    card: "# Handoff",
    nextAction: "continue",
    note: "n",
    attempts: 1,
    savedAt: "2026-01-01T00:00:00.000Z",
  };

  function stateEntry(overrides: Record<string, unknown>) {
    return { type: "custom", customType: STATE_TYPE, data: { version: 1, cycle: 1, locked: true, ...overrides } };
  }

  it("starts idle on an empty branch", () => {
    const result = recoverState([]);
    assert.equal(result.state.phase, "idle");
    assert.equal(result.action, "none");
  });

  it("delivers the handoff when compaction landed without a resume message", () => {
    const result = recoverState([stateEntry({ phase: "compacting", handoff }), { type: "compaction" }]);
    assert.equal(result.action, "deliver");
    assert.equal(result.state.phase, "ready");
  });

  it("resumes the agent when the resume message was never answered", () => {
    const result = recoverState([
      stateEntry({ phase: "compacting", handoff }),
      { type: "compaction" },
      { type: "custom_message", customType: "self-compact-handoff" },
    ]);
    assert.equal(result.action, "resume");
  });

  it("does nothing when the resumed turn already ran", () => {
    const result = recoverState([
      stateEntry({ phase: "compacting", handoff }),
      { type: "compaction" },
      { type: "custom_message", customType: "self-compact-handoff" },
      { type: "message", message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
    ]);
    assert.equal(result.action, "none");
    assert.equal(result.state.phase, "done");
  });

  it("retries a handoff whose compaction never landed", () => {
    const result = recoverState([stateEntry({ phase: "pending", handoff })]);
    assert.equal(result.action, "retry");
  });

  it("abandons after the retry budget", () => {
    const result = recoverState([
      stateEntry({ phase: "pending", handoff: { ...handoff, attempts: MAX_RETRIES } }),
    ]);
    assert.equal(result.action, "abandon");
    assert.equal(result.state.phase, "failed");
  });

  it("ignores a state entry from an unknown version", () => {
    const result = recoverState([{ type: "custom", customType: STATE_TYPE, data: { version: 99 } }]);
    assert.equal(result.action, "none");
    assert.equal(result.state.phase, "idle");
  });

  it("clears a stale lock that has no handoff", () => {
    const result = recoverState([stateEntry({ phase: "pending", locked: true })]);
    assert.equal(result.action, "unlock");
    assert.equal(result.state.locked, false);
    assert.equal(result.state.phase, "idle");
  });

  // The state entry is appended *after* a successful compaction, so recovery must look at the whole
  // branch rather than only the entries following the state entry.
  it("delivers when the state entry was saved after the compaction", () => {
    const result = recoverState([{ type: "compaction" }, stateEntry({ phase: "ready", locked: true, handoff })]);
    assert.equal(result.action, "deliver");
    assert.equal(result.state.phase, "ready");
  });

  it("resumes when a post-compaction card was never answered", () => {
    const result = recoverState([
      { type: "compaction" },
      stateEntry({ phase: "ready", locked: true, handoff }),
      { type: "custom_message", customType: "self-compact-handoff" },
    ]);
    assert.equal(result.action, "resume");
  });

  it("completes the cycle when the resumed turn already answered", () => {
    const result = recoverState([
      { type: "compaction" },
      stateEntry({ phase: "ready", locked: true, handoff }),
      { type: "custom_message", customType: "self-compact-handoff" },
      { type: "message", message: { role: "assistant", content: [{ type: "text", text: "carried on" }] } },
    ]);
    assert.equal(result.action, "none");
    assert.equal(result.state.phase, "done");
    assert.equal(result.state.locked, false);
  });

  it("does nothing once the cycle is done", () => {
    const result = recoverState([{ type: "compaction" }, stateEntry({ phase: "done", locked: false, handoff })]);
    assert.equal(result.action, "none");
    assert.equal(result.state.locked, false);
  });
});

describe("delivery transition", () => {
  const handoff = {
    id: "h1",
    cycle: 1,
    card: "[self-compact · handoff · cycle 1]",
    nextAction: "continue",
    note: undefined,
    attempts: 0,
    savedAt: "2026-01-01T00:00:00.000Z",
  };

  it("keeps a saved handoff in flight", () => {
    assert.equal(handoffInFlight({ ...initialState(), phase: "pending", locked: true, handoff }), true);
    assert.equal(handoffInFlight({ ...initialState(), phase: "ready", locked: true, handoff }), true);
  });

  it("ends the cycle when the card is delivered", () => {
    const state = unlocked({ ...initialState(), phase: "ready", locked: true, handoff });
    assert.equal(state.phase, "done");
    assert.equal(state.locked, false);
    assert.equal(handoffInFlight(state), false);
    // A delivered card must not re-lock the session it just resumed.
    assert.equal(shouldBlockTools(state, "forced", true), true, "forced with material still blocks");
    assert.equal(shouldBlockTools(state, "recommend", true), false);
    const again = unlocked(state);
    assert.equal(again.phase, "done");
    assert.equal(again.locked, false);
  });

  it("never blocks tools for forced usage when nothing is compactable", () => {
    assert.equal(shouldBlockTools(initialState(), "forced", false), false);
  });

  // Regression: a lock taken under a smaller context window (or before a model switch) survived,
  // because the level never reached forced again and no handoff existed to finish the cycle. Every
  // tool stayed blocked at a low percentage, with no card left to deliver.
  it("releases a stale lock once usage falls back below the forced tier", () => {
    const stale = { ...initialState(), phase: "pending" as const, locked: true };
    assert.equal(isStaleLock(stale, "notice", false), true);
    assert.equal(isStaleLock(stale, "idle", false), true);
    assert.equal(shouldBlockTools(stale, "idle", true), true, "a stale lock still blocks until released");
    const released = unlocked(stale);
    assert.equal(isStaleLock(released, "idle", false), false);
    assert.equal(shouldBlockTools(released, "idle", true), false);
  });

  it("keeps a lock that is still doing work", () => {
    const forced = { ...initialState(), phase: "pending" as const, locked: true };
    assert.equal(isStaleLock(forced, "forced", false), false, "at the forced tier the lock is live");
    assert.equal(isStaleLock(forced, "idle", true), false, "never release mid-compaction");
    assert.equal(isStaleLock({ ...forced, handoff }, "idle", false), false, "an owed card keeps the lock");
    assert.equal(isStaleLock(initialState(), "idle", false), false);
  });

  it("blocks ordinary tools while a handoff is in flight even below the forced tier", () => {
    assert.equal(shouldBlockTools({ ...initialState(), phase: "compacting", locked: true, handoff }, "recommend", true), true);
  });
});

describe("compaction material", () => {
  function message(role: string, chars: number) {
    return { type: "message", message: { role, content: "x".repeat(chars) } };
  }

  it("is false for an empty branch", () => {
    assert.equal(hasCompactionMaterial([], 20_000), false);
  });

  it("is false when the branch already ends in a compaction", () => {
    assert.equal(hasCompactionMaterial([message("user", 100_000), { type: "compaction" }], 1), false);
  });

  it("is true when history beyond the retained window exists", () => {
    const entries = [message("user", 200_000), message("assistant", 200_000), message("user", 400)];
    assert.equal(hasCompactionMaterial(entries, 20_000), true);
  });

  it("is false when everything fits in the retained window", () => {
    const entries = [message("user", 400), message("assistant", 400)];
    assert.equal(hasCompactionMaterial(entries, 20_000), false);
  });

  it("finds a cut point that keeps the recent tail", () => {
    const entries = [message("user", 40_000), message("assistant", 40_000), message("user", 400)];
    const cut = findCutPointLocal(entries, 0, entries.length, 1_000);
    assert.ok(cut.firstKeptEntryIndex >= 1);
    assert.ok(cut.firstKeptEntryIndex <= entries.length);
  });

  it("splits a turn only when the retained window starts mid-turn", () => {
    const entries = [message("user", 8_000), message("assistant", 8_000), message("user", 100)];
    const aligned = findCutPointLocal(entries, 0, entries.length, 2_000);
    assert.equal(aligned.isSplitTurn, false);
    assert.equal(aligned.firstKeptEntryIndex, 2);

    const split = findCutPointLocal(entries, 0, entries.length, 2_100);
    assert.equal(split.isSplitTurn, true);
    assert.equal(split.turnStartIndex, 0);
    assert.equal(split.firstKeptEntryIndex, 1);
  });
});

// ------------------------------------------------------------- context bar

describe("context bar", () => {
  it("keeps a fixed width", () => {
    for (const pct of [0, 7, 50, 100]) {
      assert.equal(renderContextBar({ usedPct: pct, cachedPct: 0, softPct: 10, warnPct: 20, forcedPct: 30 }).cells.length, BAR_CELLS);
    }
  });

  it("draws cached and uncached portions separately", () => {
    const bar = renderContextBar({ usedPct: 50, cachedPct: 25, softPct: 0, warnPct: 0, forcedPct: 0 });
    assert.equal(bar.cells.filter((c) => c === "#").length, 5);
    assert.equal(bar.cells.filter((c) => c === "=").length, 5);
    assert.equal(bar.cells.filter((c) => c === "-").length, 10);
  });

  it("shows watermark markers over the fill", () => {
    const bar = renderContextBar({ usedPct: 60, cachedPct: 0, softPct: 10, warnPct: 20, forcedPct: 30 });
    assert.equal(bar.cells[markerIndex(10)], "~");
    assert.equal(bar.cells[markerIndex(20)], "!");
    assert.equal(bar.cells[markerIndex(30)], "|");
  });

  it("reports an unknown percentage as --", () => {
    assert.equal(renderContextBar({ usedPct: null, cachedPct: 0, softPct: 10, warnPct: 20, forcedPct: 30 }).label, "--");
  });

  it("renders a compact status line", () => {
    assert.equal(formatStatus({ percent: 14.2, level: "notice" }), "🗜 14% · notice");
    assert.equal(formatStatus({ percent: 22, level: "recommend", cycle: 1 }), "🗜 22% · recommend · c1");
    assert.equal(formatStatus({ percent: 31, level: "forced", locked: true }), "🗜 31% · FORCED");
    assert.equal(formatStatus({ percent: 14, level: "notice", silent: true }), "🗜 14% · notice (mid-op)");
    assert.equal(formatStatus({ percent: null, level: "idle" }), "🗜 -- · idle");
  });

  it("formats tokens compactly", () => {
    const bar = renderContextBar({
      usedPct: 42.3,
      cachedPct: 0,
      softPct: 10,
      warnPct: 20,
      forcedPct: 30,
      usedTokens: 84_600,
      window: 200_000,
    });
    assert.equal(bar.label, "42.3% 85k/200k");
  });
});

// --------------------------------------------------------------- mock shape

describe("mock answers", () => {
  it("covers the boundary question set", () => {
    const answers = mockAnswers({ model: "m", state: "s", questions: boundaryQuestions() });
    assert.deepEqual(Object.keys(answers).sort(), Object.keys(boundaryQuestions()).sort());
  });

  it("returns a distribution summing to one", () => {
    const answers = mockAnswers({
      model: "m",
      state: "s",
      questions: { pick: { type: "choice", prompt: "p", criteria: { a: "A", b: "B" } } },
    });
    const probabilities = choiceProbabilities(answers, "pick") ?? {};
    assert.equal(Object.values(probabilities).reduce((sum, value) => sum + value, 0), 1);
  });
});
