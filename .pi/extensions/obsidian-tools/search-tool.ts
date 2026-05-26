import { Type } from "typebox";
import { spawnSync } from "node:child_process";
import { relative, resolve, sep } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { runCli } from "./cli-runner";
import {
  resolveVault,
  ensurePreloaded,
  resolveVaultPath,
} from "./vault-resolver";
import {
  loadSearchConfig,
  type SearchConfig,
  type ScopeConfig,
} from "./search-config";

type ToolResult = {
  content: { type: "text"; text: string }[];
  details: Record<string, unknown>;
};

// ── Parameter Schema ────────────────────────────────────────────

const searchParams = Type.Object({
  query: Type.String({
    description:
      "Search query — use keyword combinations, not full sentences. " +
      "Extract key entities and action/behavior words. " +
      "Use both English and Chinese keywords for better coverage.",
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
        '"fast" for targeted lookups, "deep" for context expansion.',
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
        "Optional subdirectory path to limit search scope (e.g., '20-synthesis/digest/游戏分析').",
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
  "Search Obsidian vault content with intelligent ranking and automatic context expansion.";

const promptGuidelines = [
  "Prefer obsidian_search over direct obsidian_cli for retrieval — it handles ranking and expansion automatically.",
  "Fast mode (~3s) for targeted lookups like project pages or known document titles.",
  "Deep mode (~5-8s) when decision context, backlinks, or related documents matter.",
  "Set scope to a subdirectory when the query is specific to a project area.",
  "Use keyword-style queries, not full sentences. Convert 'What is the architecture of OrbitOS?' → 'OrbitOS architecture'.",
  "Search with both English and Chinese keywords for better coverage.",
  "If results are few, retry with synonyms or translations of key terms.",
  "Use `scope` to narrow search to a specific subdirectory (e.g., '20-synthesis/digest/游戏分析').",
  "When results have low confidence (all scores < 0.4), suggest the user refine their query.",
];

// ── Session State ───────────────────────────────────────────────

let _sessionConfigCache: Map<string, SearchConfig> = new Map();
let _preflightDone = false;
let _preflightMode: "rg-primary" = "rg-primary";

export function resetSessionState(): void {
  _sessionConfigCache.clear();
  _preflightDone = false;
  _preflightMode = "rg-primary";
}

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

// ── Internal Types ──────────────────────────────────────────────

interface RgMatch {
  file: string; // relative to vault root
  lineNum: number;
  text: string;
}

interface ScopeSearchResult {
  scope: ScopeConfig;
  matches: RgMatch[];
}

interface MergedResult {
  file: string;
  matches: RgMatch[];
  scope: ScopeConfig;
}

interface RankedResult extends MergedResult {
  score: number;
  reason: string;
}

interface SnippetResult extends RankedResult {
  snippet: string;
}

// ── Execute ─────────────────────────────────────────────────────

async function searchToolExecute(
  _toolCallId: string,
  params: SearchParams,
  signal: AbortSignal | undefined,
  _onUpdate: any,
  _ctx: any,
): Promise<ToolResult> {
  const startTime = Date.now();

  // Lazy preload
  await ensurePreloaded();

  // Query sanitization
  const sanitizeResult = sanitizeQuery(params.query);
  if (!sanitizeResult.ok) {
    return errorResult(sanitizeResult.error, startTime);
  }
  const effectiveQuery = sanitizeResult.query;
  const mode = (params.mode ?? "fast") as "fast" | "deep";

  // Vault resolution
  let vaultName: string;
  try {
    vaultName = resolveVault(params.vault);
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : String(err),
      startTime,
    );
  }
  const vaultPath = resolveVaultPath(vaultName);

  // Preflight
  const preflightMode = await ensurePreflight(vaultName, signal);

  // Load config
  let config: SearchConfig;
  try {
    config = loadSearchConfig(vaultPath);
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : String(err),
      startTime,
    );
  }

  const limit = Math.min(
    params.limit ?? config.runtime.max_results,
    config.runtime.max_results,
  );

  // Tokenize
  const tokens = tokenizeQuery(effectiveQuery, config);
  if (tokens.length === 0) {
    return errorResult(
      "No valid search tokens after tokenization.",
      startTime,
    );
  }
  const pattern = tokens.join("|");

  // Resolve search directories
  const searchDirs = resolveSearchDirs(vaultPath, config, params.scope);
  if (searchDirs.length === 0) {
    return errorResult(
      "No search scopes configured. Check search-config.yaml.",
      startTime,
    );
  }

  // Run rg in parallel per scope
  const rgPromises = searchDirs.map(({ dir, scope }) =>
    Promise.resolve().then(() => {
      const result = runRgSearch(
        dir,
        pattern,
        config.runtime.rg_timeout_ms,
        vaultPath,
      );
      if (result.error) {
        console.warn(
          `[obsidian_search] rg error in scope ${scope.path}: ${result.error}`,
        );
      }
      return { scope, matches: result.matches } as ScopeSearchResult;
    }),
  );

  const scopeResults = (await Promise.all(rgPromises)).filter(
    (r) => r.matches.length > 0,
  );

  // Merge results
  const merged = mergeRgResults(scopeResults);

  // Rank
  const ranked = rankResults(merged, config, tokens, vaultPath);
  const topk = ranked.slice(0, limit);

  // Generate snippets
  const withSnippets: SnippetResult[] = topk.map((r) => ({
    ...r,
    snippet: generateSnippet(resolve(vaultPath, r.file), r.matches, mode, config),
  }));

  // Build output
  const elapsed = Date.now() - startTime;
  return buildOutput({
    ok: true,
    mode: preflightMode,
    vault: vaultName,
    effectiveQuery,
    stats: {
      total_hits: merged.length,
      returned: withSnippets.length,
      time_ms: elapsed,
    },
    topk: withSnippets,
  });
}

// ── Query Sanitization ──────────────────────────────────────────

const QUERY_REGEX = /^[\p{L}\p{N}\s:_\-./]+$/u;

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
        "Invalid query: only letters, numbers, spaces, colons, underscores, hyphens, periods, and slashes are allowed.",
    };
  }

  if (sanitized.length === 0) {
    return { ok: false, error: "Query cannot be empty after sanitization." };
  }

  return { ok: true, query: sanitized };
}

// ── Preflight ───────────────────────────────────────────────────

async function ensurePreflight(
  _vault: string,
  _signal?: AbortSignal,
): Promise<"rg-primary"> {
  // Since D1: rg is the sole search backend — no CLI search probe needed.
  // The preflight gate is retained for session-lifecycle consistency
  // but always resolves to rg-primary.
  _preflightDone = true;
  return "rg-primary";
}

// ── Tokenization ────────────────────────────────────────────────

function tokenizeQuery(query: string, config: SearchConfig): string[] {
  const tokens: string[] = [];
  const parts = query.trim().split(/\s+/);

  for (const part of parts) {
    if (!part) continue;

    const hasChinese = /[\u4e00-\u9fff]/.test(part);
    if (hasChinese) {
      const chineseChars = part.replace(/[^\u4e00-\u9fff]/g, "");
      const nonChinese = part.replace(/[\u4e00-\u9fff]/g, "");

      if (chineseChars.length >= config.tokenization.cn_min_chars) {
        const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
        const segments = Array.from(segmenter.segment(chineseChars));
        for (const seg of segments) {
          if (seg.isWordLike && seg.segment.length > 0) {
            tokens.push(escapeRegex(seg.segment));
          }
        }
      } else if (chineseChars.length > 0) {
        tokens.push(escapeRegex(chineseChars));
      }

      if (nonChinese.length > 0) {
        tokens.push(escapeRegex(nonChinese));
      }
    } else {
      tokens.push(escapeRegex(part));
    }
  }

  return [...new Set(tokens)];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Scope Resolution ────────────────────────────────────────────

function resolveSearchDirs(
  vaultPath: string,
  config: SearchConfig,
  explicitScope?: string,
): { dir: string; scope: ScopeConfig }[] {
  if (explicitScope) {
    return [
      {
        dir: resolve(vaultPath, explicitScope),
        scope: { path: explicitScope, weight: 1.0, default: false },
      },
    ];
  }
  return config.scopes
    .filter((s) => s.default)
    .map((s) => ({ dir: resolve(vaultPath, s.path), scope: s }));
}

// ── RG Search ───────────────────────────────────────────────────

function resolveRgPath(): string | null {
  const candidates = [
    "rg",
    "/Users/nantas-agent/.pi/agent/bin/rg",
    "/opt/homebrew/bin/rg",
    "/usr/local/bin/rg",
    process.env.HOME
      ? resolve(process.env.HOME, ".pi", "agent", "bin", "rg")
      : null,
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

function runRgSearch(
  dir: string,
  pattern: string,
  timeoutMs: number,
  vaultPath: string,
): { matches: RgMatch[]; error?: string } {
  const rgPath = resolveRgPath();
  if (!rgPath) {
    return {
      matches: [],
      error: "rg (ripgrep) not found. Install it with: brew install ripgrep",
    };
  }

  try {
    const result = spawnSync(
      rgPath,
      ["-n", pattern, dir, "--max-count", "40"],
      { timeout: timeoutMs },
    );

    if (result.error) {
      return { matches: [], error: `rg error: ${result.error.message}` };
    }

    if (result.status !== 0 && result.status !== null) {
      // rg returns non-zero when no matches found — this is OK
      // but if it was killed by signal (timeout), report it
      if (result.signal) {
        return { matches: [], error: `rg killed by signal: ${result.signal}` };
      }
    }

    const stdout = result.stdout?.toString("utf-8") ?? "";
    const matches: RgMatch[] = [];

    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      // Format: absolute_path:line:text
      const idx1 = line.indexOf(":");
      if (idx1 === -1) continue;
      const idx2 = line.indexOf(":", idx1 + 1);
      if (idx2 === -1) continue;

      const fullPath = line.slice(0, idx1);
      const lineNumStr = line.slice(idx1 + 1, idx2);
      const text = line.slice(idx2 + 1);
      const lineNum = parseInt(lineNumStr, 10);
      if (isNaN(lineNum)) continue;

      try {
        const relPath = relative(vaultPath, fullPath);
        if (relPath.startsWith("..") || relPath === fullPath) {
          // File outside vault — skip
          continue;
        }
        matches.push({ file: relPath, lineNum, text: text.trim() });
      } catch {
        matches.push({ file: fullPath, lineNum, text: text.trim() });
      }
    }

    return { matches };
  } catch (err) {
    return {
      matches: [],
      error: `rg search error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Result Merge ────────────────────────────────────────────────

function mergeRgResults(results: ScopeSearchResult[]): MergedResult[] {
  // Collect match counts per file per scope
  const scopeCounts = new Map<string, Map<string, number>>();
  const allMatches = new Map<string, RgMatch[]>();

  for (const { scope, matches } of results) {
    for (const match of matches) {
      if (!allMatches.has(match.file)) {
        allMatches.set(match.file, []);
      }
      allMatches.get(match.file)!.push(match);

      if (!scopeCounts.has(match.file)) {
        scopeCounts.set(match.file, new Map());
      }
      const counts = scopeCounts.get(match.file)!;
      counts.set(scope.path, (counts.get(scope.path) ?? 0) + 1);
    }
  }

  const merged: MergedResult[] = [];
  for (const [file, matches] of allMatches) {
    const counts = scopeCounts.get(file)!;
    let bestScopePath = "";
    let bestCount = 0;
    for (const [path, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestScopePath = path;
      }
    }

    const bestScope =
      results.find((r) => r.scope.path === bestScopePath)?.scope ?? {
        path: bestScopePath,
        weight: 1.0,
        default: true,
      };

    merged.push({ file, matches, scope: bestScope });
  }

  return merged;
}

// ── Ranking ─────────────────────────────────────────────────────

function rankResults(
  entries: MergedResult[],
  config: SearchConfig,
  queryTokens: string[],
  vaultPath: string,
): RankedResult[] {
  const scored = entries.map((entry) => {
    let score = 1.0;
    const reasons: string[] = [];

    // directory_weight
    const dirWeight = entry.scope.weight;
    score *= dirWeight;
    reasons.push(`dir:${dirWeight.toFixed(1)}`);

    // filename_bonus
    const filename = entry.file.split(sep).pop()?.replace(/\.md$/i, "") ?? "";
    const lowerFilename = filename.toLowerCase();
    let filenameBonus = 1.0;
    for (const token of queryTokens) {
      const lowerToken = token.toLowerCase().replace(/\\/g, "");
      if (lowerFilename === lowerToken) {
        filenameBonus = Math.max(filenameBonus, config.ranking.filename_exact);
      } else if (lowerFilename.includes(lowerToken)) {
        filenameBonus = Math.max(
          filenameBonus,
          config.ranking.filename_partial,
        );
      }
    }
    score *= filenameBonus;
    if (filenameBonus >= config.ranking.filename_exact) {
      reasons.push("filename_exact");
    } else if (filenameBonus >= config.ranking.filename_partial) {
      reasons.push("filename_partial");
    }

    // Resolve file path once for reuse in downstream scoring
    const filePath = resolve(vaultPath, entry.file);

    // match_position_bonus — best among all matches
    const fmEndLine = getFrontmatterEndLine(filePath);
    let bestPositionBonus = config.ranking.match_position.body;
    for (const match of entry.matches) {
      const bonus = computeMatchPositionBonus(match, config, fmEndLine);
      if (bonus > bestPositionBonus) {
        bestPositionBonus = bonus;
      }
    }
    score *= bestPositionBonus;
    if (bestPositionBonus > config.ranking.match_position.body) {
      reasons.push(`pos:${bestPositionBonus.toFixed(1)}`);
    }

    // content_density_bonus
    const totalLines = getFileLineCount(filePath);
    const densityBonus =
      totalLines > 0
        ? Math.min(
            1.0 +
              (entry.matches.length / totalLines) *
                (config.ranking.content_density_max - 1.0),
            config.ranking.content_density_max,
          )
        : 1.0;
    score *= densityBonus;
    if (densityBonus > 1.1) {
      reasons.push(`density:${densityBonus.toFixed(2)}`);
    }

    // file_size_penalty
    const fileSizeKb = getFileSizeKb(filePath);
    let sizePenalty = 1.0;
    if (
      fileSizeKb !== null &&
      (fileSizeKb < config.ranking.file_size.min_kb ||
        fileSizeKb > config.ranking.file_size.max_kb)
    ) {
      sizePenalty = 0.5;
      reasons.push("size_penalty");
    }
    score *= sizePenalty;

    return {
      ...entry,
      score: Math.round(score * 100) / 100,
      reason: reasons.join("+"),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function computeMatchPositionBonus(
  match: RgMatch,
  config: SearchConfig,
  fmEndLine: number,
): number {
  // Use precise frontmatter boundary (closing --- line number) when available,
  // falling back to heuristic (line <= 20) for files where boundary detection failed.
  const inFrontmatter = fmEndLine > 0
    ? match.lineNum <= fmEndLine
    : match.lineNum <= 20;

  if (inFrontmatter) {
    const text = match.text.trim();
    if (/^[a-zA-Z_]+:/.test(text)) {
      if (text.startsWith("title:")) {
        return config.ranking.match_position.frontmatter_title;
      }
      if (text.startsWith("tags:")) {
        return config.ranking.match_position.frontmatter_tags;
      }
      return config.ranking.match_position.frontmatter_other;
    }
  }
  if (/^#+\s/.test(match.text)) {
    return config.ranking.match_position.heading;
  }
  return config.ranking.match_position.body;
}

function getFileLineCount(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

function getFileSizeKb(filePath: string): number | null {
  try {
    const stats = statSync(filePath);
    return stats.size / 1024;
  } catch {
    return null;
  }
}

/**
 * Detect the closing line number of the frontmatter block.
 * Reads the first 30 lines, looking for a pair of '---' delimiters.
 * Returns the 1-based line number of the closing '---', or 0 if no frontmatter found.
 */
function getFrontmatterEndLine(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const maxCheck = Math.min(lines.length, 30);
    let inFm = false;
    for (let i = 0; i < maxCheck; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === "---") {
        if (!inFm) {
          inFm = true;  // opening ---
        } else {
          return i + 1; // closing ---, 1-based line number
        }
      }
    }
    return 0; // no frontmatter block found
  } catch {
    return 0;
  }
}

// ── Snippet Generation ──────────────────────────────────────────

function generateSnippet(
  filePath: string,
  matches: RgMatch[],
  mode: "fast" | "deep",
  config: SearchConfig,
): string {
  if (mode === "fast") {
    const uniqueTexts = [...new Set(matches.map((m) => m.text))];
    return uniqueTexts.slice(0, 3).join(" / ");
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return matches.map((m) => m.text).slice(0, 3).join(" / ");
  }

  const lines = content.split("\n");

  // Extract preview paragraph (first non-empty, non-frontmatter, non-heading text)
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let preview = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!frontmatterSeen) {
      if (line === "---") {
        inFrontmatter = !inFrontmatter;
        if (!inFrontmatter) frontmatterSeen = true;
        continue;
      }
      if (inFrontmatter) continue;
      frontmatterSeen = true;
    }
    if (line === "" || line.startsWith("#")) {
      if (preview.length > 0) break;
      continue;
    }
    preview += line + " ";
    if (preview.length >= config.runtime.snippet_preview_chars) break;
  }
  preview = preview.slice(0, config.runtime.snippet_preview_chars).trim();

  // Find best match region (highest density of matching lines)
  const matchLineNums = new Set(matches.map((m) => m.lineNum));
  let bestRegion = { start: 0, end: 0, density: 0 };

  for (const lineNum of matchLineNums) {
    const start = Math.max(0, lineNum - 1 - config.runtime.snippet_context_lines);
    const end = Math.min(
      lines.length,
      lineNum - 1 + config.runtime.snippet_context_lines + 1,
    );
    let density = 0;
    for (let i = start; i < end; i++) {
      if (matchLineNums.has(i + 1)) density++;
    }
    if (density > bestRegion.density) {
      bestRegion = { start, end, density };
    }
  }

  const contextLines = lines.slice(bestRegion.start, bestRegion.end);
  const context = contextLines.join("\n").trim();

  if (preview && context) {
    return `${preview}\n---\n${context}`;
  }
  return preview || context || matches[0]?.text || "";
}

// ── Output Construction ─────────────────────────────────────────

interface OutputData {
  ok: boolean;
  mode: "rg-primary";
  vault: string;
  effectiveQuery: string;
  stats: { total_hits: number; returned: number; time_ms: number };
  topk: SnippetResult[];
}

function buildOutput(data: OutputData): ToolResult {
  const { mode, vault, effectiveQuery, stats, topk } = data;

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
      `${i + 1}. **${entry.file}** (score: ${entry.score.toFixed(2)})`,
    );
    const snippetLines = entry.snippet.split("\n");
    for (const sl of snippetLines) {
      lines.push(`   > ${sl.slice(0, 200)}`);
    }
    lines.push(`   _${entry.reason}_`);
  }

  const details: Record<string, unknown> = {
    ok: data.ok,
    mode,
    vault,
    effective_query: effectiveQuery,
    stats,
    topk: topk.map((entry) => ({
      path: entry.file,
      score: entry.score,
      reason: entry.reason,
      snippet: entry.snippet,
      matches: entry.matches.length,
    })),
  };

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    details,
  };
}

// ── Error Helper ────────────────────────────────────────────────

function errorResult(message: string, startTime: number): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    details: {
      ok: false,
      error: message,
      stats: { time_ms: Date.now() - startTime },
    },
  };
}
