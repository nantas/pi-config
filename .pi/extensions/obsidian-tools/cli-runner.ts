import { spawn } from "node:child_process";

const FALLBACK_PATH = "/Applications/Obsidian.app/Contents/MacOS/obsidian";
const DEFAULT_TIMEOUT_MS = 25_000;

export interface CliResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface SearchResultEntry {
  title: string;
  path: string;
  snippet: string;
  relevance: number;
}

export interface ContextMatch {
  file: string;
  line: number;
  text: string;
}

export interface ContextResult {
  file: string;
  matches: ContextMatch[];
}

/**
 * Run an Obsidian CLI command with timeout and abort support.
 *
 * Constructs arguments as: obsidian vault="<vault>" <args>...
 * Falls back to /Applications/Obsidian.app/Contents/MacOS/obsidian on ENOENT.
 */
export function runCli(
  vault: string,
  args: (string | [string, string])[],
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
      const flatArgs: string[] = [];

  // Only add vault= prefix if a vault is specified
  if (vault) {
    flatArgs.push(`vault=${vault}`);
  }

    for (const arg of args) {
      if (typeof arg === "string") {
        flatArgs.push(arg);
      } else {
        flatArgs.push(`${arg[0]}=${arg[1]}`);
      }
    }

    let binary = "obsidian";

    const child = spawn(binary, flatArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 0, // we handle timeout manually
      signal,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    let settled = false;

    const cleanup = () => {
      settled = true;
      child.kill("SIGTERM");
    };

    // Timeout handling
    const timer = setTimeout(() => {
      if (!settled) {
        cleanup();
        resolve({ stdout: "", stderr: "Command timed out", code: null });
      }
    }, timeoutMs);

    // Parent abort signal
    if (signal) {
      if (signal.aborted) {
        cleanup();
        clearTimeout(timer);
        resolve({ stdout: "", stderr: "Aborted", code: null });
        return;
      }
      const onAbort = () => {
        if (!settled) {
          cleanup();
          clearTimeout(timer);
          resolve({ stdout: "", stderr: "Aborted", code: null });
        }
      };
      signal.addEventListener("abort", onAbort, { once: true });
      // Detach listener after child exits to prevent memory leaks
      child.on("exit", () => signal.removeEventListener("abort", onAbort));
    }

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      clearTimeout(timer);

      if (err.code === "ENOENT") {
        // Fallback to hardcoded macOS path
        if (binary === "obsidian") {
          binary = FALLBACK_PATH;
          const fallbackChild = spawn(binary, flatArgs, {
            stdio: ["pipe", "pipe", "pipe"],
            signal,
          });

          const fbStdout: Buffer[] = [];
          const fbStderr: Buffer[] = [];

          fallbackChild.stdout.on("data", (chunk: Buffer) => fbStdout.push(chunk));
          fallbackChild.stderr.on("data", (chunk: Buffer) => fbStderr.push(chunk));

          const fbTimer = setTimeout(() => {
            if (!settled) {
              settled = true;
              fallbackChild.kill("SIGTERM");
              resolve({ stdout: "", stderr: "Command timed out", code: null });
            }
          }, timeoutMs);

          fallbackChild.on("error", (_fbErr: NodeJS.ErrnoException) => {
            if (settled) return;
            clearTimeout(fbTimer);
            settled = true;
            resolve({
              stdout: "",
              stderr:
                "Obsidian CLI not found. Ensure Obsidian 1.12.0+ is installed and CLI is enabled.",
              code: null,
            });
          });

          fallbackChild.on("close", (code) => {
            if (settled) return;
            clearTimeout(fbTimer);
            settled = true;
            resolve({
              stdout: Buffer.concat(fbStdout).toString("utf-8"),
              stderr: Buffer.concat(fbStderr).toString("utf-8"),
              code,
            });
          });
        } else {
          settled = true;
          resolve({
            stdout: "",
            stderr:
              "Obsidian CLI not found. Ensure Obsidian 1.12.0+ is installed and CLI is enabled.",
            code: null,
          });
        }
      } else {
        settled = true;
        resolve({ stdout: "", stderr: err.message, code: null });
      }
    });

    child.on("close", (code) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        code,
      });
    });
  });
}

// ── CLI output parsers ─────────────────────────────────────────-

/**
 * Parse `obsidian search ... format=json` output.
 *
 * Actual CLI format: JSON array of path strings
 * ```json
 * ["path/to/file1.md", "path/to/file2.md"]
 * ```
 *
 * No titles, snippets, or relevance scores from the CLI.
 * title is derived from filename, snippet is empty, relevance defaults to 0.5.
 */
export function parseSearchJson(stdout: string): SearchResultEntry[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      // Detect format: string[] (paths only) vs array of objects
      if (parsed.length === 0) return [];

      if (typeof parsed[0] === "string") {
        // string[] — just paths
        return parsed.map((path: string) => ({
          title: pathToTitle(path),
          path,
          snippet: "",
          relevance: 0.5,
        }));
      }

      if (typeof parsed[0] === "object") {
        // {file: "path"}[] — backlinks format
        return parsed.map((item: Record<string, unknown>) => {
          const path = String(item.file ?? item.path ?? "");
          return {
            title: pathToTitle(path),
            path,
            snippet: "",
            relevance: 0.5,
          };
        });
      }
    }

    // Single object
    if (typeof parsed === "object" && parsed !== null) {
      const path = String((parsed as Record<string, unknown>).file ?? (parsed as Record<string, unknown>).path ?? "");
      return [{
        title: pathToTitle(path),
        path,
        snippet: "",
        relevance: 0.5,
      }];
    }
  } catch {
    // JSON parse failed — fall through to line-by-line
  }

  // Fallback: plain text, one path per line
  return parseSearchLines(trimmed);
}

/**
 * Parse `obsidian search:context ... format=json` output.
 *
 * Actual CLI format:
 * ```json
 * [{"file":"path.md","matches":[{"line":45,"text":"..."}]}]
 * ```
 */
export function parseSearchContextJson(stdout: string): SearchResultEntry[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item: Record<string, unknown>) => {
        const path = String(item.file ?? "");
        const matches = item.matches as ContextMatch[] | undefined;
        const snippet = matches && matches.length > 0
          ? matches.map((m) => m.text).join("\n").slice(0, 300)
          : "";
        return {
          title: pathToTitle(path),
          path,
          snippet,
          relevance: 0.5,
        };
      });
    }
  } catch {
    // fall through
  }

  return parseSearchLines(trimmed);
}

/**
 * Parse plain text path list (one path per line).
 * Used for `obsidian links ...` which does NOT support format=json.
 */
export function parseTextPathLines(stdout: string): SearchResultEntry[] {
  const lines = stdout.trim().split("\n");
  const results: SearchResultEntry[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue;
    if (!looksLikeFilePath(line)) continue;
    seen.add(line);
    results.push({
      title: pathToTitle(line),
      path: line,
      snippet: "",
      relevance: 0.5,
    });
  }

  return results;
}

/** Derive a display title from a file path. */
function pathToTitle(p: string): string {
  // Extract the filename without extension
  const segments = p.replace(/\\/g, "/").split("/");
  const last = segments[segments.length - 1];
  return last.replace(/\.\w+$/, "");
}

/**
 * Check if a string looks like a valid vault file path.
 * Filters out error messages like "No matches found."
 * that are not file paths.
 */
function looksLikeFilePath(s: string): boolean {
  return /[\w\-]+\.\w+/.test(s) || s.includes("/") || s.includes("\\");
}

/**
 * Line-by-line fallback parsing for non-JSON CLI output.
 * Each line is treated as a file path. Lines that don't look like
 * file paths (e.g. "No matches found.") are filtered out.
 */
function parseSearchLines(output: string): SearchResultEntry[] {
  const lines = output.trim().split("\n");
  const results: SearchResultEntry[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue;
    // Filter out non-path text like "No matches found."
    if (!looksLikeFilePath(line)) continue;
    seen.add(line);
    results.push({
      title: pathToTitle(line),
      path: line,
      snippet: "",
      relevance: 0.5,
    });
  }

  return results;
}
