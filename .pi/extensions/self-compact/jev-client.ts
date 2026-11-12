/**
 * Minimal TypeSafe System One client for the self-compact extension.
 *
 * Two live providers are supported: TypeSafe (`TYPESAFE_API_KEY`) and OpenRouter
 * (`OPENROUTER_API_KEY`). A `mock` provider exists for tests and offline use.
 *
 * Network failures never escape as exceptions the caller must special-case: the
 * extension asks `client.available` first and falls back to watermark-only gating
 * when Jev cannot be reached.
 */

import type { JevConfig, JevProvider } from "./thresholds.ts";

/** A provider that can actually be called; `auto` resolves to one of these. */
export type LiveProvider = Exclude<JevProvider, "auto">;

export const ENDPOINTS = {
  openrouter: "https://openrouter.ai/api/alpha/decisions",
  typesafe: "https://api.typesafe.ai/v1/systemone",
} as const;

export const DEFAULT_MODELS = {
  openrouter: "~typesafe/jev-latest",
  typesafe: "jev-latest",
  mock: "jev-mock",
} as const;

const KEY_ENV = {
  openrouter: "OPENROUTER_API_KEY",
  typesafe: "TYPESAFE_API_KEY",
} as const;

const RETRY_STATUSES = new Set([429, 502, 503, 529]);
const MAX_ATTEMPTS = 3;
const MAX_BACKOFF_MS = 8000;

// ---------------------------------------------------------------- questions

export interface NoulQuestion {
  type: "noul";
  prompt: string;
}

export interface ChoiceQuestion {
  type: "choice";
  prompt: string;
  criteria: Record<string, string>;
}

export interface ScoreQuestion {
  type: "score";
  prompt: string;
  criteria: string[];
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export type Questions = Record<string, Question>;

export interface NoulAnswer {
  type: "noul";
  noul: number;
  confidence: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  probabilities: Record<string, number>;
  legend: Record<string, string>;
  confidence: number;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;
export type Answers = Record<string, Answer>;

/** A deterministic yes/no question. */
export function noul(prompt: string): NoulQuestion {
  return { type: "noul", prompt };
}

/** Probability distribution over a fixed set of labeled outcomes. */
export function choice(prompt: string, criteria: Record<string, string>): ChoiceQuestion {
  return { type: "choice", prompt, criteria };
}

/** Ordered scale: the score is an index into `criteria`. */
export function score(prompt: string, criteria: string[]): ScoreQuestion {
  return { type: "score", prompt, criteria };
}

/**
 * Read a `noul` probability, tolerating a wrong answer shape. Missing answers are
 * treated as 0.5 so a partially answered batch degrades to a coin flip, not a crash.
 */
export function noulProbability(answers: Answers | undefined, id: string): number {
  const answer = answers?.[id];
  if (!answer || answer.type !== "noul") return 0.5;
  return clamp01(answer.noul);
}

/** Read a `choice` distribution. Returns undefined when the answer is missing. */
export function choiceProbabilities(answers: Answers | undefined, id: string): Record<string, number> | undefined {
  const answer = answers?.[id];
  if (!answer || answer.type !== "choice") return undefined;
  return answer.probabilities;
}

/** Read a `score` answer as an index into the original criteria array. */
export function scoreIndex(answers: Answers | undefined, id: string): number | undefined {
  const answer = answers?.[id];
  if (!answer || answer.type !== "score") return undefined;
  return Number.isInteger(answer.score) ? answer.score : undefined;
}

/** Legend entry for a score answer, e.g. "low" / "medium" / "high". */
export function scoreLabel(answers: Answers | undefined, id: string): string | undefined {
  const answer = answers?.[id];
  if (!answer || answer.type !== "score") return undefined;
  const entry = answer.legend?.[String(answer.score)];
  return typeof entry === "string" ? entry : undefined;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

// ------------------------------------------------------------------- client

export interface SystemOneRequest {
  model: string;
  state: string;
  questions: Questions;
}

export interface SystemOneResponse {
  model: string;
  answers: Answers;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class JevUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JevUnavailableError";
  }
}

export interface JevAskOptions {
  model?: string | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
}

export interface JevResult {
  answers: Answers;
  provider: LiveProvider;
  model: string;
  elapsedMs: number;
  attempts: number;
}

export interface JevClientOptions {
  config: JevConfig;
  /** Explicit override; falls back to `TYPESAFE_API_KEY` then `OPENROUTER_API_KEY`. */
  provider?: JevProvider | undefined;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
  retryDelayMs?: number | undefined;
  /** Offline responder used by the mock provider and by tests. */
  respond?: ((request: SystemOneRequest) => Answers) | undefined;
  env?: Record<string, string | undefined> | undefined;
}

export class JevClient {
  readonly provider: LiveProvider;
  /** False when no usable credential exists; the extension then skips Jev entirely. */
  readonly available: boolean;
  readonly unavailableReason: string | undefined;

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly respond: ((request: SystemOneRequest) => Answers) | undefined;

  constructor(options: JevClientOptions) {
    const env = options.env ?? (process.env as Record<string, string | undefined>);
    this.provider = selectProvider(options.config, options.provider, env, Boolean(options.respond));
    this.model = DEFAULT_MODELS[this.provider];
    this.timeoutMs = Math.max(1, options.config.timeoutMs);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 400);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.respond = options.respond;
    this.endpoint = options.baseUrl ?? (this.provider === "mock" ? "" : ENDPOINTS[this.provider]);
    this.apiKey = (options.apiKey ?? (this.provider === "mock" ? "" : env[KEY_ENV[this.provider]]) ?? "").trim();

    if (this.provider === "mock") {
      this.available = true;
      this.unavailableReason = undefined;
    } else if (!this.apiKey) {
      this.available = false;
      this.unavailableReason = `${KEY_ENV[this.provider]} is not set`;
    } else {
      this.available = true;
      this.unavailableReason = undefined;
    }
  }

  /** Short human-readable status used by the info panel. */
  describe(): string {
    if (!this.available) return `jev unavailable (${this.unavailableReason})`;
    return `jev ${this.provider}/${this.model}`;
  }

  async ask(state: string, questions: Questions, options: JevAskOptions = {}): Promise<JevResult> {
    if (!this.available) throw new JevUnavailableError(this.unavailableReason ?? "jev unavailable");
    const request: SystemOneRequest = { model: options.model ?? this.model, state, questions };
    const started = performance.now();

    if (this.provider === "mock" || this.respond) {
      const produced = (this.respond ?? mockAnswers)(request);
      const answers = parseAnswers(JSON.stringify({ answers: produced }), questions);
      return { answers, provider: this.provider, model: request.model, elapsedMs: Math.round(performance.now() - started), attempts: 1 };
    }

    const timeoutMs = Math.max(1, options.timeoutMs ?? this.timeoutMs);
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(new DOMException("Jev request timed out.", "TimeoutError")), timeoutMs);
    const signal = options.signal ? AbortSignal.any([deadline.signal, options.signal]) : deadline.signal;
    const body = JSON.stringify(request);

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (signal.aborted) throw signal.reason ?? new Error("aborted");
        const response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body,
          signal,
          redirect: "error",
        });
        if (RETRY_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
          await response.body?.cancel();
          await sleep(this.retryDelayMs * 2 ** (attempt - 1), signal);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          const hint =
            response.status === 401
              ? ` Check ${KEY_ENV[this.provider]}.`
              : response.status === 402
                ? " Check account credits."
                : "";
          throw new JevUnavailableError(`${this.provider} HTTP ${response.status}.${hint}`);
        }
        const text = await response.text();
        const answers = parseAnswers(text, questions);
        return {
          answers,
          provider: this.provider,
          model: request.model,
          elapsedMs: Math.round(performance.now() - started),
          attempts: attempt,
        };
      }
      throw new JevUnavailableError(`${this.provider} retries exhausted`);
    } finally {
      clearTimeout(timer);
    }
  }
}

function selectProvider(
  config: JevConfig,
  explicit: JevProvider | undefined,
  env: Record<string, string | undefined>,
  hasMock: boolean,
): LiveProvider {
  const requested = explicit ?? config.provider;
  if (requested === "typesafe" || requested === "openrouter" || requested === "mock") return requested;
  if (hasMock && !env.TYPESAFE_API_KEY?.trim() && !env.OPENROUTER_API_KEY?.trim()) return "mock";
  if (env.TYPESAFE_API_KEY?.trim()) return "typesafe";
  if (env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  // Nothing configured: report a definite provider so the reason names one env var.
  return "typesafe";
}

/** Keep only answers that match the requested question types. */
export function parseAnswers(text: string, questions: Questions): Answers {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new JevUnavailableError("Invalid Jev response JSON.");
  }
  const raw = (parsed as { answers?: unknown } | null)?.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new JevUnavailableError("Invalid Jev response: missing answers object.");
  }
  const source = raw as Record<string, unknown>;
  const answers: Answers = {};
  for (const [id, question] of Object.entries(questions)) {
    const candidate = source[id] as Record<string, unknown> | undefined;
    if (!candidate || candidate.type !== question.type) continue;
    if (question.type === "noul") {
      if (typeof candidate.noul !== "number") continue;
      answers[id] = { type: "noul", noul: clamp01(candidate.noul), confidence: numeric(candidate.confidence, 1) };
      continue;
    }
    const probabilities = candidate.probabilities as Record<string, unknown> | undefined;
    if (!probabilities || typeof probabilities !== "object") continue;
    const clean: Record<string, number> = {};
    for (const [key, value] of Object.entries(probabilities)) {
      if (typeof value === "number") clean[key] = clamp01(value);
    }
    if (Object.keys(clean).length === 0) continue;
    if (question.type === "choice") {
      const picked = typeof candidate.choice === "string" ? candidate.choice : Object.keys(clean)[0]!;
      answers[id] = { type: "choice", choice: picked, probabilities: clean, confidence: numeric(candidate.confidence, 1) };
      continue;
    }
    const legend = (candidate.legend ?? {}) as Record<string, unknown>;
    answers[id] = {
      type: "score",
      score: Number.isInteger(candidate.score) ? (candidate.score as number) : 0,
      probabilities: clean,
      legend: Object.fromEntries(Object.entries(legend).filter(([, v]) => typeof v === "string")) as Record<string, string>,
      confidence: numeric(candidate.confidence, 1),
    };
  }
  return answers;
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, Math.min(ms, MAX_BACKOFF_MS));
    function onAbort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Deterministic offline answers: everything looks mid-transition, so callers that
 * only need a well-formed batch (tests, demos) get stable output.
 */
export function mockAnswers(request: SystemOneRequest): Answers {
  const answers: Answers = {};
  for (const [id, question] of Object.entries(request.questions)) {
    if (question.type === "noul") {
      answers[id] = { type: "noul", noul: 0.5, confidence: 0.2 };
      continue;
    }
    if (question.type === "choice") {
      const keys = Object.keys(question.criteria);
      const probabilities = Object.fromEntries(keys.map((key) => [key, 1 / keys.length]));
      answers[id] = { type: "choice", choice: keys[0] ?? "unknown", probabilities, confidence: 0.2 };
      continue;
    }
    const probabilities = Object.fromEntries(question.criteria.map((_, index) => [String(index), 1 / question.criteria.length]));
    answers[id] = {
      type: "score",
      score: 0,
      probabilities,
      legend: Object.fromEntries(question.criteria.map((label, index) => [String(index), label])),
      confidence: 0.2,
    };
  }
  return answers;
}
