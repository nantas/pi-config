/**
 * hc-delegation
 *
 * Role-aware Pi extension that owns every static line of `hc` / `subagent()`
 * delegation guidance that used to live in `AGENTS.md`. At runtime it resolves the
 * current Pi process into one of five roles and then only gives that role the tools
 * and prompt sections it can actually use:
 *
 *   hc_lead      top-level human terminal inside a herdr space — delegates work
 *   hc_worker    terminal started by `hc run <template>` (or any terminal with a parent)
 *   hc_peer      a `peer` template terminal: finds and messages other agents
 *   subagent     a `@johnnywu/pi-subagents` child (PI_SUBAGENT_DEPTH > 0)
 *   standalone   plain `pi`, outside `hc`
 *
 * Behaviours:
 * - Role-scoped active tool sets, re-applied on every `before_agent_start` so
 *   `/reload` or a tool-registry refresh cannot silently re-activate `subagent`
 *   inside a worker.
 * - System prompt content is injected by mutating `event.systemPromptOptions`
 *   (`sections` / `toolSnippets.subagent`) in place and returning `undefined`.
 *   Returning `{ systemPrompt }` would force a full prompt replacement, break
 *   `@johnnywu/pi-subagents` `replace` mode, and invalidate KV prompt caching.
 * - Lead delegation guards: a 2nd distinct direct `edit`/`write` in one turn is
 *   blocked in any file type (code, config, docs, specs, plans), and a direct
 *   test/build/lint run in Lead bash gets a delegation nudge; every 3rd direct
 *   `read`/`grep`/`find` without delegation is nudged, and
 *   `bash` + `hc run <known-template>` is redirected to `hc_worker`.
 * - Anti-recursion: `hc_worker`, `hc_peer` and `subagent` may not run `hc run`.
 * - `hc_worker` (spawn/send/read/status/interrupt/close) and `hc_report`
 *   (done/blocked/peer/list_peers) tools own the lifecycle instead of hand-written
 *   bash. Spawn sets the space/tab labels, takes over a still-default tab name,
 *   refuses duplicate live names, and verifies the launch task was delivered.
 * - Communication is async push-first: a worker pushes `hc_report` when it is done
 *   or blocked, and that push is what starts the Lead's next turn. There is no
 *   `wait` action and Lead `bash` + `hc wait` gets a non-blocking nudge, because
 *   parking the Lead turn blocks the person at the terminal.
 * - A `hc_report` push that lands on a busy or dialog-locked Lead (exit 9/10, or
 *   `blocked` / `status_mismatch` in the output) is reported as undelivered
 *   guidance instead of a retryable error: never retry-spam, never `--force`.
 *
 * Zero dependencies beyond Pi itself and `typebox`.
 *
 * Spec: openspec/changes/hc-delegation-extension/specs/hc-delegation-extension/spec.md
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HcTemplate {
  name: string;
  description: string;
  command: string;
}

export interface AgentSummary {
  name: string;
  description: string;
  scope: "project" | "global";
}

export type RuntimeRole =
  | { kind: "subagent"; depth: number; name: string | null }
  | { kind: "standalone" }
  | {
      kind: "hc_worker";
      terminalId: string;
      parent: string | null;
      template: string | null;
      spaceId: string | null;
    }
  | { kind: "hc_peer"; terminalId: string; spaceId: string | null }
  | {
      kind: "hc_lead";
      terminalId: string;
      spaceId: string | null;
      templates: HcTemplate[];
    };

export type RoleKind = RuntimeRole["kind"];

export interface OwnedWorker {
  address: string;
  name: string;
  template: string | null;
  task: string | null;
  spawnedAt: number;
}

export interface DelegationSessionState {
  tabId: string | null;
  tabName: string | null;
  ownedWorkers: Record<string, OwnedWorker>;
  guardEnabled: boolean;
  roleOverride: "allow_subagents" | null;
}

export interface TurnBudgetState {
  directInspectionCount: number;
  directEditedFiles: Set<string>;
  delegatedThisTurn: boolean;
}

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;

export interface FsIo {
  exists: (path: string) => boolean;
  listDir: (dir: string) => string[];
  readFile: (file: string) => string | null;
}

export interface HcDelegationDeps {
  run?: CommandRunner;
  env?: Record<string, string | undefined>;
  io?: FsIo;
  homeDir?: string;
  now?: () => number;
}

export interface RolePlan {
  /** Tool names this role must have active. */
  addTools: string[];
  /** Tool names this role must not have active. */
  removeTools: string[];
  /** System prompt sections to set; `null` deletes a stale section. */
  sections: Record<string, string | null>;
  /** Replacement `toolSnippets.subagent`, or `null` to leave it alone. */
  subagentSnippet: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATE_CUSTOM_TYPE = "hc-delegation-state";

const SECTION_DELEGATION = "delegation";
const SECTION_WORKER = "hc_worker_role";
const SECTION_PEER = "hc_peer_role";
const MANAGED_SECTIONS = [SECTION_DELEGATION, SECTION_WORKER, SECTION_PEER];

/** Templates shipped by `hc-delegation` in `.pi/herdr-templates/`. */
export const BUILTIN_TEMPLATES = ["grunt", "workhorse", "peer"] as const;

const SUBAGENT_SNIPPET =
  "One-shot delegated investigation (read-only barrier): results return once and the agent then ends; never resumable, never a follow-up worker";

const DIRECT_INSPECTION_TOOLS = new Set(["read", "grep", "find"]);

/** `hc run` flags that consume the following argv token as their value. */
const HC_RUN_VALUE_FLAGS = new Set([
  "--name",
  "--cwd",
  "--on",
  "--label",
  "--parent",
  "--timeout",
]);

const SHELL_WRAPPERS = new Set(["env", "command", "time", "nice", "sudo", "exec", "nohup"]);

function emptySessionState(): DelegationSessionState {
  return {
    tabId: null,
    tabName: null,
    ownedWorkers: {},
    guardEnabled: true,
    roleOverride: null,
  };
}

export function emptyTurnBudget(): TurnBudgetState {
  return {
    directInspectionCount: 0,
    directEditedFiles: new Set<string>(),
    delegatedThisTurn: false,
  };
}

/** Reset the per-turn budget (called at the start of every `before_agent_start`). */
export function resetTurnBudget(state: TurnBudgetState): TurnBudgetState {
  state.directInspectionCount = 0;
  state.directEditedFiles.clear();
  state.delegatedThisTurn = false;
  return state;
}

// ---------------------------------------------------------------------------
// Command splitting (quote/escape aware) — same idioms as bash-search-guard
// ---------------------------------------------------------------------------

/** Split a command string into top-level statements on `;`, `&&`, `||` and newlines. */
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

/** Split one statement into pipeline segments on top-level `|`. */
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
 * Tokens of a pipeline segment with leading `(`/`!`, `KEY=VALUE` assignments and
 * shell wrappers (`env`, `command`, `sudo`, `exec`, ...) stripped, so `tokens[0]`
 * is the effective command name. A flag in that leading window belongs to a
 * wrapper (`sudo -E cargo test`, `nice -n 10 make test`), never to the command.
 */
function headTokens(segment: string): string[] {
  const lead = segment.match(/^[(!]*\s*/);
  const stripped = lead ? segment.slice(lead[0].length) : segment;
  let tokens = stripped.split(/\s+/).filter(Boolean);
  while (tokens.length > 0) {
    const token = tokens[0];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token) || token.startsWith("-")) {
      tokens = tokens.slice(1);
      continue;
    }
    if (SHELL_WRAPPERS.has(token)) {
      tokens = tokens.slice(1);
      continue;
    }
    break;
  }
  return tokens;
}

function basename(token: string): string {
  return token.slice(token.lastIndexOf("/") + 1);
}

/** Strip one layer of matching surrounding quotes. */
function unquote(token: string): string {
  if (token.length >= 2) {
    const first = token[0];
    const last = token[token.length - 1];
    if ((first === '"' || first === "'") && first === last) return token.slice(1, -1);
  }
  return token;
}

/**
 * Every `[commandName, ...argv]` a statement runs through its pipeline, in
 * left-to-right order, so `echo x | hc run grunt` is inspected and not only the
 * pipeline head. Segments with no command are skipped.
 */
function statementCommands(statement: string): Array<{ name: string; argv: string[] }> {
  const commands: Array<{ name: string; argv: string[] }> = [];
  for (const segment of splitPipelineSegments(statement)) {
    const tokens = headTokens(segment);
    if (tokens.length === 0) continue;
    commands.push({ name: basename(tokens[0]), argv: tokens.slice(1) });
  }
  return commands;
}

// ---------------------------------------------------------------------------
// hc run detection
// ---------------------------------------------------------------------------

export interface HcRunMatch {
  /** First positional token after `hc run` (may be empty for a bare shell run). */
  target: string | null;
}

/** Find the first `hc run [flags] <target>` invocation in a bash command. */
export function findHcRun(command: string): HcRunMatch | null {
  for (const statement of splitStatements(command)) {
    for (const parsed of statementCommands(statement)) {
      if (parsed.name !== "hc") continue;
      if (parsed.argv.length === 0) continue;
      if (unquote(parsed.argv[0]) !== "run") continue;

      let target: string | null = null;
      for (let i = 1; i < parsed.argv.length; i++) {
        const token = parsed.argv[i];
        if (token.startsWith("-")) {
          const eq = token.indexOf("=");
          if (eq === -1 && HC_RUN_VALUE_FLAGS.has(token)) i++;
          continue;
        }
        target = unquote(token);
        break;
      }
      return { target };
    }
  }
  return null;
}

/** `hc wait` flags that consume the following argv token as their value. */
const HC_WAIT_VALUE_FLAGS = new Set(["--output", "--timeout", "-o", "-t"]);

/**
 * Find the first `hc wait` invocation in a bash command. Statement and pipeline
 * aware, so `echo "hc wait t3g"` is not a match. Returns a signature such as
 * `hc wait t3g`, or `null`.
 */
export function detectDirectHcWaitCommand(command: string): string | null {
  for (const statement of splitStatements(command)) {
    for (const parsed of statementCommands(statement)) {
      if (parsed.name !== "hc") continue;
      if (parsed.argv.length === 0) continue;
      if (unquote(parsed.argv[0]) !== "wait") continue;

      let target: string | null = null;
      for (let i = 1; i < parsed.argv.length; i++) {
        const token = parsed.argv[i];
        if (token.startsWith("-")) {
          if (!token.includes("=") && HC_WAIT_VALUE_FLAGS.has(token)) i++;
          continue;
        }
        target = unquote(token);
        break;
      }
      return target ? `hc wait ${target}` : "hc wait";
    }
  }
  return null;
}

export interface RawTemplateRunResult {
  blocked: boolean;
  template?: string;
  reason?: string;
}

/**
 * Lead guard: `bash` + `hc run <known-template>` bypasses `hc_worker`, so it is
 * blocked. Plain shell runs (`hc run --bg --rm cargo test`, `hc run --on vps ...`)
 * stay allowed.
 */
export function detectRawHcTemplateRun(
  command: string,
  knownTemplates: readonly string[],
): RawTemplateRunResult {
  const match = findHcRun(command);
  if (!match || match.target === null) return { blocked: false };
  if (!knownTemplates.includes(match.target)) return { blocked: false };
  return {
    blocked: true,
    template: match.target,
    reason:
      `hc-delegation: blocked \`hc run ${match.target}\` started through bash. ` +
      `Raw template runs skip tab placement, ownership tracking, and the first-message check. ` +
      `Use hc_worker({ action: "spawn", name, template: "${match.target}", task }) instead. ` +
      `Plain shell runs (\`hc run --bg --rm cargo test\`) are still allowed.`,
  };
}

export interface AntiRecursionResult {
  blocked: boolean;
  reason?: string;
}

/**
 * Non-lead guard: a worker, peer or subagent must never start another agent, so
 * every `hc run` is blocked. `hc get/ls/send/read/interrupt/kill/rm` stay allowed.
 */
export function detectAntiRecursionHcRun(command: string): AntiRecursionResult {
  const match = findHcRun(command);
  if (!match) return { blocked: false };
  return {
    blocked: true,
    reason:
      "hc-delegation: blocked `hc run` inside a delegated role (anti-recursion). " +
      "Workers, peers and subagents never start agents. " +
      "Finish the assigned scope, then report with hc_report({ action: \"done\" | \"blocked\", summary, report_file }). " +
      "hc get/ls/read/send/interrupt/kill/rm are still allowed.",
  };
}

// ---------------------------------------------------------------------------
// Direct verification-command detection
// ---------------------------------------------------------------------------

/** Script/verb targets that mean "run the verification suite". */
const VERIFICATION_TARGETS = new Set(["test", "build", "lint", "check"]);
const CARGO_VERBS = new Set(["test", "build", "check", "clippy"]);
const GO_VERBS = new Set(["test", "build"]);
const MAKE_TARGETS = new Set(["test", "check", "build"]);
const DIRECT_BINARIES = new Set(["vitest", "jest", "pytest", "tsc", "eslint", "ruff", "mypy"]);

/**
 * Find the first command in a bash line that runs a test/build/lint/verification
 * suite directly. Statement/pipeline aware, so `git diff | xargs echo` and
 * `echo "node --test"` are not matches. Returns a normalized signature (e.g.
 * `npm run lint`) or `null`.
 */
export function detectDirectVerificationCommand(command: string): string | null {
  for (const statement of splitStatements(command)) {
    for (const parsed of statementCommands(statement)) {
      const name = parsed.name;
      const positionals = parsed.argv.map(unquote).filter((token) => !token.startsWith("-"));
      const first = positionals[0] ?? "";
      const second = positionals[1] ?? "";

      // node --test (any position, flags may precede it)
      if (name === "node" && parsed.argv.some((token) => token === "--test" || token.startsWith("--test="))) {
        return "node --test";
      }
      if (DIRECT_BINARIES.has(name)) return name;
      if (name === "npx" && DIRECT_BINARIES.has(first)) return `npx ${first}`;
      if (name === "bun") {
        const target = first === "run" ? second : first;
        if (VERIFICATION_TARGETS.has(target)) {
          return first === "run" ? `bun run ${target}` : `bun ${target}`;
        }
      }
      if (name === "npm" || name === "pnpm" || name === "yarn") {
        if (VERIFICATION_TARGETS.has(first)) return `${name} ${first}`;
        if (first === "run" && VERIFICATION_TARGETS.has(second)) return `${name} run ${second}`;
      }
      if (name === "cargo" && CARGO_VERBS.has(first)) return `cargo ${first}`;
      if (name === "go" && GO_VERBS.has(first)) return `go ${first}`;
      if (name === "make" && MAKE_TARGETS.has(first)) return `make ${first}`;
      if (name === "openspec" && first === "validate") return "openspec validate";
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Role detection
// ---------------------------------------------------------------------------

function parseJson<T>(text: string): T | null {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export interface HcTerminalInfo {
  address?: string;
  parent?: string | null;
  template?: string | null;
  /** `hc` terminal state: `"live"` or a finished state such as `"finished"`. */
  state?: string;
  labels?: Record<string, string>;
}

/**
 * Fail closed: `hc get` succeeds only for a known terminal, so anything that is
 * not explicitly finished still occupies the name.
 */
export function isOccupiedTerminal(info: HcTerminalInfo | null): info is HcTerminalInfo {
  if (!info) return false;
  return info.state !== "finished";
}

/** Best-effort `hc templates --json`; an unavailable core yields an empty list. */
export async function discoverTemplates(run: CommandRunner): Promise<HcTemplate[]> {
  const result = await run("hc", ["templates", "--json"]);
  if (result.code !== 0) return [];
  const parsed = parseJson<{ templates?: unknown }>(result.stdout);
  const raw = parsed?.templates;
  if (!Array.isArray(raw)) return [];
  const templates: HcTemplate[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = nonEmpty(record.name);
    if (!name) continue;
    templates.push({
      name,
      description: nonEmpty(record.description) ?? "",
      command: nonEmpty(record.command) ?? "",
    });
  }
  return templates;
}

/**
 * Resolve the runtime role. Deterministic given `env` and the injectable
 * `CommandRunner`, which is what keeps this testable without a live herdr core.
 */
export async function resolveRuntimeRole(
  env: Record<string, string | undefined>,
  run: CommandRunner,
): Promise<RuntimeRole> {
  const depth = Number(env.PI_SUBAGENT_DEPTH ?? 0);
  if (Number.isFinite(depth) && depth > 0) {
    return { kind: "subagent", depth, name: nonEmpty(env.PI_SUBAGENT_NAME) };
  }

  const terminalId = nonEmpty(env.HC_TERMINAL_ID);
  if (!terminalId) return { kind: "standalone" };

  const result = await run("hc", ["get", terminalId, "--json"]);
  if (result.code !== 0) return { kind: "standalone" };
  const info = parseJson<HcTerminalInfo>(result.stdout);
  if (!info) return { kind: "standalone" };

  const parent = nonEmpty(info.parent);
  const template = nonEmpty(info.template);
  const spaceId = nonEmpty(info.labels?.["herdr.space"]);

  if (parent !== null || (template !== null && template !== "peer")) {
    return { kind: "hc_worker", terminalId, parent, template, spaceId };
  }
  if (template === "peer") return { kind: "hc_peer", terminalId, spaceId };

  return { kind: "hc_lead", terminalId, spaceId, templates: await discoverTemplates(run) };
}

// ---------------------------------------------------------------------------
// Agent summaries (`.pi/agents/*.md` project, `~/.pi/agent/agents/*.md` global)
// ---------------------------------------------------------------------------

function defaultIo(): FsIo {
  return {
    exists: (path) => {
      try {
        return existsSync(path);
      } catch {
        return false;
      }
    },
    listDir: (dir) => {
      try {
        return readdirSync(dir);
      } catch {
        return [];
      }
    },
    readFile: (file) => {
      try {
        return readFileSync(file, "utf8");
      } catch {
        return null;
      }
    },
  };
}

/** Pull `description` out of a YAML frontmatter block; `""` when absent. */
export function readFrontmatterDescription(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return "";
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^description:\s*(.*)$/);
    if (field) return field[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

/**
 * Discover dispatchable agents. A project file overrides a global file of the
 * same name, mirroring Pi's own agent resolution order.
 */
export function discoverAgentSummaries(
  cwd: string,
  io: FsIo = defaultIo(),
  homeDir: string = homedir(),
): AgentSummary[] {
  const sources: Array<{ dir: string; scope: AgentSummary["scope"] }> = [
    { dir: join(homeDir, ".pi", "agent", "agents"), scope: "global" },
    { dir: join(cwd, ".pi", "agents"), scope: "project" },
  ];

  const byName = new Map<string, AgentSummary>();
  for (const source of sources) {
    for (const entry of io.listDir(source.dir)) {
      if (!entry.endsWith(".md")) continue;
      const name = entry.slice(0, -3);
      const content = io.readFile(join(source.dir, entry));
      if (content === null) continue;
      byName.set(name, {
        name,
        description: readFrontmatterDescription(content),
        scope: source.scope,
      });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Role plan: tools, sections, snippets
// ---------------------------------------------------------------------------

function leadSection(role: Extract<RuntimeRole, { kind: "hc_lead" }>, agents: AgentSummary[]): string {
  const lines: string[] = [
    `<${SECTION_DELEGATION}>`,
    `You are the Lead in a herdr space (terminal \`${role.terminalId}\`${
      role.spaceId ? `, space \`${role.spaceId}\`` : ""
    }). You own intent, coordination and acceptance — not execution.`,
    "",
    "Division of labor:",
    "- All multi-file work (>=2 files) belongs to `hc_worker`, in any file type: code, config, docs, and workflow/planning artifacts (specs, plans, ADRs, task lists, OpenSpec changes). A 2nd distinct direct `edit`/`write` in one turn is blocked; editing the same single file again stays allowed.",
    "- Every worker task prompt must require the worker to run the verification commands and report the exact commands, the observed output, or the log paths.",
    "- You align intent, prompt and coordinate workers, then audit their results, diffs and verification evidence. Do not run test/build/lint/verification suites in your own bash; `/hc-guard off` is the escape hatch.",
    "- 3+ direct `read`/`grep`/`find` calls for multi-file fact-checking belong to a worker; you get one reminder every 3 calls while nothing is delegated and no worker is live.",
    "- `subagent()` is a one-shot read-only barrier: the result comes back and the agent ends, so a follow-up edit needs `hc_worker({ action: \"send\" })` or a new spawn.",
    "- Never start workers with `bash` + `hc run <template>` (blocked). Use `hc_worker({ action: \"spawn\" })`: it sets the space/tab labels, tracks ownership, and verifies the first message landed.",
    "",
    "`hc_worker` actions: `spawn` (name, template, task, cwd?), `send`, `read`, `status`, `interrupt`, `close`. Send follow-up edits to the existing worker with `send`.",
    "",
    "Async push-first: dispatch, confirm `first_message.sent`, tell the person in one line that the worker is running, then end your turn. The worker pushes `hc_report` when it is done or blocked and that push starts your next turn. Never park the conversation in `hc wait` — it is not an action here and it freezes the human-facing turn. While the worker runs, keep only non-blocking local work; `hc_worker({ action: \"status\" })` is the cheap liveness check.",
    "After you close an interactive dialog (`ask_user` etc.), run a lightweight `hc_worker({ action: \"status\" })` per live worker (never a bulk `read`) and ping only `idle`/`done` workers asking for any undelivered report; never disturb a `working` worker.",
  ];

  if (role.templates.length > 0) {
    lines.push("", "Available hc templates:");
    for (const template of role.templates) {
      lines.push(`- \`${template.name}\`${template.description ? `: ${template.description}` : ""}`);
    }
  }
  if (agents.length > 0) {
    lines.push("", "Available `subagent()` agents:");
    for (const agent of agents) {
      lines.push(`- \`${agent.name}\` (${agent.scope})${agent.description ? `: ${agent.description}` : ""}`);
    }
  }
  lines.push(`</${SECTION_DELEGATION}>`);
  return lines.join("\n");
}

/** The "do not start agents" bullet must match the override, not a fixed claim. */
function noNestedAgentsLine(allowSubagents: boolean): string {
  if (allowSubagents) {
    return (
      "- `/hc-role allow-subagents` was enabled for this session: `subagent()` is usable and the `hc run` block is lifted. " +
      "Use them only if the assigned scope explicitly needs a nested agent; `hc_worker` stays inactive."
    );
  }
  return (
    "- Do not start agents: `hc_worker` and `subagent` are inactive here and the anti-recursion guard blocks `bash` + `hc run`."
  );
}

function workerSection(
  role: Extract<RuntimeRole, { kind: "hc_worker" }>,
  allowSubagents: boolean,
): string {
  return [
    `<${SECTION_WORKER}>`,
    `You are an hc worker (terminal \`${role.terminalId}\`, parent \`${role.parent ?? "none"}\`, template \`${
      role.template ?? "none"
    }\`${role.spaceId ? `, space \`${role.spaceId}\`` : ""}).`,
    "- Work only inside the assigned scope. Do not widen it, and do not re-decide the goal.",
    noNestedAgentsLine(allowSubagents),
    "- Report with `hc_report({ action: \"done\" | \"blocked\", summary, report_file })`: write the full 4-section report (`Goal / Changes / Verification / Blockers`) to a report file (e.g. `/tmp/hc-report-<name>.md`) or an ignored scratch file, keep it in this terminal, and push ONLY a one-line `summary` plus that `report_file`. Our pushes are async: the Lead reads the file, not a wall of text.",
    "- Verification evidence must come from real runs in this turn — the command, its exit code, the paths. Never delete, skip or weaken a check to turn it green; a pre-existing baseline failure is reported in one line instead of being hidden.",
    "- Stay alive after reporting: follow-up tweaks arrive as messages in this same terminal.",
    `</${SECTION_WORKER}>`,
  ].join("\n");
}

function peerSection(
  role: Extract<RuntimeRole, { kind: "hc_peer" }>,
  allowSubagents: boolean,
): string {
  return [
    `<${SECTION_PEER}>`,
    `You are an hc peer (terminal \`${role.terminalId}\`${role.spaceId ? `, space \`${role.spaceId}\`` : ""}).`,
    "- `hc_report({ action: \"list_peers\" })` lists the other agents in this space; `hc_report({ action: \"peer\", target, summary })` sends them a message prefixed with your terminal id.",
    noNestedAgentsLine(allowSubagents),
    "- Reply with `hc_report({ action: \"peer\", ... })`; do not start a worker to answer.",
    `</${SECTION_PEER}>`,
  ].join("\n");
}

function standaloneSection(): string {
  return [
    `<${SECTION_DELEGATION}>`,
    "Not running under `hc`, so there are no terminals, spaces or workers here.",
    "For multi-file exploration or independent implementation, delegate with `subagent({ agent, task })`.",
    "Subagents are one-shot: the result returns once and the agent ends, so put everything it needs in `task`.",
    `</${SECTION_DELEGATION}>`,
  ].join("\n");
}

/** Compute the role-scoped tool set, prompt sections and snippets for one turn. */
export function buildRolePlan(
  role: RuntimeRole,
  state: DelegationSessionState,
  agents: AgentSummary[] = [],
): RolePlan {
  const allowSubagents = state.roleOverride === "allow_subagents";


  switch (role.kind) {
    case "hc_lead":
      return {
        // `subagent` is deliberately not added: a Lead that turned it off keeps it off.
        // It stays usable whenever it is already active, because nothing here removes it.
        addTools: ["hc_worker"],
        removeTools: ["hc_report"],
        sections: {
          [SECTION_DELEGATION]: leadSection(role, agents),
          [SECTION_WORKER]: null,
          [SECTION_PEER]: null,
        },
        subagentSnippet: SUBAGENT_SNIPPET,
      };
    case "hc_worker":
      return {
        addTools: ["hc_report"],
        removeTools: allowSubagents ? ["hc_worker"] : ["hc_worker", "subagent"],
        sections: {
          [SECTION_WORKER]: workerSection(role, allowSubagents),
          [SECTION_DELEGATION]: null,
          [SECTION_PEER]: null,
        },
        subagentSnippet: null,
      };
    case "hc_peer":
      return {
        addTools: ["hc_report"],
        removeTools: allowSubagents ? ["hc_worker"] : ["hc_worker", "subagent"],
        sections: {
          [SECTION_PEER]: peerSection(role, allowSubagents),
          [SECTION_DELEGATION]: null,
          [SECTION_WORKER]: null,
        },
        subagentSnippet: null,
      };
    case "subagent":
      return {
        addTools: [],
        removeTools: ["hc_worker", "hc_report"],
        sections: {
          [SECTION_DELEGATION]: null,
          [SECTION_WORKER]: null,
          [SECTION_PEER]: null,
        },
        subagentSnippet: null,
      };
    case "standalone":
      return {
        addTools: [],
        removeTools: ["hc_worker", "hc_report"],
        sections: {
          [SECTION_DELEGATION]: standaloneSection(),
          [SECTION_WORKER]: null,
          [SECTION_PEER]: null,
        },
        subagentSnippet: null,
      };
  }
}

/** Apply a role plan to an active tool list, preserving the existing order. */
export function applyToolPlan(active: readonly string[], plan: RolePlan): string[] {
  const next = active.filter((tool) => !plan.removeTools.includes(tool));
  for (const tool of plan.addTools) {
    if (!next.includes(tool)) next.push(tool);
  }
  return next;
}

// ---------------------------------------------------------------------------
// hc_worker: argv builders and herdr tab resolution
// ---------------------------------------------------------------------------

export interface SpawnArgsInput {
  name: string;
  template: string;
  task: string;
  cwd?: string | null;
  spaceId: string | null;
  tabId: string | null;
}

/** `hc run` argv for a spawned worker: space label always, tab label only when known. */
export function buildSpawnArgs(input: SpawnArgsInput): string[] {
  const args = ["run", "--bg", "--json", "--name", input.name];
  if (input.spaceId) args.push("--label", `herdr.space=${input.spaceId}`);
  if (input.tabId) args.push("--label", `herdr.tab=${input.tabId}`);
  if (input.cwd) args.push("--cwd", input.cwd);
  args.push(input.template, input.task);
  return args;
}

export interface HerdrTab {
  tabId: string;
  /** Known tab name, or `null` when `herdr-app ls` could not tell us. */
  tabName: string | null;
}

interface HerdrAppList {
  spaces?: Array<{
    id?: string;
    tabs?: Array<{
      id?: string;
      name?: string;
      terminals?: Array<{ terminal?: string }>;
    }>;
  }>;
}

function appTabs(appListJson: string): HerdrAppList | null {
  return parseJson<HerdrAppList>(appListJson);
}

/** Name of tab `tabId` as reported by `herdr-app ls`, or `null` when unknown. */
export function findTabName(appListJson: string, tabId: string): string | null {
  const parsed = appTabs(appListJson);
  if (!parsed?.spaces) return null;
  for (const space of parsed.spaces) {
    for (const tab of space?.tabs ?? []) {
      if (tab?.id === tabId) return nonEmpty(tab.name) ?? "";
    }
  }
  return null;
}

/**
 * `herdr-app ls` fallback: locate the tab that holds `address` inside `spaceId`.
 * Used only when the terminal's own `herdr.tab` label is unavailable.
 */
export function resolveTabFromAppList(
  appListJson: string,
  spaceId: string,
  address: string,
): HerdrTab | null {
  const parsed = appTabs(appListJson);
  if (!parsed?.spaces) return null;
  for (const space of parsed.spaces) {
    if (space?.id !== spaceId) continue;
    for (const tab of space.tabs ?? []) {
      const holds = (tab.terminals ?? []).some((terminal) => terminal?.terminal === address);
      const tabId = nonEmpty(tab.id);
      if (holds && tabId) {
        return { tabId, tabName: nonEmpty(tab.name) ?? "" };
      }
    }
  }
  return null;
}

/**
 * Only a tab still carrying its default numeric name is safe to rename. A tab the
 * person already named (or one whose name we could not read) is left alone.
 */
export function shouldRenameTab(tabName: string | null): boolean {
  if (tabName === null) return false;
  return /^\d+$/.test(tabName.trim());
}

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const HC_WORKER_ACTIONS = [
  "spawn",
  "send",
  "read",
  "status",
  "interrupt",
  "close",
] as const;

const HC_REPORT_ACTIONS = ["done", "blocked", "peer", "list_peers"] as const;

const hcWorkerParameters = Type.Object(
  {
    action: Type.Union(
      HC_WORKER_ACTIONS.map((action) => Type.Literal(action)),
      {
        description:
          "spawn: start an async worker in this Herdr space/tab; it pushes hc_report back when done or blocked. send/read/status/interrupt/close: operate on a worker this session owns. close: only once its evidence is collected and no stray background process, temporary worktree or scratch file from it is left behind.",
      },
    ),
    name: Type.Optional(
      Type.String({
        description:
          "Worker name: 1-32 of a-z 0-9 - _. Required for spawn; the handle for every other action.",
      }),
    ),
    template: Type.Optional(
      Type.String({
        description: "hc template to launch (e.g. grunt, workhorse, peer). Required for spawn.",
      }),
    ),
    task: Type.Optional(
      Type.String({
        description:
          "The worker's first message. List explicitly: the scope, the boundaries (what not to touch), the verification commands to run, and the required report format plus its report file path. Required for spawn.",
      }),
    ),
    cwd: Type.Optional(
      Type.String({ description: "Working directory for the spawned worker. Defaults to the Lead's cwd." }),
    ),
    text: Type.Optional(
      Type.String({ description: "Message body for send. hc_worker never passes --force." }),
    ),
  },
  { additionalProperties: false },
);

const hcReportParameters = Type.Object(
  {
    action: Type.Union(
      HC_REPORT_ACTIONS.map((action) => Type.Literal(action)),
      {
        description:
          "done: report completion to the parent. blocked: report a blocker to the parent. peer: message another agent in this space. list_peers: list the other agents in this space.",
      },
    ),
    summary: Type.Optional(
      Type.String({
        description:
          "One-line outcome for done/blocked/peer: the verification command and its actual result. Keep the detail in report_file.",
      }),
    ),
    report_file: Type.Optional(
      Type.String({
        description:
          "Path holding the full 4-section report (Goal / Changes / Verification / Blockers), e.g. /tmp/hc-report-<name>.md. Pushed to the recipient as `report: <path>`.",
      }),
    ),
    target: Type.Optional(
      Type.String({ description: "Peer address for action=peer, exactly as hc ls lists it." }),
    ),
  },
  { additionalProperties: false },
);

type HcWorkerParams = {
  action: (typeof HC_WORKER_ACTIONS)[number];
  name?: string;
  template?: string;
  task?: string;
  cwd?: string;
  text?: string;
};

type HcReportParams = {
  action: (typeof HC_REPORT_ACTIONS)[number];
  summary?: string;
  report_file?: string;
  target?: string;
};

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details: Record<string, unknown>;
  isError?: boolean;
};

function textResult(text: string, details: Record<string, unknown> = {}): ToolResult {
  return { content: [{ type: "text", text }], details };
}

function errorResult(text: string, details: Record<string, unknown> = {}): ToolResult {
  return { content: [{ type: "text", text }], details, isError: true };
}

/** `hc send` exit codes that mean "the recipient is busy or in a dialog". */
const UNDELIVERED_SEND_CODES = new Set([9, 10]);

/**
 * A push that cannot land right now is not a failure to retry: `hc send` exits 9
 * or 10, or says `blocked` / `status_mismatch`, while the recipient is working or
 * sitting in a human dialog.
 */
function isUndeliveredReport(sent: CommandResult): boolean {
  if (UNDELIVERED_SEND_CODES.has(sent.code)) return true;
  const combined = `${sent.stderr}\n${sent.stdout}`.toLowerCase();
  return combined.includes("blocked") || combined.includes("status_mismatch");
}

// ---------------------------------------------------------------------------
// Extension factory
// ---------------------------------------------------------------------------

export function createHcDelegationExtension(deps: HcDelegationDeps = {}) {
  return function hcDelegationFactory(pi: ExtensionAPI): void {
    const env = deps.env ?? (process.env as Record<string, string | undefined>);
    const io = deps.io ?? defaultIo();
    const homeDir = deps.homeDir ?? nonEmpty(env.HOME) ?? homedir();
    const now = deps.now ?? (() => Date.now());
    const run: CommandRunner =
      deps.run ??
      (async (command, args) => {
        try {
          const result = await pi.exec(command, args);
          return {
            code: typeof result.code === "number" ? result.code : 1,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
          };
        } catch (err) {
          return {
            code: -1,
            stdout: "",
            stderr: err instanceof Error ? err.message : String(err),
          };
        }
      });

    let sessionState: DelegationSessionState = emptySessionState();
    let turnBudget: TurnBudgetState = emptyTurnBudget();
    let rolePromise: Promise<RuntimeRole> | null = null;

    function ensureRole(): Promise<RuntimeRole> {
      rolePromise ??= resolveRuntimeRole(env, run);
      return rolePromise;
    }

    function persist(): void {
      pi.appendEntry(STATE_CUSTOM_TYPE, {
        tabId: sessionState.tabId,
        tabName: sessionState.tabName,
        ownedWorkers: sessionState.ownedWorkers,
        guardEnabled: sessionState.guardEnabled,
        roleOverride: sessionState.roleOverride,
      });
    }

    function restoreState(entries: readonly unknown[]): void {
      const restored = emptySessionState();
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        if (record.type !== "custom" || record.customType !== STATE_CUSTOM_TYPE) continue;
        const data = record.data as Partial<DelegationSessionState> | undefined;
        if (!data || typeof data !== "object") continue;
        restored.tabId = nonEmpty(data.tabId);
        restored.tabName = nonEmpty(data.tabName);
        restored.guardEnabled = data.guardEnabled !== false;
        restored.roleOverride = data.roleOverride === "allow_subagents" ? "allow_subagents" : null;
        restored.ownedWorkers = {};
        if (data.ownedWorkers && typeof data.ownedWorkers === "object") {
          for (const [name, worker] of Object.entries(data.ownedWorkers)) {
            if (!worker || typeof worker !== "object") continue;
            const record2 = worker as Partial<OwnedWorker>;
            restored.ownedWorkers[name] = {
              address: nonEmpty(record2.address) ?? "",
              name: nonEmpty(record2.name) ?? name,
              template: nonEmpty(record2.template),
              task: nonEmpty(record2.task),
              spawnedAt: typeof record2.spawnedAt === "number" ? record2.spawnedAt : 0,
            };
          }
        }
      }
      sessionState = restored;
    }

    async function terminalInfo(target: string): Promise<HcTerminalInfo | null> {
      const result = await run("hc", ["get", target, "--json"]);
      if (result.code !== 0) return null;
      return parseJson<HcTerminalInfo>(result.stdout);
    }

    /**
     * Resolve the tab holding `address`: its `herdr.tab` label first, `herdr-app ls`
     * matched by terminal address as the fallback. The tab name is read from
     * `herdr-app ls` when available so a rename never clobbers a named tab.
     */
    async function resolveTab(address: string): Promise<HerdrTab | null> {
      const role = await ensureRole();
      const info = await terminalInfo(address);
      const fromLabel = nonEmpty(info?.labels?.["herdr.tab"]);
      const spaceId = "spaceId" in role ? role.spaceId : null;

      let listJson: string | null = null;
      if (spaceId) {
        const listed = await run("herdr-app", ["ls"]);
        if (listed.code === 0) listJson = listed.stdout;
      }

      if (fromLabel) {
        return {
          tabId: fromLabel,
          tabName: listJson ? findTabName(listJson, fromLabel) : null,
        };
      }
      if (!spaceId || !listJson) return null;
      return resolveTabFromAppList(listJson, spaceId, address);
    }

    // -- Lifecycle ----------------------------------------------------------

    pi.on("session_start", async (_event, ctx) => {
      const entries =
        (ctx as { sessionManager?: { getEntries: () => readonly unknown[] } }).sessionManager?.getEntries() ??
        [];
      restoreState(entries);
      turnBudget = emptyTurnBudget();
      rolePromise = null;
      await ensureRole();
    });

    pi.on("before_agent_start", async (event, ctx) => {
      const role = await ensureRole();
      const state = sessionState;

      // A new user turn resets the per-turn delegation budget.
      resetTurnBudget(turnBudget);

      const agents = role.kind === "hc_lead" ? discoverAgentSummaries(ctx.cwd, io, homeDir) : [];
      const plan = buildRolePlan(role, state, agents);

      const active = pi.getActiveTools();
      const desired = applyToolPlan(active, plan);
      const changed = desired.length !== active.length || desired.some((tool, i) => tool !== active[i]);
      if (changed) pi.setActiveTools(desired);

      const options = event.systemPromptOptions;
      const effective = changed ? pi.getActiveTools() : active;
      const selected = options.selectedTools ?? [];
      if (
        selected.length !== effective.length ||
        selected.some((tool, i) => tool !== effective[i])
      ) {
        options.selectedTools = [...effective];
      }

      // Mutate in place: returning { systemPrompt } would force a full prompt
      // replacement and invalidate the cached prefix.
      if (!options.sections) options.sections = {};
      for (const key of MANAGED_SECTIONS) {
        const value = plan.sections[key];
        if (value === null || value === undefined) delete options.sections[key];
        else options.sections[key] = value;
      }
      if (plan.subagentSnippet) {
        if (!options.toolSnippets) options.toolSnippets = {};
        options.toolSnippets.subagent = plan.subagentSnippet;
      }

      return undefined;
    });

    // -- Guards -------------------------------------------------------------

    pi.on("tool_call", async (event, ctx) => {
      const role = await ensureRole();
      const toolName = (event as { toolName?: string }).toolName ?? "";
      const input = ((event as { input?: Record<string, unknown> }).input ?? {}) as Record<
        string,
        unknown
      >;

      if (role.kind === "hc_lead" && sessionState.guardEnabled) {
        if (toolName === "hc_worker" || toolName === "subagent") {
          turnBudget.delegatedThisTurn = true;
          return undefined;
        }

        if (toolName === "edit" || toolName === "write") {
          const rawPath = typeof input.path === "string" ? input.path : "";
          if (!rawPath) return undefined;

          const absolute = resolve(ctx.cwd, rawPath.startsWith("@") ? rawPath.slice(1) : rawPath);
          // Check before adding: a blocked 2nd file must not enter the budget, or the
          // very next edit of the first file would be blocked for no reason.
          // No path is exempt, and delegation earlier in the turn does not buy the
          // Lead a second file: multi-file work belongs to a worker either way.
          if (!turnBudget.directEditedFiles.has(absolute) && turnBudget.directEditedFiles.size >= 1) {
            return {
              block: true,
              reason:
                `hc-delegation: blocked direct \`${toolName}\` on a 2nd distinct file ` +
                `(${[...turnBudget.directEditedFiles, absolute].join(", ")}). ` +
                `Any multi-file change — code, config, docs, specs, plans — belongs to a worker. ` +
                `Use hc_worker({ action: "spawn", name, template, task }) to start one, or ` +
                `hc_worker({ action: "send", name, text }) to hand follow-up edits to the worker that ` +
                `already owns the change. Editing the same single file again stays allowed; ` +
                `\`/hc-guard off\` relaxes this for the session.`,
            };
          }
          turnBudget.directEditedFiles.add(absolute);
          return undefined;
        }

        if (toolName === "bash" && typeof input.command === "string") {
          const known = new Set<string>([
            ...BUILTIN_TEMPLATES,
            ...role.templates.map((template) => template.name),
          ]);
          const detected = detectRawHcTemplateRun(input.command, [...known]);
          if (detected.blocked) return { block: true, reason: detected.reason };
          return undefined;
        }

        return undefined;
      }

      const isDelegatedRole =
        role.kind === "hc_worker" || role.kind === "hc_peer" || role.kind === "subagent";
      if (isDelegatedRole && sessionState.roleOverride !== "allow_subagents") {
        if (toolName === "bash" && typeof input.command === "string") {
          const detected = detectAntiRecursionHcRun(input.command);
          if (detected.blocked) return { block: true, reason: detected.reason };
        }
      }
      return undefined;
    });

    pi.on("tool_result", async (event) => {
      const role = await ensureRole();
      if (role.kind !== "hc_lead" || !sessionState.guardEnabled) return undefined;
      const toolName = (event as { toolName?: string }).toolName ?? "";
      const eventContent = (event as { content?: unknown }).content;
      const parts: Array<{ type: string; text?: string }> = Array.isArray(eventContent)
        ? (eventContent as Array<{ type: string; text?: string }>)
        : [];

      // Verification execution belongs to the worker, and parking this turn in
      // `hc wait` defeats async push-first: nudge, never block.
      if (toolName === "bash") {
        const command = ((event as { input?: { command?: unknown } }).input?.command ?? "") as string;
        const nudges: string[] = [];

        const verification = typeof command === "string" ? detectDirectVerificationCommand(command) : null;
        if (verification) {
          nudges.push(
            `[hc-delegation] \`${verification}\` is verification execution, which belongs to the worker. ` +
              `Require it in each worker task (exact commands, observed output, or log paths), then audit that ` +
              `evidence here instead of re-running the suite in Lead bash.`,
          );
        }

        const hcWait = typeof command === "string" ? detectDirectHcWaitCommand(command) : null;
        if (hcWait) {
          nudges.push(
            `[hc-delegation] \`${hcWait}\` blocks this human-facing Lead turn, and delegation is async push-first: ` +
              `the worker pushes \`hc_report\` when it is done or blocked, and that push starts your next turn. ` +
              `End the turn and rely on the reactive push; use the non-blocking ` +
              `\`hc_worker({ action: "status" })\` for a liveness check instead of waiting.`,
          );
        }

        if (nudges.length === 0) return undefined;
        return { content: [...parts, ...nudges.map((text) => ({ type: "text" as const, text }))] };
      }

      if (!DIRECT_INSPECTION_TOOLS.has(toolName)) return undefined;
      if (turnBudget.delegatedThisTurn) return undefined;
      if (Object.keys(sessionState.ownedWorkers).length > 0) return undefined;

      turnBudget.directInspectionCount += 1;
      if (turnBudget.directInspectionCount % 3 !== 0) return undefined;

      const reminder =
        `[hc-delegation] ${turnBudget.directInspectionCount} direct \`${toolName}\`-class inspections this turn ` +
        `with no delegation. Hand the remaining multi-file fact-checking to ` +
        `hc_worker({ action: "spawn", name, template, task }) or subagent({ agent, task }); ` +
        `keep only the acceptance checks that need your own eyes here.`;

      return { content: [...parts, { type: "text", text: reminder }] };
    });

    // -- hc_worker ----------------------------------------------------------

    pi.registerTool({
      name: "hc_worker",
      label: "hc worker",
      description:
        "Manage hc workers in this Herdr space: spawn, send, read, status, interrupt, close. " +
        "Spawn places every worker of this session into one shared tab with the space and tab labels set, " +
        "takes over a tab that still has its default numeric name, and verifies the launch task was actually delivered. " +
        "Workers run asynchronously and push hc_report back when done or blocked; there is no wait action.",
      promptSnippet:
        "Start or manage an async hc worker terminal (spawn/send/read/status/interrupt/close)",
      promptGuidelines: [
        "Use hc_worker({ action: \"spawn\" }) instead of bash + `hc run <template>`: it sets the space/tab labels, tracks ownership, and verifies first_message delivery.",
        "After spawn the worker is asynchronous: tell the person it is running and end the turn; never park the turn in `hc wait`. Its hc_report push starts your next turn.",
        "Use hc_worker({ action: \"close\" }) only for workers this session started, after its evidence is collected and no stray background process, temporary worktree or scratch file from it is left behind.",
      ],
      parameters: hcWorkerParameters,
      defaultActive: false,
      async execute(_toolCallId, rawParams, signal): Promise<ToolResult> {
        const params = rawParams as HcWorkerParams;
        const role = await ensureRole();

        if (role.kind !== "hc_lead") {
          return errorResult(
            "hc_worker is only available to an hc Lead (a top-level terminal inside a Herdr space). " +
              `Current role: ${role.kind}. Report with hc_report instead.`,
          );
        }

        const name = nonEmpty(params.name);
        if (!name) return errorResult("hc_worker requires `name`.");

        if (params.action === "spawn") {
          const template = nonEmpty(params.template);
          const task = nonEmpty(params.task);
          if (!template) return errorResult("hc_worker spawn requires `template`.");
          if (!task) return errorResult("hc_worker spawn requires `task` (the worker's first message).");

          const existing = await terminalInfo(name);
          if (isOccupiedTerminal(existing)) {
            return errorResult(
              `A terminal named \`${name}\` already exists (address ${existing.address ?? name}, state ${
                existing.state ?? "unknown"
              }). ` +
                `Pick another name or use hc_worker({ action: "close", name: "${name}" }) first.`,
              { name, address: existing.address ?? null, state: existing.state ?? null },
            );
          }

          const cwd = nonEmpty(params.cwd);

          // A tab the person closed must not be resurrected: drop the stale label
          // so Herdr opens a fresh tab. `herdr-app ls` failing keeps the old
          // conservative behaviour of reusing the recorded label.
          if (role.spaceId && sessionState.tabId) {
            const listed = await run("herdr-app", ["ls"]);
            if (listed.code === 0 && findTabName(listed.stdout, sessionState.tabId) === null) {
              sessionState.tabId = null;
              sessionState.tabName = null;
            }
          }

          const args = buildSpawnArgs({
            name,
            template,
            task,
            cwd,
            spaceId: role.spaceId,
            tabId: sessionState.tabId,
          });

          const spawned = await run("hc", args);
          if (spawned.code !== 0) {
            return errorResult(
              `hc run failed (exit ${spawned.code}): ${spawned.stderr.trim() || spawned.stdout.trim()}`,
              { args },
            );
          }

          const info = parseJson<{
            address?: string;
            first_message?: { sent?: boolean; reason?: string | null; turn?: number | null };
            labels?: Record<string, string>;
          }>(spawned.stdout);
          const address = nonEmpty(info?.address);
          if (!address) {
            return errorResult(`hc run returned no terminal address: ${spawned.stdout.trim()}`, {
              args,
            });
          }

          const warnings: string[] = [];

          if (!sessionState.tabId) {
            const tab = await resolveTab(address);
            if (tab) {
              sessionState.tabId = tab.tabId;
              sessionState.tabName = tab.tabName;
              if (shouldRenameTab(tab.tabName)) {
                const renamed = await run("herdr-app", [
                  "do",
                  "tab.rename",
                  "--id",
                  tab.tabId,
                  "--name",
                  name,
                ]);
                if (renamed.code === 0) sessionState.tabName = name;
                else warnings.push("tab.rename failed; the tab keeps its current name");
              }
            } else {
              warnings.push(
                "could not resolve the worker's Herdr tab; later spawns will attach `herdr.space` only",
              );
            }
          }

          const firstMessage = info?.first_message;
          if (firstMessage && firstMessage.sent === false) {
            warnings.push(
              `the launch task was NOT delivered to the worker (reason: ${
                firstMessage.reason ?? "unknown"
              }). Send it again with hc_worker({ action: "send", name: "${name}", text: <task> }).`,
            );
          }

          sessionState.ownedWorkers[name] = {
            address,
            name,
            template,
            task,
            spawnedAt: now(),
          };
          persist();

          const lines = [
            `spawned \`${name}\` → ${address} (template \`${template}\`)${
              sessionState.tabId ? ` in tab \`${sessionState.tabId}\`` : ""
            }`,
            `the worker runs asynchronously: it pushes \`hc_report\` when it is done or blocked, and that push starts your next turn. ` +
              `Do not wait. Tell the person in one line that it is running, then end your turn (or keep only non-blocking local work); ` +
              `\`hc_worker({ action: "status", name: "${name}" })\` is the cheap liveness check.`,
          ];
          for (const warning of warnings) lines.push(`warning: ${warning}`);
          return textResult(lines.join("\n"), {
            name,
            address,
            template,
            tabId: sessionState.tabId,
            firstMessageSent: firstMessage?.sent ?? null,
            warnings,
          });
        }

        if (params.action === "close") {
          const owned = sessionState.ownedWorkers[name];
          let owner: string | null = null;
          if (!owned) {
            const info = await terminalInfo(name);
            owner = nonEmpty(info?.parent);
            if (owner !== role.terminalId) {
              return errorResult(
                `Refusing to close \`${name}\`: this session does not own it and its parent is \`${
                  owner ?? "none"
                }\`, not \`${role.terminalId}\`. Only the terminal that started a worker may close it.`,
                { name, owner },
              );
            }
          }

          const killed = await run("hc", ["kill", name]);
          const removed = await run("hc", ["rm", name]);
          delete sessionState.ownedWorkers[name];
          persist();

          const warnings: string[] = [];
          if (killed.code !== 0) warnings.push(`hc kill failed: ${killed.stderr.trim()}`);
          if (removed.code !== 0) warnings.push(`hc rm failed: ${removed.stderr.trim()}`);
          const lines = [`closed \`${name}\``];
          for (const warning of warnings) lines.push(`warning: ${warning}`);
          return textResult(lines.join("\n"), { name, owned: Boolean(owned), warnings });
        }

        if (params.action === "send") {
          const text = nonEmpty(params.text);
          if (!text) return errorResult("hc_worker send requires `text`.");
          // Never --force: sending into a blocked dialog would answer it for the worker.
          const sent = await run("hc", ["send", name, text]);
          if (sent.code !== 0) {
            return errorResult(`hc send failed: ${sent.stderr.trim() || sent.stdout.trim()}`);
          }
          return textResult(`sent to \`${name}\``, { name });
        }

        if (params.action === "read") {
          const read = await run("hc", ["read", name]);
          if (read.code !== 0) {
            return errorResult(`hc read failed: ${read.stderr.trim() || read.stdout.trim()}`, { name });
          }
          return textResult(read.stdout, { name });
        }

        if (params.action === "status") {
          const info = await terminalInfo(name);
          if (!info) return errorResult(`no terminal named \`${name}\``, { name });
          return textResult(JSON.stringify(info), { name, info });
        }

        if (params.action !== "interrupt") {
          return errorResult(`Unknown hc_worker action: ${String(params.action)}`, {
            action: params.action,
          });
        }
        if (signal?.aborted) return errorResult("Cancelled.", { name });

        const interrupted = await run("hc", ["interrupt", name]);
        if (interrupted.code !== 0) {
          return errorResult(
            `hc interrupt failed: ${interrupted.stderr.trim() || interrupted.stdout.trim()}`,
            { name },
          );
        }
        return textResult(interrupted.stdout.trim() || `interrupted \`${name}\``, { name });
      },
    });

    // -- hc_report ---------------------------------------------------------

    pi.registerTool({
      name: "hc_report",
      label: "hc report",
      description:
        "Report to the parent terminal (done/blocked) or message another agent in this Herdr space (peer/list_peers). " +
        "Pushes are one line plus a report file path; the full Goal / Changes / Verification / Blockers report lives in that file. " +
        "Messages are formatted and sent with hc; --force is never used.",
      promptSnippet: "Report done/blocked to the parent terminal, or message a peer in this space",
      promptGuidelines: [
        "Use hc_report({ action: \"done\", summary, report_file }) when a delegated scope is finished: `summary` is one line with the verification command and its result, `report_file` holds the full Goal / Changes / Verification / Blockers report.",
        "Use hc_report({ action: \"blocked\", summary, report_file }) when a delegated scope cannot proceed; say what you need and what you already tried.",
        "If hc_report says the push is undelivered, do not retry-spam it and never use --force: keep the report file and wait for the Lead to ping you after its dialog closes.",
      ],
      parameters: hcReportParameters,
      defaultActive: false,
      async execute(_toolCallId, rawParams): Promise<ToolResult> {
        const params = rawParams as HcReportParams;
        const role = await ensureRole();

        if (role.kind === "subagent" || role.kind === "standalone") {
          return errorResult(
            `hc_report is not available in role \`${role.kind}\`: there is no herdr terminal to report to.`,
          );
        }

        const summary = nonEmpty(params.summary);
        const reportFile = nonEmpty(params.report_file);
        // `report: <path>` keeps the pushed line one line while the file holds the detail.
        const withReport = (message: string): string =>
          reportFile ? `${message} report: ${reportFile}` : message;
        const lengthNote =
          summary && summary.length > 300
            ? `note: this pushed summary is ${summary.length} chars. Keep pushed summaries one line and move the detail into report_file (Goal / Changes / Verification / Blockers).`
            : null;

        if (params.action === "done" || params.action === "blocked") {
          if (!summary) return errorResult(`hc_report ${params.action} requires \`summary\`.`);
          let parent = role.kind === "hc_worker" ? role.parent : null;
          if (!parent) {
            const info = await terminalInfo(role.terminalId);
            parent = nonEmpty(info?.parent);
          }
          if (!parent) {
            return errorResult(
              `No parent terminal found for \`${role.terminalId}\`; nothing to report to.`,
            );
          }
          const message = withReport(`${params.action}: ${summary}`);
          const sent = await run("hc", ["send", parent, message]);
          if (isUndeliveredReport(sent)) {
            // Not an error and not retryable: the Lead is busy or in a human dialog.
            return textResult(
              [
                `status: undelivered (lead_blocked) — hc send to \`${parent}\` did not land (exit ${sent.code}).`,
                "The Lead is busy or in a human dialog. Do NOT retry-spam this report and NEVER use --force.",
                `The full report stays in ${reportFile ?? "this terminal's visible output"} and is remembered as undelivered.`,
                "Wait silently: the Lead pings you after it closes its dialog.",
              ].join("\n"),
              {
                parent,
                message,
                status: "undelivered (lead_blocked)",
                code: sent.code,
                reportFile,
                undelivered: true,
              },
            );
          }
          if (sent.code !== 0) {
            return errorResult(
              `hc send to parent \`${parent}\` failed: ${sent.stderr.trim() || sent.stdout.trim()}`,
              { parent },
            );
          }
          const reported = `reported ${params.action} to \`${parent}\``;
          return textResult(lengthNote ? `${reported}\n${lengthNote}` : reported, {
            parent,
            message,
            reportFile,
          });
        }

        if (params.action === "list_peers") {
          const spaceId = "spaceId" in role ? role.spaceId : null;
          if (!spaceId) {
            return errorResult(
              "No `herdr.space` label on this terminal, so peers cannot be listed.",
            );
          }
          const listed = await run("hc", ["ls", "--label", `herdr.space=${spaceId}`, "--json"]);
          if (listed.code !== 0) {
            return errorResult(`hc ls failed: ${listed.stderr.trim() || listed.stdout.trim()}`);
          }
          const parsed = parseJson<{
            terminals?: Array<{ address?: string; name?: string; template?: string; state?: string }>;
          }>(listed.stdout);
          const peers = (parsed?.terminals ?? []).filter(
            (terminal) => nonEmpty(terminal?.address) && terminal.address !== role.terminalId,
          );
          if (peers.length === 0) return textResult("no peers in this space", { spaceId, peers: [] });
          const lines = peers.map(
            (peer) =>
              `- ${peer.address}${peer.name ? ` (${peer.name})` : ""}${
                peer.template ? ` [${peer.template}]` : ""
              }${peer.state ? ` ${peer.state}` : ""}`,
          );
          return textResult(`peers in \`${spaceId}\`:\n${lines.join("\n")}`, {
            spaceId,
            peers,
          });
        }

        // peer
        const target = nonEmpty(params.target);
        if (!target) return errorResult("hc_report peer requires `target` (a peer address).");
        if (!summary) return errorResult("hc_report peer requires `summary`.");
        const message = withReport(`peer: ${role.terminalId} ${summary}`);
        const sent = await run("hc", ["send", target, message]);
        if (sent.code !== 0) {
          return errorResult(
            `hc send to \`${target}\` failed: ${sent.stderr.trim() || sent.stdout.trim()}`,
            { target },
          );
        }
        const sentLine = `sent peer message to \`${target}\``;
        return textResult(lengthNote ? `${sentLine}\n${lengthNote}` : sentLine, {
          target,
          message,
          reportFile,
        });
      },
    });

    // -- Commands ----------------------------------------------------------

    pi.registerCommand("hc-guard", {
      description: "Lead delegation guard: /hc-guard [on|off|status]",
      handler: async (args, ctx) => {
        const role = await ensureRole();
        const action = (args ?? "").trim().toLowerCase();
        const notify = (message: string): void => {
          const ui = (ctx as { ui?: { notify: (text: string, level?: string) => void } }).ui;
          ui?.notify(message, "info");
        };

        if (action === "on") {
          sessionState.guardEnabled = true;
          persist();
          notify("hc-guard: on — Lead edit/inspection/template/verification guards are enforced");
          return;
        }
        if (action === "off") {
          sessionState.guardEnabled = false;
          persist();
          notify("hc-guard: off — Lead guard enforcement disabled for this session");
          return;
        }
        if (role.kind !== "hc_lead") {
          notify(`hc-guard: role ${role.kind} has no Lead guards to enforce`);
          return;
        }
        notify(
          `hc-guard: ${sessionState.guardEnabled ? "on" : "off"} — ` +
            `${turnBudget.directEditedFiles.size} direct edit(s), ` +
            `${turnBudget.directInspectionCount} inspection(s), ` +
            `delegatedThisTurn=${turnBudget.delegatedThisTurn}`,
        );
      },
    });

    pi.registerCommand("hc-role", {
      description: "Runtime role controls: /hc-role [status|allow-subagents|reset]",
      handler: async (args, ctx) => {
        const role = await ensureRole();
        const action = (args ?? "").trim().toLowerCase();
        const notify = (message: string): void => {
          const ui = (ctx as { ui?: { notify: (text: string, level?: string) => void } }).ui;
          ui?.notify(message, "info");
        };

        if (action === "allow-subagents") {
          sessionState.roleOverride = "allow_subagents";
          persist();
          notify(
            "hc-role: allow_subagents — `subagent` stays active and the anti-recursion `hc run` block is disabled for this session",
          );
          return;
        }
        if (action === "reset") {
          sessionState.roleOverride = null;
          persist();
          notify("hc-role: reset — role defaults restored");
          return;
        }

        const detail =
          role.kind === "hc_worker"
            ? `terminal=${role.terminalId} parent=${role.parent ?? "none"} template=${
                role.template ?? "none"
              } space=${role.spaceId ?? "none"}`
            : role.kind === "hc_peer" || role.kind === "hc_lead"
              ? `terminal=${role.terminalId} space=${role.spaceId ?? "none"}`
              : role.kind === "subagent"
                ? `depth=${role.depth} name=${role.name ?? "none"}`
                : "no herdr terminal";
        notify(
          `hc-role: ${role.kind} (${detail}) override=${sessionState.roleOverride ?? "none"} ` +
            `workers=${Object.keys(sessionState.ownedWorkers).length} tab=${sessionState.tabId ?? "none"}`,
        );
      },
    });
  };
}

const GLOBAL_DEDUP_KEY = "__pi_ext_hc_delegation_loaded";

const defaultExtension = createHcDelegationExtension();

/**
 * Default export used by Pi's extension loader.
 *
 * Deduplicates across project-local (`.pi/extensions/`) and global
 * (`~/.pi/agent/extensions/`) auto-discovery in the same load cycle, and clears
 * the flag on `session_shutdown` so `/reload`, `/new`, `/resume`, and `/fork`
 * re-register cleanly (see docs/reference/pi-extension-session-shutdown-dedup.md).
 */
export default function hcDelegation(pi: ExtensionAPI): void {
  const store = globalThis as Record<string, unknown>;
  if (store[GLOBAL_DEDUP_KEY]) return;
  store[GLOBAL_DEDUP_KEY] = true;

  pi.on("session_shutdown", () => {
    delete store[GLOBAL_DEDUP_KEY];
  });

  defaultExtension(pi);
}
