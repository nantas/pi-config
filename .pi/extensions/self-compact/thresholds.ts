/**
 * Threshold resolution and context-usage extraction for the self-compact extension.
 *
 * Pure module: no Pi imports, no I/O beyond an injectable config reader, so it can be
 * unit-tested directly with `node --test`.
 *
 * Three percentage watermarks drive everything:
 *   softAt (10%)  → notice tier
 *   at (20%)      → recommend tier
 *   buffer (10%)  → forced tier = min(at + buffer, hard ceiling)
 */

import { readFileSync } from "node:fs";

export const HARD_CAP_FRACTION = 0.9;
export const DEFAULT_HARD_CEILING_PERCENT = 90;

export type UsageLevel = "idle" | "notice" | "recommend" | "forced";

export interface ThresholdSpecs {
  softAt: string;
  at: string;
  buffer: string;
}

export const DEFAULT_SPECS: ThresholdSpecs = { softAt: "10%", at: "20%", buffer: "10%" };

export type JevProvider = "auto" | "typesafe" | "openrouter" | "mock";

export interface JevConfig {
  enabled: boolean;
  provider: JevProvider;
  /** Per-question-call budget. */
  timeoutMs: number;
  /** Budget for the cut-point call (two round trips). */
  cutPointTimeoutMs: number;
  /** Cut points below this confidence fall back to the plain boundary. */
  minCutPointConfidence: number;
}

export interface SelfCompactConfig extends ThresholdSpecs {
  /** Absolute ceiling as a percentage of the context window. */
  hardCeilingPercent: number;
  /** Extra instructions appended to Pi's own compaction prompt. */
  compactPrompt?: string;
  jev: JevConfig;
}

export const BUILTIN_CONFIG: SelfCompactConfig = {
  ...DEFAULT_SPECS,
  hardCeilingPercent: DEFAULT_HARD_CEILING_PERCENT,
  jev: {
    enabled: true,
    provider: "auto",
    timeoutMs: 5000,
    cutPointTimeoutMs: 8000,
    minCutPointConfidence: 0.5,
  },
};

export interface TokenSpec {
  /** Raw source string, e.g. "10%" or "32000". */
  raw: string;
  /** Absolute token count. */
  tokens: number;
}

export interface ResolvedThresholds {
  contextWindow: number;
  softAt: TokenSpec;
  at: TokenSpec;
  buffer: TokenSpec;
  forcedAt: TokenSpec;
  hardCap: TokenSpec;
  softPct: number;
  warnPct: number;
  forcedPct: number;
}

const PCT_RE = /^(\d+(?:\.\d+)?)%$/;
/** Absolute counts, with the shorthand suffixes design.md §3 allows: 100k, 1m. */
const ABS_RE = /^(\d+(?:\.\d+)?)([kKmM])?$/;

const SUFFIX: Record<string, number> = { k: 1_000, m: 1_000_000 };

/**
 * Parse a watermark. `%` values are relative to the context window; bare integers are
 * absolute tokens. Throws a descriptive error for anything else.
 */
export function parseSpec(raw: string | number | undefined, label: string, contextWindow: number): TokenSpec {
  if (raw === undefined || raw === null) {
    throw new Error(`self-compact: missing threshold "${label}"`);
  }
  const text = String(raw).trim();
  const pct = PCT_RE.exec(text);
  if (pct) {
    const value = Number(pct[1]);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`self-compact: threshold "${label}" must be greater than 0%, got "${text}"`);
    }
    if (value > 100) {
      throw new Error(`self-compact: threshold "${label}" must not exceed 100%, got "${text}"`);
    }
    return { raw: text, tokens: Math.floor((contextWindow * value) / 100) };
  }
  const abs = ABS_RE.exec(text);
  if (abs) {
    const magnitude = Number(abs[1]);
    const multiplier = abs[2] ? SUFFIX[abs[2].toLowerCase()]! : 1;
    const value = Math.floor(magnitude * multiplier);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`self-compact: threshold "${label}" must be greater than 0 tokens, got "${text}"`);
    }
    return { raw: text, tokens: value };
  }
  throw new Error(
    `self-compact: threshold "${label}" must look like "10%", "32000", "32k" or "1m", got "${text}"`,
  );
}

function pctOf(tokens: number, contextWindow: number): number {
  if (contextWindow <= 0) return 0;
  return (tokens / contextWindow) * 100;
}

/**
 * Resolve the three watermarks against a context window.
 *
 * Invariants (a violation throws, it never silently reorders the watermarks):
 *   0 < soft <= at < forced <= min(at + buffer, hard ceiling)
 */
export function computeThresholds(config: SelfCompactConfig, contextWindow: number): ResolvedThresholds {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) {
    throw new Error(`self-compact: context window must be a positive number, got ${String(contextWindow)}`);
  }
  const ceilingPct = config.hardCeilingPercent ?? DEFAULT_HARD_CEILING_PERCENT;
  if (!Number.isFinite(ceilingPct) || ceilingPct <= 0 || ceilingPct > 100) {
    throw new Error(`self-compact: hardCeilingPercent must be in (0, 100], got ${String(ceilingPct)}`);
  }

  const softAt = parseSpec(config.softAt, "softAt", contextWindow);
  const at = parseSpec(config.at, "at", contextWindow);
  const buffer = parseSpec(config.buffer, "buffer", contextWindow);

  if (softAt.tokens > at.tokens) {
    throw new Error(
      `self-compact: softAt (${softAt.raw} = ${softAt.tokens} tokens) must not exceed at (${at.raw} = ${at.tokens} tokens)`,
    );
  }
  if (buffer.tokens <= 0) {
    throw new Error(`self-compact: buffer (${buffer.raw}) must leave room for a forced tier`);
  }

  const capTokens = Math.floor((contextWindow * ceilingPct) / 100);
  if (at.tokens > capTokens) {
    throw new Error(
      `self-compact: at (${at.raw} = ${at.tokens} tokens) exceeds the ${ceilingPct}% hard ceiling (${capTokens} tokens)`,
    );
  }

  const hardCap: TokenSpec = { raw: `${ceilingPct}%`, tokens: capTokens };
  const forcedTokens = Math.min(at.tokens + buffer.tokens, capTokens);
  if (forcedTokens <= at.tokens) {
    throw new Error(
      `self-compact: forced tier (at + buffer) collapses into the warn tier at the ${ceilingPct}% hard ceiling; raise hardCeilingPercent or lower at`,
    );
  }
  const forcedAt: TokenSpec = {
    raw: forcedTokens === capTokens && at.tokens + buffer.tokens > capTokens ? `min(at+buffer, ${ceilingPct}%)` : `${at.raw}+${buffer.raw}`,
    tokens: forcedTokens,
  };

  return {
    contextWindow,
    softAt,
    at,
    buffer,
    forcedAt,
    hardCap,
    softPct: pctOf(softAt.tokens, contextWindow),
    warnPct: pctOf(at.tokens, contextWindow),
    forcedPct: pctOf(forcedTokens, contextWindow),
  };
}

/** Watermark tier for a token count. */
export function checkThresholds(usedTokens: number, thresholds: ResolvedThresholds): UsageLevel {
  if (!Number.isFinite(usedTokens) || usedTokens <= 0) return "idle";
  if (usedTokens >= thresholds.forcedAt.tokens) return "forced";
  if (usedTokens >= thresholds.at.tokens) return "recommend";
  if (usedTokens >= thresholds.softAt.tokens) return "notice";
  return "idle";
}

export function isTrip(level: UsageLevel): boolean {
  return level === "notice" || level === "recommend" || level === "forced";
}

export const LEVEL_ORDER: readonly UsageLevel[] = ["idle", "notice", "recommend", "forced"];

export function maxLevel(a: UsageLevel, b: UsageLevel): UsageLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

// ------------------------------------------------------------------ usage

/** Minimal structural shape of a Pi session entry; keeps this module import-free. */
export interface EntryLike {
  type?: string;
  message?: {
    role?: string;
    usage?: { input?: number; cacheRead?: number; cacheWrite?: number; output?: number } | null;
  };
}

export interface ContextUsageLike {
  tokens: number | null;
  contextWindow: number;
  percent?: number | null;
}

export interface UsageSnapshot {
  usedTokens: number;
  cachedTokens: number;
  window: number;
  percent: number;
}

export interface UsageInput {
  contextUsage?: ContextUsageLike | undefined;
  entries?: readonly EntryLike[] | undefined;
  windowFallback?: number | undefined;
}

/**
 * Cached-token count from the newest assistant message at or after the last compaction
 * boundary, so a stale pre-compaction number is never reported.
 */
export function latestCachedTokens(entries: readonly EntryLike[] | undefined): number {
  if (!entries) return 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    if (entry.type === "compaction") return 0;
    const usage = entry.message?.usage;
    if (entry.type === "message" && entry.message?.role === "assistant" && usage) {
      return Math.max(0, usage.cacheRead ?? 0);
    }
  }
  return 0;
}

/**
 * Combine Pi's live context usage with the newest cached-token figure.
 * `percent` is always derived from tokens so the bar and the gauges agree.
 */
export function extractUsage(input: UsageInput): UsageSnapshot {
  const window = input.contextUsage?.contextWindow || input.windowFallback || 0;
  const usedTokens = Math.max(0, input.contextUsage?.tokens ?? 0);
  const cachedTokens = Math.min(usedTokens, latestCachedTokens(input.entries));
  return {
    usedTokens,
    cachedTokens,
    window,
    percent: window > 0 ? (usedTokens / window) * 100 : 0,
  };
}

// ----------------------------------------------------------------- config

export type ConfigKind = "flag" | "project" | "global" | "managed" | "builtin";

export interface ConfigSource {
  path: string;
  kind: ConfigKind;
}

export interface LoadedConfig {
  config: SelfCompactConfig;
  sources: ConfigSource[];
  notes: string[];
}

export interface LoadConfigOptions {
  cwd: string;
  home?: string;
  /** Repo-relative managed overlay; defaults to `<cwd>/.pi/managed/self-compact.json`. */
  managedPath?: string;
  /** Highest-priority overrides coming from CLI flags. */
  flags?: Partial<ThresholdSpecs & { compactPrompt: string }> | undefined;
  /** Injectable reader for tests. Returns undefined when the file does not exist. */
  readFile?: (path: string) => string | undefined;
}

function defaultReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

/** Shallow merge with a nested `jev` merge; `undefined` overlays never win. */
function mergeConfig(base: SelfCompactConfig, overlay: Partial<SelfCompactConfig> | undefined): SelfCompactConfig {
  if (!overlay) return base;
  const next = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overlay)) {
    if (key === "jev") continue;
    if (value !== undefined) next[key] = value;
  }
  next.jev = overlay.jev ? { ...base.jev, ...overlay.jev } : base.jev;
  return next as unknown as SelfCompactConfig;
}

function readConfigFile(path: string, kind: ConfigKind, readFile: (p: string) => string | undefined, notes: string[]): Partial<SelfCompactConfig> | undefined {
  const text = readFile(path);
  if (text === undefined) return undefined;
  try {
    const parsed = JSON.parse(text) as Partial<SelfCompactConfig> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      notes.push(`ignored ${kind} config ${path}: expected a JSON object`);
      return undefined;
    }
    return parsed;
  } catch (error) {
    notes.push(`ignored ${kind} config ${path}: invalid JSON (${(error as Error).message})`);
    return undefined;
  }
}

/**
 * Merge the config layers. Later (higher-priority) layers win:
 *   managed < global (~/.pi/agent) < project (<cwd>/.pi) < flags
 */
export function loadConfig(options: LoadConfigOptions): LoadedConfig {
  const readFile = options.readFile ?? defaultReadFile;
  const notes: string[] = [];
  const sources: ConfigSource[] = [];
  let config = { ...BUILTIN_CONFIG, jev: { ...BUILTIN_CONFIG.jev } };
  sources.push({ path: "<builtin>", kind: "builtin" });

  const home = options.home ?? process.env.HOME ?? "";
  const managedPath = options.managedPath ?? `${options.cwd}/.pi/managed/self-compact.json`;
  const layers: Array<{ path: string; kind: ConfigKind }> = [
    { path: managedPath, kind: "managed" },
    ...(home ? [{ path: `${home}/.pi/agent/self-compact.json`, kind: "global" as const }] : []),
    { path: `${options.cwd}/.pi/self-compact.json`, kind: "project" },
  ];

  for (const layer of layers) {
    const overlay = readConfigFile(layer.path, layer.kind, readFile, notes);
    if (!overlay) continue;
    config = mergeConfig(config, overlay);
    sources.push({ path: layer.path, kind: layer.kind });
  }

  const flags: Partial<SelfCompactConfig> = {};
  if (options.flags) {
    for (const key of ["softAt", "at", "buffer", "compactPrompt"] as const) {
      const value = options.flags[key];
      if (typeof value === "string" && value.length > 0) flags[key] = value;
    }
  }
  if (Object.keys(flags).length > 0) {
    config = mergeConfig(config, flags);
    sources.push({ path: "<flags>", kind: "flag" });
  }

  if (typeof config.hardCeilingPercent !== "number") {
    config.hardCeilingPercent = DEFAULT_HARD_CEILING_PERCENT;
  }
  return { config, sources, notes };
}
