import { Type } from "typebox";
import { spawnSync } from "node:child_process";
import { relative, resolve, sep } from "node:path";
import {
  runCli,
  parseSearchJson,
  parseSearchContextJson,
  parseTextPathLines,
  type SearchResultEntry,
} from "./cli-runner";

type ToolResult = {
  content: { type: "text"; text: string }[];
  details: Record<string, unknown>;
};
import {
  resolveVault,
  isCliAvailable,
  hasPreloaded,
  getKnownVaults,
} from "./vault-resolver";

// ── Parameter Schema ────────────────────────────────────────────

const searchParams = Type.Object({
  query: Type.String({
    description:
      "Search query — use keyword combinations, not full sentences. " +
      "Extract key entities and action/behavior words.",
    minLength: 1,
    maxLength: 200,
  }),
  vault: Type.Optional(
    Type.String({
      description:
        "Target vault name or path. Omit for auto-detection from current directory.",
    }),
  ),
  mode: Type.Optional(
    Type.Union([Type.Literal("fast"), Type.Literal("deep")], {
      default: "fast",
      description:
        '"fast" for targeted lookups, "deep" for context expansion. ' +
        "Auto-upgrades from fast to deep when confidence is low.",
    }),
  ),
  limit: Type.Optional(
    Type.Integer({
      default: 5,
      minimum: 1,
      maximum: 20,
      description: "Maximum number of top results to return.",
    }),
  ),
  scope: Type.Optional(
    Type.String({
      description:
        "Optional subdirectory path to limit search scope (e.g., '20_项目/OrbitOS').",
    }),
  ),
});

interface SearchParams {
  query: string;
  vault?: string;
  mode?: "fast" | "deep";
  limit?: number;
  scope?: string;
}

// ── Prompt Helpers ──────────────────────────────────────────────

const promptSnippet =
  "Search Obsidian vault content intelligently. " +
  "Supports keyword recall with automatic ranking, context expansion, " +
  "and fallback text search when Obsidian CLI is unavailable.";

const promptGuidelines = [
  "Prefer obsidian_search over direct obsidian_cli for retrieval — it handles ranking and expansion automatically.",
  "Fast mode (~3s) for targeted lookups like project pages or known document titles.",
  "Deep mode (~5-8s) when decision context, backlinks, or related documents matter.",
  "Set scope to a subdirectory when the query is specific to a project area.",
  "Use keyword-style queries, not full sentences. Convert 'What is the architecture of OrbitOS?' → 'OrbitOS architecture'.",
  "When results have low confidence (all scores < 0.4), suggest the user refine their query.",
];

// ── State ───────────────────────────────────────────────────────

let _preflightChecked = false;
let _preflightAvailable = false;

// ── Tool Definition ─────────────────────────────────────────────

export const searchToolDefinition = {
  name: "obsidian_search",
  label: "Obsidian Search",
  description:
    "Search Obsidian vault content with intelligent ranking and automatic context expansion.",
  promptSnippet,
  promptGuidelines,
  parameters: searchParams,
  execute: searchToolExecute,
};

// ── Execute ─────────────────────────────────────────────────────

async function searchToolExecute(
  _toolCallId: string,
  params: SearchParams,
  signal: AbortSignal | undefined,
  _onUpdate: any,
  _ctx: any,
): Promise<ToolResult> {
  const startTime = Date.now();

  // 4.2: Query sanitization
  const sanitizeResult = sanitizeQuery(params.query);
  if (!sanitizeResult.ok) {
    return errorResult(sanitizeResult.error, startTime);
  }
  const effectiveQuery = sanitizeResult.query;
  const mode = (params.mode ?? "fast") as "fast" | "deep";
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);

  // 4.3: Vault resolution
  let vault: string;
  try {
    vault = resolveVault(params.vault);
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : String(err),
      startTime,
    );
  }

  // 4.4: Preflight check (first call in session)
  const preflight = await ensurePreflight(vault, signal);
  if (!preflight.available) {
    // 4.10: Fallback to rg
    return runFallbackSearch(
      effectiveQuery,
      vault,
      params.scope,
      limit,
      startTime,
      signal,
    );
  }

  // 4.5: Parallel recall
  const cliResults = await parallelRecall(
    vault,
    effectiveQuery,
    params.scope,
    signal,
  );

  // 4.6: Dedup by path, keep higher score
  const deduped = deduplicate(cliResults);

  // Filter out entries whose path doesn't look like a real vault file path
  // (e.g. "No matches found." from CLI error output)
  const validResults = deduped.filter(
    (e) =>
      e.path &&
      (e.path.includes("/") ||
        e.path.includes("\\") ||
        /[\w\-]+\.\w+/.test(e.path)),
  );

  // 4.12b: Zero-result fallback — CLI search found nothing, try rg
  if (validResults.length === 0) {
    return runFallbackSearch(
      effectiveQuery,
      vault,
      params.scope,
      limit,
      startTime,
      signal,
    );
  }

  // 4.7: Scoring & ranking
  const scored = scoreAndRank(validResults, params.scope, limit);

  // 4.8: Auto-upgrade decision
  const needExpand = mode === "deep" || shouldAutoUpgrade(scored);

  let related: Record<string, unknown> | undefined;

  if (needExpand && scored.length > 0) {
    // 4.9: Context expansion (expand phase)
    related = await expandPhase(vault, scored[0], signal);
  }

  // 4.11: Output construction
  const elapsed = Date.now() - startTime;
  return buildOutput({
    ok: true,
    mode: preflight.mode,
    vault,
    effectiveQuery,
    stats: {
      total_hits: validResults.length,
      returned: scored.length,
      time_ms: elapsed,
    },
    topk: scored,
    related,
  });
}

// ── Query Sanitization (4.2) ────────────────────────────────────

const QUERY_REGEX = /^[\p{L}\p{N}\s:_\-.]+$/u;

function sanitizeQuery(
  query: string,
): { ok: true; query: string } | { ok: false; error: string } {
  let sanitized = query.trim();

  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 200);
  }

  if (!QUERY_REGEX.test(sanitized)) {
    return {
      ok: false,
      error:
        "Invalid query: only letters, numbers, spaces, colons, underscores, hyphens, and periods are allowed.",
    };
  }

  if (sanitized.length === 0) {
    return { ok: false, error: "Query cannot be empty after sanitization." };
  }

  return { ok: true, query: sanitized };
}

// ── Preflight (4.4) ─────────────────────────────────────────────

async function ensurePreflight(
  vault: string,
  signal?: AbortSignal,
): Promise<{ available: boolean; mode: "cli" | "fallback" }> {
  if (_preflightChecked) {
    return {
      available: _preflightAvailable,
      mode: _preflightAvailable ? "cli" : "fallback",
    };
  }

  if (hasPreloaded()) {
    _preflightAvailable = isCliAvailable();
    _preflightChecked = true;
    return {
      available: _preflightAvailable,
      mode: _preflightAvailable ? "cli" : "fallback",
    };
  }

  try {
    const result = await runCli(vault, ["help"], signal, 5_000);
    _preflightAvailable = result.code === 0;
  } catch {
    _preflightAvailable = false;
  }

  _preflightChecked = true;
  return {
    available: _preflightAvailable,
    mode: _preflightAvailable ? "cli" : "fallback",
  };
}

// ── Parallel Recall (4.5) ───────────────────────────────────────

async function parallelRecall(
  vault: string,
  query: string,
  scope?: string,
  signal?: AbortSignal,
): Promise<SearchResultEntry[]> {
  const searches: Promise<SearchResultEntry[]>[] = [
    runCli(
      vault,
      ["search", ["query", query], ["limit", "20"], "format=json"],
      signal,
      25_000,
    ).then((r) => parseSearchJson(r.stdout)),
  ];

  if (scope) {
    searches.push(
      runCli(
        vault,
        ["search", ["query", query], ["path", scope], ["limit", "20"], "format=json"],
        signal,
        25_000,
      ).then((r) => parseSearchJson(r.stdout)),
    );
  }

  const results = await Promise.all(searches);
  return results.flat();
}

// ── Dedup (4.6) ─────────────────────────────────────────────────

function deduplicate(entries: SearchResultEntry[]): SearchResultEntry[] {
  const seen = new Map<string, SearchResultEntry>();

  for (const entry of entries) {
    const key = entry.path;
    const existing = seen.get(key);
    if (!existing || entry.relevance > existing.relevance) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()];
}

// ── Scoring & Ranking (4.7) ─────────────────────────────────────

interface ScoredEntry extends SearchResultEntry {
  adjustedScore: number;
  reason: string;
}

function scoreAndRank(
  entries: SearchResultEntry[],
  scope?: string,
  limit: number = 5,
): ScoredEntry[] {
  const scored = entries.map((entry) => {
    let score = entry.relevance ?? 0.5;
    const reasons: string[] = [];

    if (scope && isChildPath(entry.path, scope)) {
      score *= 1.3;
      reasons.push("path_scope");
    }

    if (entry.path.endsWith(".md")) {
      score *= 1.1;
      reasons.push("md_boost");
    }

    if (entry.path.endsWith(".json") || entry.path.includes("10_日记/")) {
      score *= 0.6;
      reasons.push("noise_penalty");
    }

    if (entry.path.includes("Reports/") || entry.path.includes("/Reports")) {
      score *= 0.7;
      reasons.push("aggregation_penalty");
    }

    return {
      ...entry,
      adjustedScore: Math.round(score * 100) / 100,
      reason: reasons.length > 0 ? reasons.join(" + ") : "base_score",
    };
  });

  scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
  return scored.slice(0, limit);
}

function isChildPath(path: string, scope: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedScope = scope.replace(/\\/g, "/").replace(/\/$/, "");
  return (
    normalizedPath.startsWith(normalizedScope + "/") ||
    normalizedPath === normalizedScope
  );
}

// ── Auto-Upgrade (4.8) ──────────────────────────────────────────

function shouldAutoUpgrade(scored: ScoredEntry[]): boolean {
  if (scored.length < 2) return false;
  const gap = scored[0].adjustedScore - scored[1].adjustedScore;
  return gap < 0.15;
}

// ── Context Expansion (4.9) ─────────────────────────────────────

async function expandPhase(
  vault: string,
  topEntry: ScoredEntry,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const [contextResult, backlinksResult, linksResult] =
    await Promise.allSettled([
      runCli(
        vault,
        ["search:context", ["query", topEntry.title], ["limit", "3"], "format=json"],
        signal,
        25_000,
      ),
      runCli(
        vault,
        ["backlinks", ["path", topEntry.path], "format=json"],
        signal,
        25_000,
      ),
      runCli(
        vault,
        ["links", ["path", topEntry.path]], // ⚠ links 不支持 format=json
        signal,
        25_000,
      ),
    ]);

  const related: Record<string, unknown> = {};

  if (contextResult.status === "fulfilled") {
    // search:context returns {file, matches: [{line, text}]}
    related.context = parseSearchContextJson(contextResult.value.stdout);
  } else {
    related.context = [];
  }

  if (backlinksResult.status === "fulfilled") {
    // backlinks returns {file: "path.md"}[]
    const backlinks = parseSearchJson(backlinksResult.value.stdout);
    related.backlinks = backlinks.map((b) => b.path);
  } else {
    related.backlinks = [];
  }

  if (linksResult.status === "fulfilled") {
    // links 返回纯文本（不支持 format=json）
    const links = parseTextPathLines(linksResult.value.stdout);
    related.links_out = links.map((l) => l.path);
  } else {
    related.links_out = [];
  }

  return related;
}

// ── Fallback Search: rg (4.10) ──────────────────────────────────

/**
 * Resolve the path to rg (ripgrep).
 * Checks common locations since spawnSync may not inherit the full user PATH.
 */
function resolveRgPath(): string | null {
  const candidates = [
    "rg", // PATH lookup
    "/Users/nantas-agent/.pi/agent/bin/rg",
    "/opt/homebrew/bin/rg",
    "/usr/local/bin/rg",
    process.env.HOME ? require("node:path").join(process.env.HOME, ".pi", "agent", "bin", "rg") : null,
  ].filter(Boolean) as string[];

  const { accessSync, constants } = require("node:fs");
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

async function runFallbackSearch(
  query: string,
  vault: string,
  scope?: string,
  limit: number = 5,
  startTime: number,
  signal?: AbortSignal,
): Promise<ToolResult> {
  let vaultPath: string;
  try {
    vaultPath = resolveVaultForPath(vault);
  } catch {
    return errorResult("Cannot resolve vault path for fallback search.", startTime);
  }

  const searchDir = scope ? resolve(vaultPath, scope) : vaultPath;
  const elapsed = Date.now() - startTime;

  try {
    // Try multiple locations for rg: PATH lookup, Pi's agent bin, homebrew, /usr/local
    const rgPath = resolveRgPath();
    if (!rgPath) {
      return errorResult(
        "rg (ripgrep) not found. Install it with: brew install ripgrep",
        startTime,
      );
    }

    const result = spawnSync(
      rgPath,
      ["-n", query, searchDir, "--max-count", "20"],
      { timeout: 15_000, signal },
    );

    if (result.error) {
      return errorResult(
        `Fallback search failed: ${result.error.message}`,
        startTime,
      );
    }

    const stdout = result.stdout?.toString("utf-8") ?? "";
    const entries = parseRgOutput(stdout, vaultPath);
    const scored = scoreAndRank(entries, scope, limit);

    return buildOutput({
      ok: true,
      mode: "fallback",
      vault,
      effectiveQuery: query,
      stats: {
        total_hits: entries.length,
        returned: scored.length,
        time_ms: elapsed,
      },
      topk: scored,
    });
  } catch (err) {
    return errorResult(
      `Fallback search error: ${err instanceof Error ? err.message : String(err)}`,
      startTime,
    );
  }
}

function resolveVaultForPath(vault: string): string {
  const known = getKnownVaults();
  const path = known.get(vault);
  if (path) return resolve(path);
  return resolve(vault);
}

function parseRgOutput(stdout: string, vaultPath: string): SearchResultEntry[] {
  const lines = stdout.trim().split("\n");
  const seenPaths = new Set<string>();
  const entries: SearchResultEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(/^([^:]+):(\d+):(.+)/);
    if (!match) continue;

    const fullPath = resolve(match[1].trim());
    let relPath: string;
    try {
      relPath = relative(vaultPath, fullPath);
    } catch {
      relPath = fullPath;
    }

    if (seenPaths.has(relPath)) continue;
    seenPaths.add(relPath);

    entries.push({
      title: relPath.split(sep).pop() ?? relPath,
      path: relPath,
      snippet: match[3].trim().slice(0, 200),
      relevance: 0.3,
    });
  }

  return entries;
}

// ── Output Construction (4.11) ──────────────────────────────────

interface OutputData {
  ok: boolean;
  mode: "cli" | "fallback";
  vault: string;
  effectiveQuery: string;
  stats: { total_hits: number; returned: number; time_ms: number };
  topk: ScoredEntry[];
  related?: Record<string, unknown>;
}

function buildOutput(data: OutputData): ToolResult {
  const { mode, vault, effectiveQuery, stats, topk, related } = data;

  const lines: string[] = [];
  lines.push("## Obsidian Search Results");
  lines.push(
    `**Query:** "${effectiveQuery}" | **Mode:** ${mode} | **Vault:** ${vault}`,
  );
  lines.push(`${stats.total_hits} total hits, returning top ${stats.returned}`);

  for (let i = 0; i < topk.length; i++) {
    const entry = topk[i];
    lines.push("");
    lines.push(
      `${i + 1}. **${entry.path}** (score: ${entry.adjustedScore.toFixed(2)})`,
    );
    lines.push(`   > ${entry.snippet.slice(0, 150)}...`);
    lines.push(`   _${entry.reason}_`);
  }

  const details: Record<string, unknown> = {
    ok: data.ok,
    mode,
    vault,
    effective_query: effectiveQuery,
    stats,
    topk: topk.map((entry) => ({
      path: entry.path,
      score: entry.adjustedScore,
      reason: entry.reason,
      snippet: entry.snippet,
    })),
  };

  if (related) {
    details.related = related;
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    details,
  };
}

// ── Error Helper ────────────────────────────────────────────────

function errorResult(
  message: string,
  startTime: number,
): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    details: {
      ok: false,
      error: message,
      stats: { time_ms: Date.now() - startTime },
    },
  };
}
