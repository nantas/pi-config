import { Type } from "typebox";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { resolveVault, clearVaultCache } from "./vault-resolver";
import {
  loadSearchConfig,
  handleSearchInit,
  type SearchConfig,
  type ScopeConfig,
} from "./search-config";

type ToolResult = {
  content: { type: "text"; text: string }[];
  details: Record<string, unknown>;
};

// ── Lazy ESM import for @ff-labs/fff-node ──────────────────────

type FileFinderType = import("@ff-labs/fff-node").FileFinder;
type GrepMatchType = import("@ff-labs/fff-node").GrepMatch;

let _FileFinderClass: typeof FileFinderType | null = null;

async function getFileFinderClass(): Promise<typeof FileFinderType | null> {
  if (_FileFinderClass !== null) return _FileFinderClass;
  try {
    const mod = await import("@ff-labs/fff-node");
    _FileFinderClass = mod.FileFinder;
    return _FileFinderClass;
  } catch (err) {
    console.warn(
      `[obsidian_search] @ff-labs/fff-node not available, falling back to rg:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

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
  init: Type.Optional(
    Type.Boolean({
      default: false,
      description:
        "Set to true to generate a default search-config.yaml at vault root. Use overwrite=true to replace existing config.",
    }),
  ),
  overwrite: Type.Optional(
    Type.Boolean({
      default: false,
      description:
        "Used with init=true to overwrite an existing search-config.yaml.",
    }),
  ),
});

interface SearchParams {
  query: string;
  vault?: string;
  mode?: "fast" | "deep";
  limit?: number;
  scope?: string;
  init?: boolean;
  overwrite?: boolean;
}

// ── Prompt Helpers ──────────────────────────────────────────────

const promptSnippet =
  "Search Obsidian vault content with intelligent ranking and automatic context expansion.";

const promptGuidelines = [
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
let _finder: InstanceType<FileFinderType> | null = null;
let _finderVaultPath: string | null = null;
let _tokenizerWorker: ChildProcess | null = null;
let _tokenizerWorkerReady = false;
let _tokenizerWorkerPath: string | null = null;

export function resetSessionState(): void {
  _sessionConfigCache.clear();
  clearVaultCache();
  // Clean up FFF finder
  if (_finder && !_finder.isDestroyed) {
    try { _finder.destroy(); } catch { /* ignore */ }
  }
  _finder = null;
  _finderVaultPath = null;
  // Clean up jieba worker
  if (_tokenizerWorker && !_tokenizerWorker.killed) {
    try {
      _tokenizerWorker.stdin?.end();
      _tokenizerWorker.kill();
    } catch { /* ignore */ }
  }
  _tokenizerWorker = null;
  _tokenizerWorkerReady = false;
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

  // Query sanitization
  const sanitizeResult = sanitizeQuery(params.query);
  if (!sanitizeResult.ok) {
    return errorResult(sanitizeResult.error, startTime);
  }
  const effectiveQuery = sanitizeResult.query;
  const mode = (params.mode ?? "fast") as "fast" | "deep";

  // Vault resolution
  let vaultPath: string;
  try {
    vaultPath = resolveVault(params.vault);
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : String(err),
      startTime,
    );
  }

  // Init mode: generate default config and return
  if (params.init) {
    try {
      const configPath = handleSearchInit(vaultPath, params.overwrite ?? false);
      const elapsed = Date.now() - startTime;
      return {
        content: [{ type: "text", text: `Created default search config: ${configPath}` }],
        details: { ok: true, init: true, config_path: configPath, stats: { time_ms: elapsed } },
      };
    } catch (err) {
      return errorResult(
        err instanceof Error ? err.message : String(err),
        startTime,
      );
    }
  }

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

  // Tokenize — returns raw tokens (not regex-escaped for FFF literal mode)
  const tokens = await tokenizeQuery(effectiveQuery, config);
  if (tokens.length === 0) {
    return errorResult(
      "No valid search tokens after tokenization.",
      startTime,
    );
  }

  // Execute search (FFF primary, rg fallback)
  const searchResult = await executeSearch(tokens, config, vaultPath, params.scope);

  // Merge results
  const merged = mergeRgResults(searchResult.scopeResults);

  // Rank — use raw tokens (strip regex escapes for filename matching)
  const rawTokens = tokens.map(t => t.replace(/\\/g, ""));
  const ranked = rankResults(merged, config, rawTokens, vaultPath);
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
    mode: searchResult.backend,
    vault: basename(vaultPath),
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

// ── Tokenization ────────────────────────────────────────────────

/**
 * Async tokenization: jieba worker uses async I/O.
 */
async function tokenizeQuery(query: string, config: SearchConfig): Promise<string[]> {
  const parts = query.trim().split(/\s+/).filter(Boolean);

  // Phase 1: Collect structured segments — each part produces one or more segments,
  // with Chinese segments either resolved immediately (Intl.Segmenter) or deferred (jieba).
  type Segment = { type: "literal"; tokens: string[] } | { type: "jieba"; text: string };
  const segments: Segment[] = [];

  for (const part of parts) {
    const hasChinese = /[\u4e00-\u9fff]/.test(part);
    if (hasChinese) {
      const chineseChars = part.replace(/[^\u4e00-\u9fff]/g, "");
      const nonChinese = part.replace(/[\u4e00-\u9fff]/g, "");

      if (chineseChars.length >= config.tokenization.cn_min_chars) {
        if (config.tokenization.method === "jieba") {
          segments.push({ type: "jieba", text: chineseChars });
        } else {
          segments.push({ type: "literal", tokens: segmentWithIntl(chineseChars) });
        }
      } else if (chineseChars.length > 0) {
        segments.push({ type: "literal", tokens: [chineseChars] });
      }

      if (nonChinese.length > 0) {
        segments.push({ type: "literal", tokens: [nonChinese] });
      }
    } else {
      segments.push({ type: "literal", tokens: [part] });
    }
  }

  // Phase 2: Resolve all jieba segments in one batch call
  const jiebaIndices = segments
    .map((s, i) => s.type === "jieba" ? i : -1)
    .filter(i => i !== -1);

  if (jiebaIndices.length > 0) {
    const jiebaTexts = jiebaIndices.map(i => (segments[i] as { type: "jieba"; text: string }).text);
    const jiebaResults = await tokenizeWithJieba(jiebaTexts);

    for (let k = 0; k < jiebaIndices.length; k++) {
      const idx = jiebaIndices[k];
      const tokens: string[] = jiebaResults
        ? jiebaResults[k]?.filter(t => t.trim().length > 0) ?? []
        : segmentWithIntl(jiebaTexts[k]);
      segments[idx] = { type: "literal", tokens };
    }
  }

  // Phase 3: Flatten all segments into deduplicated token list
  const allTokens: string[] = [];
  for (const seg of segments) {
    allTokens.push(...(seg as { type: "literal"; tokens: string[] }).tokens);
  }
  return [...new Set(allTokens)];
}

/**
 * Segment Chinese text using Intl.Segmenter (built-in Node.js ≥ 18).
 */
function segmentWithIntl(text: string): string[] {
  const tokens: string[] = [];
  const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
  const segments = Array.from(segmenter.segment(text));
  for (const seg of segments) {
    if (seg.isWordLike && seg.segment.length > 0) {
      tokens.push(seg.segment);
    }
  }
  return tokens;
}

/**
 * Async jieba tokenization via persistent Python worker.
 * Sends texts to tokenizer-worker.py via stdin/stdout JSON line protocol.
 * Returns null on error (caller should fall back to Intl.Segmenter).
 */
async function tokenizeWithJieba(texts: string[]): Promise<string[][] | null> {
  const worker = await ensureTokenizerWorker();
  if (!worker || worker.killed) return null;

  return new Promise<string[][] | null>((resolve) => {
    const timeout = setTimeout(() => {
      worker.stdout!.removeListener("data", onData);
      resolve(null);
    }, 3000);

    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf-8");
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx !== -1) {
        clearTimeout(timeout);
        worker.stdout!.removeListener("data", onData);
        const line = buffer.slice(0, newlineIdx);
        try {
          const parsed = JSON.parse(line);
          if (parsed && parsed.error) {
            console.warn(`[obsidian_search] jieba worker error: ${parsed.error}`);
            resolve(null);
          } else if (Array.isArray(parsed)) {
            resolve(parsed);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      }
    };

    worker.stdout!.on("data", onData);
    worker.stdin!.write(JSON.stringify(texts) + "\n");
  });
}

/**
 * Resolve the path to tokenizer-worker.py.
 */
function getTokenizerWorkerPath(): string {
  if (_tokenizerWorkerPath) return _tokenizerWorkerPath;
  const thisDir = dirname(fileURLToPath(import.meta.url));
  _tokenizerWorkerPath = resolve(thisDir, "tokenizer-worker.py");
  return _tokenizerWorkerPath;
}

/**
 * Resolve a usable Python interpreter for the jieba tokenizer worker.
 * Windows often lacks a working `python3` (the MS Store stub is a real exe
 * that exits non-zero), so probe platform-appropriate candidates in order.
 * Returns null when none works — caller falls back to Intl.Segmenter.
 * Override with PI_OBSIDIAN_PYTHON env var.
 */
let _pythonBin: string | null | undefined;

function resolvePythonBin(): string | null {
  if (_pythonBin !== undefined) return _pythonBin;
  const envBin = process.env.PI_OBSIDIAN_PYTHON;
  const candidates = envBin
    ? [envBin]
    : process.platform === "win32"
      ? ["python", "python3", "py"]
      : ["python3", "python"];
  for (const cmd of candidates) {
    try {
      const probe = spawnSync(cmd, ["-c", "import sys"], {
        stdio: "ignore",
        timeout: 5000,
      });
      if (probe.status === 0) {
        _pythonBin = cmd;
        return cmd;
      }
    } catch {
      // try next candidate
    }
  }
  _pythonBin = null;
  return null;
}

/**
 * Ensure the persistent tokenizer worker is running.
 * Spawns tokenizer-worker.py as a long-lived subprocess.
 * Returns the worker process or null on failure.
 */
async function ensureTokenizerWorker(): Promise<ChildProcess | null> {
  if (_tokenizerWorker && !_tokenizerWorker.killed && _tokenizerWorkerReady) {
    return _tokenizerWorker;
  }

  // Clean up any previous worker
  if (_tokenizerWorker && !_tokenizerWorker.killed) {
    try { _tokenizerWorker.kill(); } catch { /* ignore */ }
    _tokenizerWorker = null;
    _tokenizerWorkerReady = false;
  }

  const workerPath = getTokenizerWorkerPath();

  const pythonBin = resolvePythonBin();
  if (!pythonBin) {
    console.warn(
      "[obsidian_search] no Python interpreter found for jieba tokenizer; falling back to Intl.Segmenter",
    );
    return null;
  }

  return new Promise<ChildProcess | null>((resolve) => {
    try {
      const worker = spawn(pythonBin, [workerPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      worker.on("error", (err) => {
        console.warn(`[obsidian_search] jieba worker spawn error: ${err.message}`);
        resolve(null);
      });

      worker.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          console.warn(`[obsidian_search] jieba worker exited with code ${code}`);
        }
        _tokenizerWorkerReady = false;
      });

      // Wait for warmup: send a test tokenization and await response
      const warmupTimeout = setTimeout(() => {
        console.warn(`[obsidian_search] jieba worker warmup timed out`);
        worker.kill();
        resolve(null);
      }, 5000);

      let warmupBuffer = "";
      const onWarmup = (chunk: Buffer) => {
        warmupBuffer += chunk.toString("utf-8");
        if (warmupBuffer.includes("\n")) {
          clearTimeout(warmupTimeout);
          worker.stdout!.removeListener("data", onWarmup);
          _tokenizerWorker = worker;
          _tokenizerWorkerReady = true;
          resolve(worker);
        }
      };

      worker.stdout!.on("data", onWarmup);
      worker.stdin!.write(JSON.stringify(["初始化"]) + "\n");
    } catch (err) {
      console.warn(
        `[obsidian_search] Failed to start jieba worker:`,
        err instanceof Error ? err.message : String(err),
      );
      resolve(null);
    }
  });
}

// ── Search Execution ────────────────────────────────────────────

interface SearchResult {
  backend: "fff" | "rg";
  scopeResults: ScopeSearchResult[];
}

/**
 * Execute search using FFF (primary) or rg (fallback).
 */
async function executeSearch(
  tokens: string[],
  config: SearchConfig,
  vaultPath: string,
  explicitScope?: string,
): Promise<SearchResult> {
  // Try FFF first
  const finder = await initializeFinder(vaultPath);
  if (finder) {
    try {
      const fffResult = await executeFffSearch(finder, tokens, config, vaultPath, explicitScope);
      if (fffResult.scopeResults.length > 0) return fffResult;
    } catch (err) {
      console.warn(
        `[obsidian_search] FFF search failed, falling back to rg:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // Fallback to rg
  return executeRgSearch(tokens, config, vaultPath, explicitScope);
}

/**
 * Initialize FFF FileFinder lazily (once per session per vault).
 */
async function initializeFinder(vaultPath: string): Promise<InstanceType<FileFinderType> | null> {
  // Reuse existing finder if same vault
  if (_finder && !_finder.isDestroyed && _finderVaultPath === vaultPath) {
    return _finder;
  }

  // Clean up previous finder
  if (_finder && !_finder.isDestroyed) {
    try { _finder.destroy(); } catch { /* ignore */ }
    _finder = null;
  }

  const FF = await getFileFinderClass();
  if (!FF || !FF.isAvailable()) return null;

  const createResult = FF.create({
    basePath: vaultPath,
    disableWatch: true,
    disableMmapCache: true,
  });

  if (!createResult.ok) {
    console.warn(`[obsidian_search] FFF create failed: ${createResult.error}`);
    return null;
  }

  const finder = createResult.value;
  const scanResult = await finder.waitForIndexReady(10000);
  if (!scanResult.ok || !scanResult.value) {
    console.warn(`[obsidian_search] FFF scan timed out, falling back to rg`);
    finder.destroy();
    return null;
  }

  _finder = finder;
  _finderVaultPath = vaultPath;
  return finder;
}

/**
 * Execute search using FFF multiGrep (Aho-Corasick multi-pattern literal match).
 *
 * Runs one FFF search per scope directory (matching the rg path) so that:
 * - Each scope is constrained to its directory (no result cap leakage)
 * - Each scope gets its correct weight
 * - Non-scope directories are never searched
 */
async function executeFffSearch(
  finder: InstanceType<FileFinderType>,
  tokens: string[],
  config: SearchConfig,
  vaultPath: string,
  explicitScope?: string,
): Promise<SearchResult> {
  const searchDirs = resolveSearchDirs(vaultPath, config, explicitScope);

  const scopeResults: ScopeSearchResult[] = [];

  for (const { scope } of searchDirs) {
    // Build FFF directory constraint: converts "20-synthesis" → "20-synthesis/*"
    const constraints = scope.path === "."
      ? undefined
      : (scope.path.startsWith("/") ? scope.path + "/*" : scope.path + "/*");

    const result = finder.multiGrep({
      patterns: tokens,
      constraints,
      pageSize: config.runtime.fff_page_size,
      timeBudgetMs: config.runtime.fff_timeout_ms,
    });

    if (!result.ok) {
      console.warn(`[obsidian_search] FFF multiGrep error in scope ${scope.path}: ${result.error}`);
      continue;
    }

    let matches = fffMatchesToRgMatches(result.value.items, vaultPath);
    // For root scope, filter to root-level files only (matches rg --max-depth 1 behavior)
    if (scope.path === ".") {
      matches = matches.filter(m => !m.file.includes("/"));
    }
    if (matches.length > 0) {
      scopeResults.push({ scope, matches });
    }
  }

  return { backend: "fff", scopeResults };
}

/**
 * Convert FFF GrepMatch[] to internal RgMatch[] format.
 */
function fffMatchesToRgMatches(items: GrepMatchType[], vaultPath: string): RgMatch[] {
  const matches: RgMatch[] = [];
  for (const item of items) {
    matches.push({
      file: item.relativePath,
      lineNum: item.lineNumber,
      text: item.lineContent.trim(),
    });
  }
  return matches;
}

/**
 * Execute search using rg (ripgrep) — the fallback path.
 */
function executeRgSearch(
  tokens: string[],
  config: SearchConfig,
  vaultPath: string,
  explicitScope?: string,
): SearchResult {
  // For rg, tokens need regex escaping and OR joining
  const pattern = tokens.map(t => escapeRegex(t)).join("|");

  const searchDirs = resolveSearchDirs(vaultPath, config, explicitScope);

  const scopeResults: ScopeSearchResult[] = searchDirs.map(({ dir, scope }) => {
    const result = runRgSearch(dir, pattern, config.runtime.rg_timeout_ms, vaultPath);
    if (result.error) {
      console.warn(`[obsidian_search] rg error in scope ${scope.path}: ${result.error}`);
    }
    return { scope, matches: result.matches };
  }).filter(r => r.matches.length > 0);

  return { backend: "rg", scopeResults };
}

// ── Scope Resolution (rg fallback path) ─────────────────────────

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

// ── RG Search (fallback) ───────────────────────────────────────

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
    const args = ["-n", pattern, dir, "--max-count", "40"];
    if (resolve(dir) === resolve(vaultPath)) {
      args.push("--max-depth", "1");
    }
    const result = spawnSync(rgPath, args, { timeout: timeoutMs });

    if (result.error) {
      return { matches: [], error: `rg error: ${result.error.message}` };
    }

    if (result.status !== 0 && result.status !== null) {
      if (result.signal) {
        return { matches: [], error: `rg killed by signal: ${result.signal}` };
      }
    }

    const stdout = result.stdout?.toString("utf-8") ?? "";
    const matches: RgMatch[] = [];

    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Result Merge ────────────────────────────────────────────────

function mergeRgResults(results: ScopeSearchResult[]): MergedResult[] {
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
      const lowerToken = token.toLowerCase();
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
          inFm = true;
        } else {
          return i + 1;
        }
      }
    }
    return 0;
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
  mode: "fff" | "rg";
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
    `**Query:** "${effectiveQuery}" | **Backend:** ${mode} | **Vault:** ${vault}`,
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
