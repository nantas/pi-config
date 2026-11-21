/**
 * bash-search-guard
 *
 * Global runtime guard extension: blocks bash commands that use grep/egrep/fgrep/rg/find
 * as the command (or pipeline head) for repository search, redirecting the agent to the
 * dedicated Pi `grep`/`find` tools. Downstream pipe filtering of non-search commands
 * (e.g. `ps aux | grep node`) stays allowed.
 *
 * Zero external dependencies: only pi-coding-agent types and `isToolCallEventType`.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuardResult {
  blocked: boolean;
  command?: string;
  suggestedTool?: "grep" | "find";
  reason?: string;
}

const CONTENT_SEARCH_COMMANDS = new Set(["grep", "egrep", "fgrep", "rg"]);
const FILE_SEARCH_COMMANDS = new Set(["find"]);
const WRAPPER_COMMANDS = new Set(["env", "command", "time", "nice", "sudo"]);

// ---------------------------------------------------------------------------
// Command splitting (quote/escape aware)
// ---------------------------------------------------------------------------

/**
 * Split a command string into top-level statements on `;`, `&&`, `||`, and newlines,
 * skipping separators inside single quotes, double quotes, or after a backslash.
 */
function splitStatements(command: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"' && i + 1 < command.length) {
        current += command[i + 1];
        i++;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "\\") {
      current += ch;
      if (i + 1 < command.length) current += command[++i];
      continue;
    }
    if (ch === ";" || ch === "\n") {
      statements.push(current);
      current = "";
      continue;
    }
    if (ch === "&" && command[i + 1] === "&") {
      statements.push(current);
      current = "";
      i++;
      continue;
    }
    if (ch === "|" && command[i + 1] === "|") {
      statements.push(current);
      current = "";
      i++;
      continue;
    }
    current += ch;
  }
  statements.push(current);
  return statements;
}

/** Split a single statement into pipeline segments on top-level `|` (quote/escape aware). */
function splitPipelineSegments(statement: string): string[] {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < statement.length; i++) {
    const ch = statement[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"' && i + 1 < statement.length) {
        current += statement[i + 1];
        i++;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "\\") {
      current += ch;
      if (i + 1 < statement.length) current += statement[++i];
      continue;
    }
    if (ch === "|") {
      segments.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  segments.push(current);
  return segments;
}

/**
 * Extract the effective command name from the first pipeline segment:
 * strips leading `(`/`!`, `KEY=VALUE` assignments, and wrapper commands
 * (env, command, time, nice, sudo). Returns the basename of the resolved name.
 */
function extractHeadCommand(segment: string): string {
  // Strip quote/escape-aware so tokens split on whitespace; a leading '(' or '!'
  // glued directly onto the command name (e.g. "(grep ...", "!grep ...") must also
  // be stripped, so match on the raw head with an optional '('/'!' prefix.
  const m = segment.trim().match(/^[(!]*\s*/);
  const stripped = m ? segment.trim().slice(m[0].length) : segment.trim();
  let tokens = stripped.split(/\s+/).filter(Boolean);
  while (tokens.length > 0) {
    const t = tokens[0];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
      tokens = tokens.slice(1);
      continue;
    }
    if (WRAPPER_COMMANDS.has(t.replace(/\/.*\//, ""))) {
      tokens = tokens.slice(1);
      continue;
    }
    break;
  }
  if (tokens.length === 0) return "";
  const name = tokens[0];
  return name.slice(name.lastIndexOf("/") + 1);
}

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

/** Token list of a segment (first pipeline segment only), split on whitespace. */
function segmentTokens(segment: string): string[] {
  return segment.trim().split(/\s+/).filter(Boolean);
}

function hasQuietExistenceCheck(tokens: string[]): boolean {
  let quiet = false;
  let recursive = false;
  for (const t of tokens) {
    if (t === "-q" || t === "--quiet" || t.startsWith("--quiet=")) quiet = true;
    if (t === "-r" || t === "-R" || t === "--recursive") recursive = true;
    // combined short flags like -qr, -rq
    if (/^-[a-zA-Z]{2,}$/.test(t) && !t.startsWith("--")) {
      if (t.includes("q")) quiet = true;
      if (t.includes("r") || t.includes("R")) recursive = true;
    }
  }
  return quiet && !recursive;
}

function findExecInvokesSearch(tokens: string[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "-exec" || tokens[i] === "-execdir") {
      // the token(s) after -exec up to \; / + / ; form the command; check first arg
      const cmd = tokens[i + 1];
      if (cmd) {
        const base = cmd.slice(cmd.lastIndexOf("/") + 1);
        if (CONTENT_SEARCH_COMMANDS.has(base)) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Pure detection function
// ---------------------------------------------------------------------------

export function detectBlockedBashSearch(
  command: string,
  activeTools: readonly string[],
): GuardResult {
  const grepToolActive = activeTools.includes("grep");
  const findToolActive = activeTools.includes("find");

  for (const statement of splitStatements(command)) {
    const segments = splitPipelineSegments(statement);
    if (segments.length === 0) continue;
    const head = segments[0];
    const tokens = segmentTokens(head);
    if (tokens.length === 0) continue;
    const cmdName = extractHeadCommand(head);

    // Rule A: content search commands
    if (grepToolActive && CONTENT_SEARCH_COMMANDS.has(cmdName)) {
      if (hasQuietExistenceCheck(tokens)) continue;
      return {
        blocked: true,
        command: cmdName,
        suggestedTool: "grep",
        reason:
          `bash-search-guard: blocked \`${cmdName}\` used as a command/pipeline head for search. ` +
          `Use the Pi \`grep\` tool instead (frecency-ranked, path/exclude constraints). ` +
          `Downstream pipe filtering of non-search commands (e.g. \`git log | grep fix\`) is allowed.`,
      };
    }

    // Rule B: find
    if (findToolActive && FILE_SEARCH_COMMANDS.has(cmdName)) {
      const nonSearchOps = tokens.some((t) => t === "-delete");
      const hasExec = tokens.some((t) => t === "-exec" || t === "-execdir");
      const execSearch = hasExec && findExecInvokesSearch(tokens);
      if (!execSearch && (nonSearchOps || (hasExec && !execSearch))) {
        // destructive/bulk maintenance op with find — allow
        continue;
      }
      return {
        blocked: true,
        command: cmdName,
        suggestedTool: "find",
        reason:
          `bash-search-guard: blocked \`find\` used for file search. ` +
          `Use the Pi \`find\` tool instead (fuzzy/glob path matching with constraints).`,
      };
    }
  }
  return { blocked: false };
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

const BASH_SNIPPET =
  "Execute shell commands (git, build, test, sed; NOT for repo grep/rg/find)";

const GUIDELINE =
  "NEVER use bash to run grep, egrep, fgrep, rg, or find for searching repository files; " +
  "use the grep/find tools instead. Downstream pipe filtering (e.g. git status | grep ...) is allowed.";

export default function bashSearchGuard(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    const selected = event.systemPromptOptions.selectedTools;
    if (!selected.includes("bash")) return;
    if (!selected.includes("grep") && !selected.includes("find")) return;

    event.systemPromptOptions.toolSnippets.bash = BASH_SNIPPET;

    const guidelines = event.systemPromptOptions.promptGuidelines;
    if (!guidelines.includes(GUIDELINE)) {
      guidelines.push(GUIDELINE);
    }
    return undefined as unknown as void;
  });

  pi.on("tool_call", (event) => {
    if (!isToolCallEventType("bash", event)) return undefined as unknown as void;
    const result = detectBlockedBashSearch(event.input.command, pi.getActiveTools());
    if (result.blocked) {
      return { block: true, reason: result.reason };
    }
    return undefined as unknown as void;
  });
}
