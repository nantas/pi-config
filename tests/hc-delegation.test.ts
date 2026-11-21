/**
 * hc-delegation tests
 *
 * Run with zero dependencies on a clean checkout:
 *   node --test tests/hc-delegation.test.ts
 *
 * The extension imports `Type` from "typebox" (a Pi runtime dependency) and types
 * from "@earendil-works/pi-coding-agent" (erased at runtime). A `registerHooks`
 * resolver below redirects both specifiers to in-memory stubs, then the extension
 * module is imported dynamically so the stubs are in place first.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// In-memory stubs
// ---------------------------------------------------------------------------

const typeboxStub = `
const literal = (value) => ({
  const: value,
  type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string",
});

export const Type = {
  String: (options = {}) => ({ ...options, type: "string" }),
  Integer: (options = {}) => ({ ...options, type: "integer" }),
  Boolean: (options = {}) => ({ ...options, type: "boolean" }),
  Literal: literal,
  Optional: (schema) => ({ ...schema, __optional: true }),
  Union: (items, options = {}) => ({ ...options, anyOf: items }),
  Object: (properties, options = {}) => {
    const out = {};
    const required = [];
    for (const [key, schema] of Object.entries(properties)) {
      const { __optional, ...rest } = schema;
      out[key] = rest;
      if (!__optional) required.push(key);
    }
    return { ...options, type: "object", properties: out, required };
  },
};
`;

const piStub = `
export function isToolCallEventType(toolName, event) {
  return event && event.type === "tool_call" && event.toolName === toolName;
}
`;

const typeboxUrl = "data:text/javascript;base64," + Buffer.from(typeboxStub).toString("base64");
const piUrl = "data:text/javascript;base64," + Buffer.from(piStub).toString("base64");

registerHooks({
  resolve(specifier, _context, nextResolve) {
    if (specifier === "typebox") return { url: typeboxUrl, shortCircuit: true };
    if (specifier === "@earendil-works/pi-coding-agent") {
      return { url: piUrl, shortCircuit: true };
    }
    return nextResolve(specifier);
  },
});

// ---------------------------------------------------------------------------
// Load the extension module (dynamic so the hooks above are registered first)
// ---------------------------------------------------------------------------

const extensionUrl = pathToFileURL(
  new URL("../.pi/extensions/hc-delegation.ts", import.meta.url).pathname,
).href;

type CommandResult = { code: number; stdout: string; stderr: string };
type FsIo = {
  exists: (path: string) => boolean;
  listDir: (dir: string) => string[];
  readFile: (file: string) => string | null;
};
type RolePlan = {
  addTools: string[];
  removeTools: string[];
  sections: Record<string, string | null>;
  subagentSnippet: string | null;
};
type RuntimeRole = Record<string, any> & { kind: string };

type ExtensionModule = {
  default: (pi: any) => void;
  createHcDelegationExtension: (deps?: any) => (pi: any) => void;
  emptyTurnBudget: () => any;
  resetTurnBudget: (state: any) => any;
  resolveRuntimeRole: (
    env: Record<string, string | undefined>,
    run: (command: string, args: string[]) => Promise<CommandResult>,
  ) => Promise<RuntimeRole>;
  discoverTemplates: (
    run: (command: string, args: string[]) => Promise<CommandResult>,
  ) => Promise<Array<{ name: string; description: string; command: string }>>;
  discoverAgentSummaries: (
    cwd: string,
    io?: FsIo,
    homeDir?: string,
  ) => Array<{ name: string; description: string; scope: string }>;
  readFrontmatterDescription: (content: string) => string;
  buildRolePlan: (
    role: RuntimeRole,
    state: any,
    agents?: Array<{ name: string; description: string; scope: string }>,
  ) => RolePlan;
  applyToolPlan: (active: readonly string[], plan: RolePlan) => string[];
  detectDirectVerificationCommand: (command: string) => string | null;
  detectRawHcTemplateRun: (
    command: string,
    knownTemplates: readonly string[],
  ) => { blocked: boolean; template?: string; reason?: string };
  detectAntiRecursionHcRun: (command: string) => { blocked: boolean; reason?: string };
  findHcRun: (command: string) => { target: string | null } | null;
  buildSpawnArgs: (input: any) => string[];
  resolveTabFromAppList: (
    appListJson: string,
    spaceId: string,
    address: string,
  ) => { tabId: string; tabName: string | null } | null;
  findTabName: (appListJson: string, tabId: string) => string | null;
  shouldRenameTab: (tabName: string | null) => boolean;
};

let modPromise: Promise<ExtensionModule> | null = null;
function loadModule(): Promise<ExtensionModule> {
  modPromise ??= import(extensionUrl) as Promise<ExtensionModule>;
  return modPromise;
}

// ---------------------------------------------------------------------------
// Command result helpers
// ---------------------------------------------------------------------------

const ok = (value: unknown): CommandResult => ({
  code: 0,
  stdout: typeof value === "string" ? value : JSON.stringify(value),
  stderr: "",
});
const fail = (stderr = "boom"): CommandResult => ({ code: 1, stdout: "", stderr });

type ExecFn = (
  command: string,
  args: string[],
) => CommandResult | undefined | Promise<CommandResult | undefined>;

const BASE_TOOLS = ["bash", "read", "edit", "write", "grep", "find", "ls"];

interface HarnessOptions {
  env?: Record<string, string | undefined>;
  activeTools?: string[];
  exec?: ExecFn;
  io?: FsIo;
  homeDir?: string;
  now?: () => number;
  entries?: unknown[];
  cwd?: string;
}

interface Harness {
  pi: any;
  hooks: Record<string, Array<(event: any, ctx?: any) => any>>;
  tools: Record<string, any>;
  commands: Record<string, any>;
  entries: unknown[];
  execCalls: Array<{ command: string; args: string[] }>;
  setActiveCalls: string[][];
  notices: string[];
  activeTools: () => string[];
  setActiveNow: (names: string[]) => void;
  ctx: any;
  fire: (event: string, payload: any) => Promise<any>;
  callTool: (name: string, params: any) => Promise<any>;
  callCommand: (name: string, args?: string) => Promise<void>;
}

async function harness(options: HarnessOptions = {}): Promise<Harness> {
  const mod = await loadModule();
  const hooks: Record<string, Array<(event: any, ctx?: any) => any>> = {};
  const tools: Record<string, any> = {};
  const commands: Record<string, any> = {};
  const entries: unknown[] = options.entries ? [...options.entries] : [];
  const execCalls: Array<{ command: string; args: string[] }> = [];
  const setActiveCalls: string[][] = [];
  const notices: string[] = [];
  let active = [...(options.activeTools ?? BASE_TOOLS)];

  const pi = {
    on(event: string, handler: (event: any, ctx?: any) => any) {
      (hooks[event] ??= []).push(handler);
      return () => {};
    },
    registerTool(definition: any) {
      tools[definition.name] = definition;
    },
    registerCommand(name: string, definition: any) {
      commands[name] = definition;
    },
    appendEntry(customType: string, data?: unknown) {
      entries.push({ type: "custom", customType, data });
    },
    async exec(command: string, args: string[]) {
      execCalls.push({ command, args: [...args] });
      const result = options.exec ? await options.exec(command, args) : undefined;
      return result ?? ok("");
    },
    getActiveTools: () => [...active],
    setActiveTools(names: string[]) {
      setActiveCalls.push([...names]);
      active = [...names];
    },
  };

  mod.createHcDelegationExtension({
    env: options.env ?? {},
    io: options.io,
    homeDir: options.homeDir ?? "/home/tester",
    now: options.now ?? (() => 1000),
  })(pi as any);

  const ctx = {
    cwd: options.cwd ?? "/repo",
    sessionManager: { getEntries: () => entries },
    ui: { notify: (message: string) => notices.push(message) },
  };

  async function fire(event: string, payload: any) {
    let result: any;
    for (const handler of hooks[event] ?? []) {
      const value = await handler(payload, ctx);
      if (value !== undefined) result = value;
    }
    return result;
  }

  return {
    pi,
    hooks,
    tools,
    commands,
    entries,
    execCalls,
    setActiveCalls,
    notices,
    activeTools: () => [...active],
    setActiveNow: (names: string[]) => {
      active = [...names];
    },
    ctx,
    fire,
    callTool: (name: string, params: any) => tools[name].execute("call-1", params, undefined),
    callCommand: async (name: string, args = "") => {
      await commands[name].handler(args, ctx);
    },
  };
}

function promptOptions(overrides: Record<string, unknown> = {}) {
  return {
    selectedTools: [...BASE_TOOLS],
    toolSnippets: {} as Record<string, string>,
    toolGuidelines: {} as Record<string, string[]>,
    promptGuidelines: [] as string[],
    sections: {} as Record<string, string>,
    cwd: "/repo",
    ...overrides,
  };
}

function beforeStartEvent(overrides: Record<string, unknown> = {}) {
  return { type: "before_agent_start", messageType: "user", prompt: "go", systemPromptOptions: promptOptions(overrides) };
}

const SPACE = "spc123";
const TAB = "tab456";

const leadTerminal = (overrides: Record<string, unknown> = {}) => ({
  address: "t18",
  parent: null,
  template: null,
  state: "live",
  labels: { "herdr.space": SPACE, "herdr.tab": TAB },
  ...overrides,
});

const templatesPayload = {
  templates: [
    { name: "grunt", description: "routine implementation", command: "pi" },
    { name: "workhorse", description: "complex implementation", command: "pi" },
    { name: "peer", description: "reach other agents", command: "pi" },
  ],
};

const appListPayload = (tabName: string, terminalAddresses: string[]) => ({
  spaces: [
    {
      id: SPACE,
      name: "repo",
      tabs: [
        {
          id: TAB,
          name: tabName,
          terminals: terminalAddresses.map((terminal) => ({ terminal })),
        },
      ],
    },
  ],
});

/** Default lead-role exec routes. */
function leadExec(extra?: ExecFn): ExecFn {
  return async (command, args) => {
    const fromExtra = extra ? await extra(command, args) : undefined;
    if (fromExtra) return fromExtra;
    if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
    if (command === "hc" && args[0] === "templates") return ok(templatesPayload);
    return ok("");
  };
}

function fakeIo(files: Record<string, string>): FsIo {
  return {
    exists: (path) => path in files,
    listDir: (dir) => {
      const names = new Set<string>();
      for (const path of Object.keys(files)) {
        if (!path.startsWith(`${dir}/`)) continue;
        const rest = path.slice(dir.length + 1);
        if (!rest.includes("/")) names.add(rest);
      }
      return [...names];
    },
    readFile: (file) => files[file] ?? null,
  };
}

// ===========================================================================
// resolveRuntimeRole
// ===========================================================================

test("resolveRuntimeRole: subagent depth skips hc entirely", async () => {
  const mod = await loadModule();
  const calls: string[][] = [];
  const role = await mod.resolveRuntimeRole(
    { PI_SUBAGENT_DEPTH: "2", PI_SUBAGENT_NAME: "researcher", HC_TERMINAL_ID: "t7" },
    async (command, args) => {
      calls.push([command, ...args]);
      return ok(leadTerminal());
    },
  );
  assert.equal(role.kind, "subagent");
  assert.equal(role.depth, 2);
  assert.equal(role.name, "researcher");
  assert.equal(calls.length, 0, "hc get must not run for a subagent");
});

test("resolveRuntimeRole: depth 0 is not a subagent", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ PI_SUBAGENT_DEPTH: "0", HC_TERMINAL_ID: "t18" }, async () =>
    ok(leadTerminal()),
  );
  assert.notEqual(role.kind, "subagent");
});

test("resolveRuntimeRole: no HC_TERMINAL_ID resolves to standalone without running hc", async () => {
  const mod = await loadModule();
  let ran = false;
  const role = await mod.resolveRuntimeRole({}, async () => {
    ran = true;
    return ok("");
  });
  assert.equal(role.kind, "standalone");
  assert.equal(ran, false);
});

test("resolveRuntimeRole: hc get failure resolves to standalone", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t99" }, async () => fail("no such terminal"));
  assert.equal(role.kind, "standalone");
});

test("resolveRuntimeRole: unparsable hc get output resolves to standalone", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t99" }, async () => ok("not json"));
  assert.equal(role.kind, "standalone");
});

test("resolveRuntimeRole: non-null parent resolves to hc_worker with all fields", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t3g" }, async () =>
    ok({ address: "t3g", parent: "t18", template: "workhorse", labels: { "herdr.space": SPACE } }),
  );
  assert.equal(role.kind, "hc_worker");
  assert.deepEqual(
    { terminalId: role.terminalId, parent: role.parent, template: role.template, spaceId: role.spaceId },
    { terminalId: "t3g", parent: "t18", template: "workhorse", spaceId: SPACE },
  );
});

test("resolveRuntimeRole: rootless worker template resolves to hc_worker", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t40" }, async () =>
    ok({ address: "t40", parent: null, template: "grunt", labels: { "herdr.space": SPACE } }),
  );
  assert.equal(role.kind, "hc_worker");
  assert.equal(role.parent, null);
  assert.equal(role.template, "grunt");
});

test("resolveRuntimeRole: peer template with null parent resolves to hc_peer", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t41" }, async () =>
    ok({ address: "t41", parent: null, template: "peer", labels: { "herdr.space": SPACE } }),
  );
  assert.equal(role.kind, "hc_peer");
  assert.equal(role.terminalId, "t41");
  assert.equal(role.spaceId, SPACE);
});

test("resolveRuntimeRole: top-level terminal resolves to hc_lead with templates", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t18" }, async (command, args) => {
    if (args[0] === "get") return ok(leadTerminal());
    if (args[0] === "templates") return ok(templatesPayload);
    return ok("");
  });
  assert.equal(role.kind, "hc_lead");
  assert.equal(role.terminalId, "t18");
  assert.equal(role.spaceId, SPACE);
  assert.deepEqual(
    role.templates.map((template: any) => template.name),
    ["grunt", "workhorse", "peer"],
  );
});

test("resolveRuntimeRole: failing hc templates still resolves to hc_lead", async () => {
  const mod = await loadModule();
  const role = await mod.resolveRuntimeRole({ HC_TERMINAL_ID: "t18" }, async (command, args) => {
    if (args[0] === "get") return ok(leadTerminal());
    return fail("core unreachable");
  });
  assert.equal(role.kind, "hc_lead");
  assert.deepEqual(role.templates, []);
});

// ===========================================================================
// Tool schemas (strict provider compatibility)
// ===========================================================================

test("both tools register inactive with strict-provider-safe parameters", async () => {
  const h = await harness();
  for (const name of ["hc_worker", "hc_report"]) {
    const definition = h.tools[name];
    assert.ok(definition, `${name} is registered`);
    assert.equal(definition.defaultActive, false, `${name} is inactive by default`);
    assert.ok(definition.execute, `${name} uses execute, not handler`);
    assert.equal(definition.inputSchema, undefined, `${name} must not use inputSchema`);
    const parameters = definition.parameters;
    assert.equal(parameters.type, "object");
    assert.ok(parameters.properties && typeof parameters.properties === "object");
    assert.ok(Array.isArray(parameters.required));
    assert.equal(parameters.additionalProperties, false);
    assert.ok(parameters.required.includes("action"));
    assert.ok(parameters.properties.action.anyOf.length > 0);
  }
});

test("hc_worker schema covers every lifecycle action", async () => {
  const h = await harness();
  const actions = h.tools.hc_worker.parameters.properties.action.anyOf.map((entry: any) => entry.const);
  assert.deepEqual(actions, ["spawn", "send", "wait", "read", "status", "interrupt", "close"]);
});

test("hc_report schema covers every reporting action", async () => {
  const h = await harness();
  const actions = h.tools.hc_report.parameters.properties.action.anyOf.map((entry: any) => entry.const);
  assert.deepEqual(actions, ["done", "blocked", "peer", "list_peers"]);
});

// ===========================================================================
// buildRolePlan / applyToolPlan
// ===========================================================================

const baseState = () => ({
  tabId: null,
  tabName: null,
  ownedWorkers: {},
  guardEnabled: true,
  roleOverride: null,
});

test("buildRolePlan: hc_lead adds hc_worker without forcing subagent on", async () => {
  const mod = await loadModule();
  const plan = mod.buildRolePlan(
    { kind: "hc_lead", terminalId: "t18", spaceId: SPACE, templates: templatesPayload.templates },
    baseState(),
    [{ name: "reviewer", description: "code review", scope: "project" }],
  );
  // `subagent` is never force-enabled: a user who disabled it keeps it disabled.
  assert.deepEqual(plan.addTools, ["hc_worker"]);
  assert.deepEqual(plan.removeTools, ["hc_report"]);
  assert.equal(plan.sections.hc_worker_role, null);
  assert.equal(plan.sections.hc_peer_role, null);
  // Repo-agnostic: every file type counted, Lead audits instead of executing.
  assert.match(plan.sections.delegation!, /All multi-file work \(>=2 files\) belongs to `hc_worker`/);
  assert.match(plan.sections.delegation!, /code, config, docs, and workflow\/planning artifacts/);
  assert.match(plan.sections.delegation!, /must require the worker to run the verification commands/);
  assert.match(plan.sections.delegation!, /Do not run test\/build\/lint\/verification suites in your own bash/);
  assert.doesNotMatch(plan.sections.delegation!, /openspec\//);
  assert.doesNotMatch(plan.sections.delegation!, /outside `openspec`/);
  assert.match(plan.sections.delegation!, /3\+ direct `read`\/`grep`\/`find` calls/);
  assert.match(plan.sections.delegation!, /one-shot read-only barrier/);
  assert.match(plan.sections.delegation!, /grunt/);
  assert.match(plan.sections.delegation!, /`reviewer` \(project\)/);
  assert.ok(plan.subagentSnippet);
});

test("buildRolePlan: hc_worker loses subagent and hc_worker, gains hc_report", async () => {
  const mod = await loadModule();
  const plan = mod.buildRolePlan(
    { kind: "hc_worker", terminalId: "t3g", parent: "t18", template: "workhorse", spaceId: SPACE },
    baseState(),
  );
  assert.deepEqual(plan.addTools, ["hc_report"]);
  assert.deepEqual(plan.removeTools, ["hc_worker", "subagent"]);
  assert.match(plan.sections.hc_worker_role!, /terminal `t3g`/);
  assert.match(plan.sections.hc_worker_role!, /parent `t18`/);
  assert.match(plan.sections.hc_worker_role!, /template `workhorse`/);
  assert.equal(plan.sections.delegation, null);
  assert.equal(plan.sections.hc_peer_role, null);
});

test("buildRolePlan: allow_subagents keeps subagent in a worker", async () => {
  const mod = await loadModule();
  const plan = mod.buildRolePlan(
    { kind: "hc_worker", terminalId: "t3g", parent: "t18", template: "grunt", spaceId: SPACE },
    { ...baseState(), roleOverride: "allow_subagents" },
  );
  assert.deepEqual(plan.removeTools, ["hc_worker"]);
});

test("buildRolePlan: hc_peer gets the peer section and hc_report", async () => {
  const mod = await loadModule();
  const plan = mod.buildRolePlan({ kind: "hc_peer", terminalId: "t41", spaceId: SPACE }, baseState());
  assert.deepEqual(plan.addTools, ["hc_report"]);
  assert.deepEqual(plan.removeTools, ["hc_worker", "subagent"]);
  assert.match(plan.sections.hc_peer_role!, /list_peers/);
  assert.equal(plan.sections.delegation, null);
});

test("buildRolePlan: subagent gets no delegation or worker section at all", async () => {
  const mod = await loadModule();
  const plan = mod.buildRolePlan({ kind: "subagent", depth: 1, name: null }, baseState());
  assert.deepEqual(plan.addTools, []);
  assert.deepEqual(plan.removeTools, ["hc_worker", "hc_report"]);
  for (const key of ["delegation", "hc_worker_role", "hc_peer_role"]) {
    assert.equal(plan.sections[key], null, `${key} must be absent`);
  }
  assert.equal(plan.subagentSnippet, null);
});

test("buildRolePlan: standalone keeps subagent and only adds a fallback note", async () => {
  const mod = await loadModule();
  const plan = mod.buildRolePlan({ kind: "standalone" }, baseState());
  assert.deepEqual(plan.addTools, []);
  assert.deepEqual(plan.removeTools, ["hc_worker", "hc_report"]);
  assert.match(plan.sections.delegation!, /subagent\(\{ agent, task \}\)/);
  assert.equal(plan.sections.hc_worker_role, null);
});

test("applyToolPlan preserves order, adds new tools and is idempotent", async () => {
  const mod = await loadModule();
  const plan: RolePlan = {
    addTools: ["hc_report"],
    removeTools: ["subagent"],
    sections: {},
    subagentSnippet: null,
  };
  const next = mod.applyToolPlan(["bash", "subagent", "read"], plan);
  assert.deepEqual(next, ["bash", "read", "hc_report"]);
  assert.deepEqual(mod.applyToolPlan(next, plan), next);
});

// ===========================================================================
// detectDirectVerificationCommand
// ===========================================================================

test("detectDirectVerificationCommand matches test/build/lint suites", async () => {
  const mod = await loadModule();
  const matches: Array<[string, string]> = [
    ["node --test tests/hc-delegation.test.ts", "node --test"],
    ["node --experimental-strip-types --test x.ts", "node --test"],
    ["bun test", "bun test"],
    ["bun run build", "bun run build"],
    ["npm test", "npm test"],
    ["npm run lint", "npm run lint"],
    ["npm run build", "npm run build"],
    ["pnpm test", "pnpm test"],
    ["pnpm run check", "pnpm run check"],
    ["yarn run test", "yarn run test"],
    ["npx vitest run", "npx vitest"],
    ["vitest run --coverage", "vitest"],
    ["jest", "jest"],
    ["pytest -q", "pytest"],
    ["cargo test", "cargo test"],
    ["cargo clippy --all-targets", "cargo clippy"],
    ["go test ./...", "go test"],
    ["go build ./...", "go build"],
    ["tsc --noEmit", "tsc"],
    ["eslint .", "eslint"],
    ["ruff check .", "ruff"],
    ["mypy src", "mypy"],
    ["make test", "make test"],
    ["make check", "make check"],
    ["openspec validate --strict", "openspec validate"],
  ];
  for (const [command, expected] of matches) {
    assert.equal(mod.detectDirectVerificationCommand(command), expected, command);
  }
});

test("detectDirectVerificationCommand finds a suite later in a statement or pipeline", async () => {
  const mod = await loadModule();
  assert.equal(mod.detectDirectVerificationCommand("cd repo && npm test"), "npm test");
  assert.equal(mod.detectDirectVerificationCommand("sudo -E cargo test"), "cargo test");
  assert.equal(mod.detectDirectVerificationCommand("git stash list; pytest"), "pytest");
  assert.equal(mod.detectDirectVerificationCommand("echo starting | tee log | npm run build"), "npm run build");
});

test("detectDirectVerificationCommand ignores inspection, hc and quoted text", async () => {
  const mod = await loadModule();
  for (const command of [
    "git diff",
    "git status",
    "git log --oneline -5",
    "ls -la",
    "hc ls --json",
    'hc send t18 "done: node --test -> 12 pass"',
    'echo "run npm test later"',
    "git commit -m 'fix: npm run lint'",
    "npm install",
    "cargo add serde",
    "make install",
    "node script.js",
    "openspec list",
    "",
  ]) {
    assert.equal(mod.detectDirectVerificationCommand(command), null, command);
  }
});

// ===========================================================================
// hc run detection
// ===========================================================================

test("findHcRun extracts the target after hc run flags", async () => {
  const mod = await loadModule();
  assert.deepEqual(mod.findHcRun(`hc run --bg --name w1 --label k=v grunt "go"`), { target: "grunt" });
  assert.deepEqual(mod.findHcRun(`hc run --bg --rm cargo test`), { target: "cargo" });
  assert.equal(mod.findHcRun(`hc ls --json`), null);
  assert.equal(mod.findHcRun(`git status`), null);
});

test("detectRawHcTemplateRun blocks a bare known-template run", async () => {
  const mod = await loadModule();
  const result = mod.detectRawHcTemplateRun(`hc run grunt "implement X"`, ["grunt", "workhorse", "peer"]);
  assert.equal(result.blocked, true);
  assert.equal(result.template, "grunt");
  assert.match(result.reason!, /hc_worker\(\{ action: "spawn"/);
});

test("detectRawHcTemplateRun blocks template runs hidden behind flags and statements", async () => {
  const mod = await loadModule();
  const templates = ["grunt", "workhorse", "peer"];
  assert.equal(mod.detectRawHcTemplateRun(`hc run --bg --name w1 workhorse "x"`, templates).blocked, true);
  assert.equal(mod.detectRawHcTemplateRun(`cd /repo && hc run peer "hi"`, templates).blocked, true);
  assert.equal(mod.detectRawHcTemplateRun(`env FOO=1 hc run grunt "x"`, templates).blocked, true);
});

test("detectRawHcTemplateRun allows plain shell runs and quoted text", async () => {
  const mod = await loadModule();
  const templates = ["grunt", "workhorse", "peer"];
  assert.equal(mod.detectRawHcTemplateRun(`hc run --bg --rm cargo test`, templates).blocked, false);
  assert.equal(mod.detectRawHcTemplateRun(`hc run --on vps "npm test"`, templates).blocked, false);
  assert.equal(mod.detectRawHcTemplateRun(`echo "use hc run grunt here"`, templates).blocked, false);
  assert.equal(mod.detectRawHcTemplateRun(`hc ls --json`, templates).blocked, false);
  assert.equal(mod.detectRawHcTemplateRun(`hc run`, templates).blocked, false);
});

test("detectAntiRecursionHcRun blocks every hc run form", async () => {
  const mod = await loadModule();
  assert.equal(mod.detectAntiRecursionHcRun(`hc run grunt "x"`).blocked, true);
  assert.equal(mod.detectAntiRecursionHcRun(`cd src && hc run --bg claude`).blocked, true);
  assert.equal(mod.detectAntiRecursionHcRun(`hc run`).blocked, true);
});

test("detectAntiRecursionHcRun allows reporting and inspection commands", async () => {
  const mod = await loadModule();
  assert.equal(mod.detectAntiRecursionHcRun(`hc send t18 "done: ok"`).blocked, false);
  assert.equal(mod.detectAntiRecursionHcRun(`hc ls --label herdr.space=x --json`).blocked, false);
  assert.equal(mod.detectAntiRecursionHcRun(`hc get t18 --json`).blocked, false);
  assert.equal(mod.detectAntiRecursionHcRun(`echo "hc run grunt"`).blocked, false);
});

// ===========================================================================
// herdr tab helpers
// ===========================================================================

test("resolveTabFromAppList matches the tab holding the terminal address", async () => {
  const mod = await loadModule();
  const payload = JSON.stringify(appListPayload("2", ["t18", "t3g"]));
  assert.deepEqual(mod.resolveTabFromAppList(payload, SPACE, "t3g"), { tabId: TAB, tabName: "2" });
  assert.equal(mod.resolveTabFromAppList(payload, "other-space", "t3g"), null);
  assert.equal(mod.resolveTabFromAppList(payload, SPACE, "t99"), null);
  assert.equal(mod.resolveTabFromAppList("not json", SPACE, "t3g"), null);
});

test("findTabName reads a tab name by id", async () => {
  const mod = await loadModule();
  const payload = JSON.stringify(appListPayload("hc-work", ["t18"]));
  assert.equal(mod.findTabName(payload, TAB), "hc-work");
  assert.equal(mod.findTabName(payload, "nope"), null);
});

test("shouldRenameTab only takes over default numeric tabs", async () => {
  const mod = await loadModule();
  assert.equal(mod.shouldRenameTab("1"), true);
  assert.equal(mod.shouldRenameTab("12"), true);
  assert.equal(mod.shouldRenameTab("hc-work"), false);
  assert.equal(mod.shouldRenameTab(null), false);
});

test("buildSpawnArgs attaches space always and tab only when known", async () => {
  const mod = await loadModule();
  assert.deepEqual(
    mod.buildSpawnArgs({ name: "w1", template: "grunt", task: "do it", spaceId: SPACE, tabId: null }),
    ["run", "--bg", "--json", "--name", "w1", "--label", `herdr.space=${SPACE}`, "grunt", "do it"],
  );
  assert.deepEqual(
    mod.buildSpawnArgs({
      name: "w2",
      template: "workhorse",
      task: "hard one",
      cwd: "/repo/x",
      spaceId: SPACE,
      tabId: TAB,
    }),
    [
      "run",
      "--bg",
      "--json",
      "--name",
      "w2",
      "--label",
      `herdr.space=${SPACE}`,
      "--label",
      `herdr.tab=${TAB}`,
      "--cwd",
      "/repo/x",
      "workhorse",
      "hard one",
    ],
  );
});

// ===========================================================================
// discoverAgentSummaries
// ===========================================================================

test("discoverAgentSummaries: project overrides global, sorted by name", async () => {
  const mod = await loadModule();
  const io = fakeIo({
    "/home/tester/.pi/agent/agents/reviewer.md": "---\nname: reviewer\ndescription: global reviewer\n---\nbody",
    "/home/tester/.pi/agent/agents/researcher.md": "---\ndescription: researcher\n---\nbody",
    "/repo/.pi/agents/reviewer.md": "---\ndescription: project reviewer\n---\nbody",
    "/repo/.pi/agents/notes.txt": "ignored",
  });
  const agents = mod.discoverAgentSummaries("/repo", io, "/home/tester");
  assert.deepEqual(agents, [
    { name: "researcher", description: "researcher", scope: "global" },
    { name: "reviewer", description: "project reviewer", scope: "project" },
  ]);
});

test("discoverAgentSummaries tolerates missing directories and empty frontmatter", async () => {
  const mod = await loadModule();
  const agents = mod.discoverAgentSummaries("/repo", fakeIo({}), "/home/tester");
  assert.deepEqual(agents, []);
  assert.equal(mod.readFrontmatterDescription("no frontmatter"), "");
  assert.equal(mod.readFrontmatterDescription("---\nname: x\n---\n"), "");
});

// ===========================================================================
// before_agent_start: role-scoped tools and sections
// ===========================================================================

test("hc_lead turn: hc_worker + subagent active, sections and snippet injected in place", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: leadExec(),
    activeTools: [...BASE_TOOLS, "subagent"],
    io: fakeIo({ "/repo/.pi/agents/researcher.md": "---\ndescription: digs\n---\n" }),
  });
  const event = beforeStartEvent();
  const result = await h.fire("before_agent_start", event);

  assert.equal(result, undefined, "must never return a replacement systemPrompt");
  assert.equal(event.systemPromptOptions.forceSystemPrompt, undefined);
  assert.deepEqual(h.activeTools(), [...BASE_TOOLS, "subagent", "hc_worker"]);
  assert.equal(h.activeTools().includes("hc_report"), false);
  assert.deepEqual(event.systemPromptOptions.selectedTools, h.activeTools());
  assert.match(event.systemPromptOptions.sections.delegation, /Division of labor/);
  assert.match(event.systemPromptOptions.sections.delegation, /audit their results, diffs and verification evidence/);
  assert.match(event.systemPromptOptions.sections.delegation, /`researcher` \(project\)/);
  assert.match(event.systemPromptOptions.sections.delegation, /grunt/);
  assert.match(event.systemPromptOptions.toolSnippets.subagent, /One-shot/);
});

test("hc_lead turn deletes stale worker/peer sections left in the options", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec() });
  const event = beforeStartEvent({ sections: { hc_worker_role: "stale", hc_peer_role: "stale" } });
  await h.fire("before_agent_start", event);
  assert.equal("hc_worker_role" in event.systemPromptOptions.sections, false);
  assert.equal("hc_peer_role" in event.systemPromptOptions.sections, false);
});

test("role-scoped tools are re-applied on every turn (durable against /reload)", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t3g" },
    activeTools: [...BASE_TOOLS, "subagent", "hc_worker"],
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t3g", parent: "t18", template: "workhorse", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });

  await h.fire("before_agent_start", beforeStartEvent());
  assert.equal(h.activeTools().includes("subagent"), false);
  assert.equal(h.activeTools().includes("hc_worker"), false);
  assert.equal(h.activeTools().includes("hc_report"), true);

  // Simulate /reload or a tool-registry refresh flipping subagent back on.
  h.setActiveNow([...h.activeTools(), "subagent"]);
  await h.fire("before_agent_start", beforeStartEvent());
  assert.equal(h.activeTools().includes("subagent"), false);
});

test("no setActiveTools call when the loadout already matches", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t3g" },
    activeTools: [...BASE_TOOLS, "hc_report"],
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t3g", parent: "t18", template: "grunt", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  assert.equal(h.setActiveCalls.length, 0);
});

test("hc_worker turn injects the worker contract with its real identity", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t3g" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t3g", parent: "t18", template: "workhorse", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
  const event = beforeStartEvent({ sections: { delegation: "lead text" } });
  await h.fire("before_agent_start", event);
  const section = event.systemPromptOptions.sections.hc_worker_role;
  assert.match(section, /hc worker/);
  assert.match(section, /terminal `t3g`/);
  assert.match(section, /parent `t18`/);
  assert.match(section, /template `workhorse`/);
  assert.equal("delegation" in event.systemPromptOptions.sections, false);
  assert.equal(h.activeTools().includes("hc_report"), true);
  assert.equal(h.activeTools().includes("subagent"), false);
});

test("hc_peer turn injects the peer protocol", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t41" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t41", parent: null, template: "peer", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
  const event = beforeStartEvent();
  await h.fire("before_agent_start", event);
  assert.match(event.systemPromptOptions.sections.hc_peer_role, /list_peers/);
  assert.match(event.systemPromptOptions.sections.hc_peer_role, /terminal `t41`/);
  assert.equal(h.activeTools().includes("hc_report"), true);
  assert.equal(h.activeTools().includes("hc_worker"), false);
  assert.equal(h.activeTools().includes("subagent"), false);
});

test("subagent turn receives zero delegation prompt tokens", async () => {
  const h = await harness({
    env: { PI_SUBAGENT_DEPTH: "1" },
    activeTools: [...BASE_TOOLS, "hc_worker", "hc_report"],
  });
  const event = beforeStartEvent({ sections: { delegation: "stale", hc_worker_role: "stale" } });
  await h.fire("before_agent_start", event);
  assert.equal(event.systemPromptOptions.sections.delegation, undefined);
  assert.equal(event.systemPromptOptions.sections.hc_worker_role, undefined);
  assert.equal(event.systemPromptOptions.sections.hc_peer_role, undefined);
  assert.equal(h.activeTools().includes("hc_worker"), false);
  assert.equal(h.activeTools().includes("hc_report"), false);
  assert.equal(h.execCalls.length, 0, "no hc probing for a subagent");
});

test("standalone turn keeps subagent and only adds a fallback delegation note", async () => {
  const h = await harness({ activeTools: [...BASE_TOOLS, "subagent"] });
  const event = beforeStartEvent();
  await h.fire("before_agent_start", event);
  assert.match(event.systemPromptOptions.sections.delegation, /Not running under `hc`/);
  assert.equal(h.activeTools().includes("subagent"), true);
  assert.equal(h.activeTools().includes("hc_worker"), false);
});

test("before_agent_start resets the per-turn budget", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec(), cwd: "/repo" });
  await h.fire("before_agent_start", beforeStartEvent());

  // Burn the whole turn budget: one direct edit plus six inspections.
  await h.fire("tool_call", toolCall("edit", { path: "a.ts" }));
  for (let i = 0; i < 6; i += 1) await h.fire("tool_result", readResult());
  assert.equal((await h.fire("tool_call", toolCall("edit", { path: "b.ts" }))).block, true);

  // A new user turn starts from a clean budget.
  await h.fire("before_agent_start", beforeStartEvent());
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "b.ts" })), undefined);
  assert.equal(await h.fire("tool_result", readResult()), undefined);
  assert.equal(await h.fire("tool_result", readResult()), undefined);
});

// ===========================================================================
// Lead edit guard
// ===========================================================================

async function leadHarness(extra: Record<string, unknown> = {}) {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec(), cwd: "/repo", ...extra });
  await h.fire("before_agent_start", beforeStartEvent());
  return h;
}

const toolCall = (toolName: string, input: Record<string, unknown>) => ({ type: "tool_call", toolName, input });

test("lead: first single-file edit is allowed", async () => {
  const h = await leadHarness();
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" })), undefined);
});

test("lead: a 2nd distinct edit is blocked and redirected to a worker", async () => {
  const h = await leadHarness();
  await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" }));
  const result = await h.fire("tool_call", toolCall("write", { path: "src/other.ts" }));
  assert.equal(result.block, true);
  assert.match(result.reason, /hc_worker\(\{ action: "spawn"/);
  assert.match(result.reason, /hc_worker\(\{ action: "send"/);
  assert.match(result.reason, /src\/app\.ts/);
});

test("lead: editing the same file twice stays allowed", async () => {
  const h = await leadHarness();
  await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" }));
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" })), undefined);
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "./src/app.ts" })), undefined);
});

test("lead: a blocked 2nd file does not poison the first file", async () => {
  const h = await leadHarness();
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "src/a.ts" })), undefined);

  const blocked = await h.fire("tool_call", toolCall("write", { path: "src/b.ts" }));
  assert.equal(blocked.block, true);
  assert.match(blocked.reason, /src\/a\.ts, \/repo\/src\/b\.ts/);

  // The rejected file must not have entered the budget: A is still the only file.
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "src/a.ts" })), undefined);
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "./src/a.ts" })), undefined);
  assert.equal((await h.fire("tool_call", toolCall("edit", { path: "src/b.ts" }))).block, true);
});

test("lead: there is no workflow-directory exemption", async () => {
  for (const paths of [
    ["openspec/changes/x/design.md", "openspec/changes/x/tasks.md"],
    ["specs/a/spec.md", "docs/adr/0001-x.md"],
    ["README.md", "AGENTS.md"],
  ]) {
    const h = await leadHarness();
    assert.equal(await h.fire("tool_call", toolCall("write", { path: paths[0] })), undefined, paths[0]);
    const blocked = await h.fire("tool_call", toolCall("write", { path: paths[1] }));
    assert.equal(blocked?.block, true, `${paths[1]} must be blocked for a Lead`);
  }
});

test("lead: delegating earlier in the turn does not buy a 2nd direct edit", async () => {
  const h = await leadHarness({
    exec: leadExec(async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "w1") return fail("absent");
      if (command === "hc" && args[0] === "run") {
        return ok({ address: "t50", first_message: { sent: true }, labels: { "herdr.space": SPACE } });
      }
      if (command === "hc" && args[0] === "get" && args[1] === "t50") return ok(leadTerminal({ address: "t50" }));
      if (command === "herdr-app" && args[0] === "ls") return ok(appListPayload("1", ["t18", "t50"]));
      return undefined;
    }),
  });
  await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" }));
  await h.fire("tool_call", toolCall("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" }));
  const blocked = await h.fire("tool_call", toolCall("edit", { path: "src/b.ts" }));
  assert.equal(blocked.block, true, "a spawned worker does not license a 2nd direct edit");
  assert.match(blocked.reason, /hc_worker\(\{ action: "send"/);

  // A subagent delegation does not license it either.
  const h2 = await leadHarness();
  await h2.fire("tool_call", toolCall("edit", { path: "src/app.ts" }));
  await h2.fire("tool_call", toolCall("subagent", { agent: "researcher", task: "x" }));
  assert.equal((await h2.fire("tool_call", toolCall("edit", { path: "src/b.ts" }))).block, true);
});

test("lead: /hc-guard off disables the edit guard", async () => {
  const h = await leadHarness();
  await h.callCommand("hc-guard", "off");
  await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" }));
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "src/b.ts" })), undefined);
});

test("non-lead roles never hit the Lead edit guard", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t3g" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t3g", parent: "t18", template: "grunt", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  await h.fire("tool_call", toolCall("edit", { path: "a.ts" }));
  assert.equal(await h.fire("tool_call", toolCall("edit", { path: "b.ts" })), undefined);
});

// ===========================================================================
// Lead direct-inspection reminder
// ===========================================================================

const readResult = (text = "content") => ({
  type: "tool_result",
  toolName: "read",
  content: [{ type: "text", text }],
});

test("lead: the 3rd direct inspection appends a delegation reminder", async () => {
  const h = await leadHarness();
  assert.equal(await h.fire("tool_result", readResult()), undefined);
  assert.equal(await h.fire("tool_result", readResult()), undefined);
  const third = await h.fire("tool_result", readResult("third"));
  assert.ok(third);
  assert.equal(third.content.length, 2);
  assert.match(third.content[1].text, /\[hc-delegation\] 3 direct/);
  assert.match(third.content[1].text, /hc_worker\(\{ action: "spawn"/);
  assert.equal(third.content[0].text, "third", "original content is preserved");
});

test("lead: reminders repeat on 6, 9, ... and stay silent in between", async () => {
  const h = await leadHarness();
  const results: any[] = [];
  for (let i = 0; i < 9; i += 1) results.push(await h.fire("tool_result", readResult()));
  assert.equal(results[0], undefined);
  assert.equal(results[1], undefined);
  assert.ok(results[2]);
  assert.equal(results[3], undefined);
  assert.equal(results[4], undefined);
  assert.ok(results[5]);
  assert.match(results[5].content[1].text, /6 direct/);
  assert.equal(results[6], undefined);
  assert.equal(results[7], undefined);
  assert.ok(results[8]);
  assert.match(results[8].content[1].text, /9 direct/);
});

test("lead: grep and find count as direct inspection too", async () => {
  const h = await leadHarness();
  await h.fire("tool_result", { type: "tool_result", toolName: "grep", content: [] });
  await h.fire("tool_result", { type: "tool_result", toolName: "find", content: [] });
  const third = await h.fire("tool_result", { type: "tool_result", toolName: "read", content: [] });
  assert.ok(third);
  assert.match(third.content[0].text, /3 direct/);
});

test("lead: no reminder once something was delegated this turn", async () => {
  const h = await leadHarness();
  await h.fire("tool_call", toolCall("subagent", { agent: "researcher", task: "x" }));
  for (let i = 0; i < 6; i += 1) {
    assert.equal(await h.fire("tool_result", readResult()), undefined);
  }
});

test("lead: no reminder while this session owns live workers", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: spawnExec(),
    entries: [
      {
        type: "custom",
        customType: "hc-delegation-state",
        data: {
          tabId: TAB,
          tabName: "hc-work",
          guardEnabled: true,
          roleOverride: null,
          ownedWorkers: { w1: { address: "t50", name: "w1", template: "grunt", task: "x", spawnedAt: 1 } },
        },
      },
    ],
  });
  await h.fire("session_start", { type: "session_start" });
  await h.fire("before_agent_start", beforeStartEvent());
  for (let i = 0; i < 6; i += 1) {
    assert.equal(await h.fire("tool_result", readResult()), undefined);
  }
});

test("lead: non-inspection tools never nudge, and guard off silences everything", async () => {
  const h = await leadHarness();
  for (let i = 0; i < 6; i += 1) {
    assert.equal(await h.fire("tool_result", { type: "tool_result", toolName: "bash", content: [] }), undefined);
  }
  await h.callCommand("hc-guard", "off");
  for (let i = 0; i < 6; i += 1) {
    assert.equal(await h.fire("tool_result", readResult()), undefined);
  }
});

test("worker role never receives inspection reminders", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t3g" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t3g", parent: "t18", template: "grunt", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  for (let i = 0; i < 6; i += 1) {
    assert.equal(await h.fire("tool_result", readResult()), undefined);
  }
});

// ===========================================================================
// bash guards through the hooks
// ===========================================================================

async function roleHarness(terminal: Record<string, unknown>, depth?: string) {
  return harness({
    env: depth ? { PI_SUBAGENT_DEPTH: depth } : { HC_TERMINAL_ID: String(terminal.address) },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") return ok(terminal);
      if (command === "hc" && args[0] === "templates") return ok(templatesPayload);
      return ok("");
    },
  });
}

test("lead: bash hc run <builtin template> is blocked", async () => {
  const h = await leadHarness();
  const result = await h.fire(
    "tool_call",
    toolCall("bash", { command: `hc run --bg ----name w1 grunt "do it"`.replace(/----/g, "--") }),
  );
  assert.equal(result.block, true);
  assert.match(result.reason, /hc run grunt/);
});

test("lead: bash hc run of a discovered template is blocked", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: leadExec(async (command, args) => {
      if (command === "hc" && args[0] === "templates") {
        return ok({ templates: [{ name: "auditor", description: "audits", command: "pi" }] });
      }
      return undefined;
    }),
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.fire("tool_call", toolCall("bash", { command: `hc run auditor "check it"` }));
  assert.equal(result.block, true);
});

test("lead: plain shell hc run stays allowed", async () => {
  const h = await leadHarness();
  assert.equal(
    await h.fire("tool_call", toolCall("bash", { command: `hc run --bg --rm cargo test` })),
    undefined,
  );
  assert.equal(await h.fire("tool_call", toolCall("bash", { command: `cargo test` })), undefined);
});

test("worker, peer and subagent: bash hc run is blocked by the anti-recursion guard", async () => {
  const worker = await roleHarness({
    address: "t3g",
    parent: "t18",
    template: "grunt",
    labels: { "herdr.space": SPACE },
  });
  const peer = await roleHarness({ address: "t41", parent: null, template: "peer", labels: { "herdr.space": SPACE } });
  const subagent = await roleHarness({ address: "t1", parent: null, template: null }, "1");

  for (const h of [worker, peer, subagent]) {
    const result = await h.fire("tool_call", toolCall("bash", { command: `hc run grunt "x"` }));
    assert.equal(result?.block, true);
    assert.match(result.reason, /anti-recursion/);
    assert.equal(
      await h.fire("tool_call", toolCall("bash", { command: `hc send t18 "done: ok"` })),
      undefined,
    );
  }
});

test("allow_subagents override relaxes the anti-recursion guard", async () => {
  const h = await roleHarness({
    address: "t3g",
    parent: "t18",
    template: "grunt",
    labels: { "herdr.space": SPACE },
  });
  await h.callCommand("hc-role", "allow-subagents");
  assert.equal(await h.fire("tool_call", toolCall("bash", { command: `hc run grunt "x"` })), undefined);
  await h.callCommand("hc-role", "reset");
  assert.equal((await h.fire("tool_call", toolCall("bash", { command: `hc run grunt "x"` }))).block, true);
});

// ===========================================================================
// hc_worker tool
// ===========================================================================

function spawnExec(overrides: {
  firstMessage?: Record<string, unknown>;
  tabName?: string;
  terminalLabels?: Record<string, string>;
  runAddress?: string;
  appList?: boolean;
} = {}): ExecFn {
  const address = overrides.runAddress ?? "t50";
  return async (command, args) => {
    if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
    if (command === "hc" && args[0] === "templates") return ok(templatesPayload);
    if (command === "hc" && args[0] === "get" && args[1] === address) {
      return ok({
        address,
        parent: "t18",
        template: "grunt",
        labels: overrides.terminalLabels ?? { "herdr.space": SPACE, "herdr.tab": TAB },
      });
    }
    if (command === "hc" && args[0] === "get") return fail("no such terminal");
    if (command === "hc" && args[0] === "run") {
      return ok({
        address,
        labels: { "herdr.space": SPACE },
        first_message: overrides.firstMessage ?? { sent: true, turn: 1 },
      });
    }
    if (command === "herdr-app" && args[0] === "ls") {
      if (overrides.appList === false) return fail("app not open");
      return ok(appListPayload(overrides.tabName ?? "1", ["t18", address]));
    }
    if (command === "herdr-app" && args[0] === "do") return ok("");
    return ok("");
  };
}

test("hc_worker spawn: places the first worker, renames the default tab, persists state", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: spawnExec({ tabName: "1" }) });
  await h.fire("before_agent_start", beforeStartEvent());

  const result = await h.callTool("hc_worker", {
    action: "spawn",
    name: "w1",
    template: "grunt",
    task: "implement X",
  });

  assert.equal(result.isError, undefined);
  const runCall = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "run");
  assert.ok(runCall, "hc run was invoked");
  assert.deepEqual(runCall!.args, [
    "run",
    "--bg",
    "--json",
    "--name",
    "w1",
    "--label",
    `herdr.space=${SPACE}`,
    "grunt",
    "implement X",
  ]);

  const rename = h.execCalls.find((call) => call.command === "herdr-app" && call.args[1] === "tab.rename");
  assert.ok(rename, "tab.rename was run for the default-named tab");
  assert.deepEqual(rename!.args, ["do", "tab.rename", "--id", TAB, "--name", "w1"]);

  const last = h.entries.at(-1) as any;
  assert.equal(last.customType, "hc-delegation-state");
  assert.equal(last.data.tabId, TAB);
  assert.equal(last.data.tabName, "w1");
  assert.equal(last.data.ownedWorkers.w1.address, "t50");
});

test("hc_worker spawn: a tab the person already named is never renamed", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: spawnExec({ tabName: "hc-delegation-opt" }) });
  await h.fire("before_agent_start", beforeStartEvent());
  await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(
    h.execCalls.some((call) => call.command === "herdr-app" && call.args[1] === "tab.rename"),
    false,
  );
});

test("hc_worker spawn: second worker reuses the captured tab label", async () => {
  let spawned = 0;
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "templates") return ok(templatesPayload);
      if (command === "hc" && args[0] === "get") {
        // `w1`/`w2` are the names being spawned; the spawned addresses carry the tab label.
        if (!String(args[1]).startsWith("t5")) return ok({ address: args[1], state: "finished" });
        return ok({
          address: args[1],
          parent: "t18",
          template: "grunt",
          labels: { "herdr.space": SPACE, "herdr.tab": TAB },
        });
      }
      if (command === "hc" && args[0] === "run") {
        spawned += 1;
        return ok({ address: `t5${spawned}`, first_message: { sent: true } });
      }
      if (command === "herdr-app" && args[0] === "ls") return ok(appListPayload("1", ["t18", "t50"]));
      if (command === "herdr-app" && args[0] === "do") return ok("");
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "a" });
  await h.callTool("hc_worker", { action: "spawn", name: "w2", template: "grunt", task: "b" });

  const runCalls = h.execCalls.filter((call) => call.command === "hc" && call.args[0] === "run");
  assert.equal(runCalls.length, 2);
  assert.equal(runCalls[0].args.includes(`herdr.tab=${TAB}`), false);
  assert.equal(runCalls[1].args.includes(`herdr.tab=${TAB}`), true);
});

test("hc_worker spawn: falls back to herdr-app ls by address when the tab label is missing", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: spawnExec({ terminalLabels: { "herdr.space": SPACE }, tabName: "3" }),
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(result.isError, undefined);
  assert.equal(result.details.tabId, TAB);
  const rename = h.execCalls.find((call) => call.command === "herdr-app" && call.args[1] === "tab.rename");
  assert.ok(rename);
});

test("hc_worker spawn: warns clearly when the launch task was not delivered", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: spawnExec({ firstMessage: { sent: false, reason: "draft held" } }),
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.match(result.content[0].text, /NOT delivered/);
  assert.deepEqual(result.details.warnings, [
    "the launch task was NOT delivered to the worker (reason: draft held). Send it again with hc_worker({ action: \"send\", name: \"w1\", text: <task> }).",
  ]);
});

test("hc_worker spawn: refuses a duplicate live name and never runs hc run", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return ok({ address: "w1", state: "live" });
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /already exists/);
  assert.equal(h.execCalls.some((call) => call.command === "hc" && call.args[0] === "run"), false);
});

test("hc_worker spawn: requires template and task", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec() });
  await h.fire("before_agent_start", beforeStartEvent());
  const noTemplate = await h.callTool("hc_worker", { action: "spawn", name: "w1", task: "x" });
  assert.equal(noTemplate.isError, true);
  assert.match(noTemplate.content[0].text, /requires `template`/);
  const noTask = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt" });
  assert.equal(noTask.isError, true);
  assert.match(noTask.content[0].text, /requires `task`/);
});

test("hc_worker is refused outside a lead role", async () => {
  const h = await roleHarness({
    address: "t3g",
    parent: "t18",
    template: "grunt",
    labels: { "herdr.space": SPACE },
  });
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /only available to an hc Lead/);
});

test("hc_worker close: refuses a terminal this session does not own", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return ok({ address: "t77", parent: "t7", state: "live" });
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "close", name: "t77" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Refusing to close/);
  assert.equal(h.execCalls.some((call) => call.command === "hc" && call.args[0] === "kill"), false);
});

test("hc_worker close: kills and removes an owned worker, then persists", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: spawnExec() });
  await h.fire("before_agent_start", beforeStartEvent());
  await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });

  const closed = await h.callTool("hc_worker", { action: "close", name: "w1" });
  assert.equal(closed.isError, undefined);
  assert.deepEqual(
    h.execCalls.filter((call) => call.command === "hc" && ["kill", "rm"].includes(call.args[0])).map((call) => call.args),
    [["kill", "w1"], ["rm", "w1"]],
  );
  const last = h.entries.at(-1) as any;
  assert.deepEqual(last.data.ownedWorkers, {});
});

test("hc_worker close: accepts a terminal whose parent is this Lead", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return ok({ address: "t80", parent: "t18", state: "live" });
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "close", name: "t80" });
  assert.equal(result.isError, undefined);
});

test("hc_worker send never passes --force", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec() });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "send", name: "w1", text: "keep going" });
  assert.equal(result.isError, undefined);
  const send = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "send");
  assert.deepEqual(send!.args, ["send", "w1", "keep going"]);
  assert.equal(send!.args.includes("--force"), false);
});

test("hc_worker wait/read/status/interrupt map to the right hc commands", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec() });
  await h.fire("before_agent_start", beforeStartEvent());

  await h.callTool("hc_worker", { action: "wait", name: "w1", output: "done", timeout: 30 });
  assert.deepEqual(
    h.execCalls.find((call) => call.command === "hc" && call.args[0] === "wait")!.args,
    ["wait", "w1", "--output", "done", "--timeout", "30"],
  );

  await h.callTool("hc_worker", { action: "read", name: "w1" });
  assert.deepEqual(
    h.execCalls.find((call) => call.command === "hc" && call.args[0] === "read")!.args,
    ["read", "w1"],
  );

  await h.callTool("hc_worker", { action: "status", name: "w1" });
  assert.ok(h.execCalls.some((call) => call.command === "hc" && call.args[0] === "get" && call.args[1] === "w1"));

  await h.callTool("hc_worker", { action: "interrupt", name: "w1" });
  assert.deepEqual(
    h.execCalls.find((call) => call.command === "hc" && call.args[0] === "interrupt")!.args,
    ["interrupt", "w1"],
  );
});

// ===========================================================================
// hc_report tool
// ===========================================================================

async function workerHarness(extra?: ExecFn) {
  return harness({
    env: { HC_TERMINAL_ID: "t3g" },
    exec: async (command, args) => {
      const fromExtra = extra ? await extra(command, args) : undefined;
      if (fromExtra) return fromExtra;
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t3g", parent: "t18", template: "grunt", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
}

test("hc_report done sends a prefixed report to the role parent", async () => {
  const h = await workerHarness();
  const result = await h.callTool("hc_report", {
    action: "done",
    summary: "verified: node --test -> 12 pass",
  });
  assert.equal(result.isError, undefined);
  const send = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "send");
  assert.deepEqual(send!.args, ["send", "t18", "done: verified: node --test -> 12 pass"]);
  assert.equal(send!.args.includes("--force"), false);
});

test("hc_report blocked sends a prefixed blocker report", async () => {
  const h = await workerHarness();
  await h.callTool("hc_report", { action: "blocked", summary: "need the vault path" });
  const send = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "send");
  assert.deepEqual(send!.args, ["send", "t18", "blocked: need the vault path"]);
});

test("hc_report falls back to re-reading the parent from hc get", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t41" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") {
        return ok({ address: "t41", parent: "t18", template: "peer", labels: { "herdr.space": SPACE } });
      }
      return ok("");
    },
  });
  await h.callTool("hc_report", { action: "done", summary: "ok" });
  const send = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "send");
  assert.deepEqual(send!.args, ["send", "t18", "done: ok"]);
});

test("hc_report errors when there is no parent to report to", async () => {
  const h = await workerHarness(async (command, args) => {
    if (command === "hc" && args[0] === "get") {
      return ok({ address: "t3g", parent: null, template: "peer", labels: { "herdr.space": SPACE } });
    }
    return undefined;
  });
  const result = await h.callTool("hc_report", { action: "done", summary: "ok" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /No parent terminal/);
});

test("hc_report list_peers filters out this terminal and reports the space", async () => {
  const h = await workerHarness(async (command, args) => {
    if (command === "hc" && args[0] === "ls") {
      return ok({
        terminals: [
          { address: "t3g", name: "me", template: "grunt", state: "live" },
          { address: "t39", name: "factcheck", template: "grunt", state: "working" },
        ],
      });
    }
    return undefined;
  });
  const result = await h.callTool("hc_report", { action: "list_peers" });
  assert.equal(result.isError, undefined);
  const ls = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "ls");
  assert.deepEqual(ls!.args, ["ls", "--label", `herdr.space=${SPACE}`, "--json"]);
  assert.match(result.content[0].text, /t39/);
  assert.doesNotMatch(result.content[0].text, /- t3g/);
});

test("hc_report list_peers requires a space label", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t3g" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get") return ok({ address: "t3g", parent: "t18", template: "grunt", labels: {} });
      return ok("");
    },
  });
  const result = await h.callTool("hc_report", { action: "list_peers" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /herdr\.space/);
});

test("hc_report peer prefixes the message with this terminal id", async () => {
  const h = await workerHarness();
  const result = await h.callTool("hc_report", {
    action: "peer",
    target: "t39",
    summary: "please check the spec diff",
  });
  assert.equal(result.isError, undefined);
  const send = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "send");
  assert.deepEqual(send!.args, ["send", "t39", "peer: t3g please check the spec diff"]);
});

test("hc_report is refused from a subagent", async () => {
  const h = await harness({ env: { PI_SUBAGENT_DEPTH: "1" } });
  const result = await h.callTool("hc_report", { action: "done", summary: "x" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /not available in role `subagent`/);
});

// ===========================================================================
// Commands
// ===========================================================================

test("/hc-guard off and on persist and are reflected in status", async () => {
  const h = await leadHarness();
  await h.callCommand("hc-guard", "off");
  assert.equal((h.entries.at(-1) as any).data.guardEnabled, false);
  await h.callCommand("hc-guard", "status");
  assert.match(h.notices.at(-1)!, /hc-guard: off/);
  await h.callCommand("hc-guard", "on");
  assert.equal((h.entries.at(-1) as any).data.guardEnabled, true);
  await h.callCommand("hc-guard", "status");
  assert.match(h.notices.at(-1)!, /hc-guard: on/);
});

test("/hc-guard status reports the turn budget for a lead", async () => {
  const h = await leadHarness();
  await h.fire("tool_call", toolCall("edit", { path: "src/app.ts" }));
  await h.callCommand("hc-guard", "");
  assert.match(h.notices.at(-1)!, /1 direct edit\(s\)/);
});

test("/hc-role allow-subagents and reset persist the override", async () => {
  const h = await roleHarness({
    address: "t3g",
    parent: "t18",
    template: "grunt",
    labels: { "herdr.space": SPACE },
  });
  await h.callCommand("hc-role", "allow-subagents");
  assert.equal((h.entries.at(-1) as any).data.roleOverride, "allow_subagents");
  await h.callCommand("hc-role", "reset");
  assert.equal((h.entries.at(-1) as any).data.roleOverride, null);
});

test("/hc-role status reports the resolved role", async () => {
  const h = await roleHarness({
    address: "t41",
    parent: null,
    template: "peer",
    labels: { "herdr.space": SPACE },
  });
  await h.callCommand("hc-role", "status");
  assert.match(h.notices.at(-1)!, /hc-role: hc_peer/);
  assert.match(h.notices.at(-1)!, /space=/);
});

// ===========================================================================
// Session restore
// ===========================================================================

test("session_start restores tab, workers, guard and override from the latest entry", async () => {
  const stateEntry = {
    type: "custom",
    customType: "hc-delegation-state",
    data: {
      tabId: TAB,
      tabName: "hc-work",
      guardEnabled: false,
      roleOverride: "allow_subagents",
      ownedWorkers: {
        w1: { address: "t50", name: "w1", template: "grunt", task: "x", spawnedAt: 5 },
      },
    },
  };
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    activeTools: [...BASE_TOOLS, "subagent"],
    entries: [stateEntry],
    exec: leadExec(),
  });
  await h.fire("session_start", { type: "session_start" });

  await h.callCommand("hc-role", "status");
  assert.match(h.notices.at(-1)!, /override=allow_subagents/);
  assert.match(h.notices.at(-1)!, /workers=1/);
  assert.match(h.notices.at(-1)!, new RegExp(`tab=${TAB}`));

  await h.callCommand("hc-guard", "status");
  assert.match(h.notices.at(-1)!, /hc-guard: off/);
});

test("session_start ignores unrelated entries and defaults to guard on", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    entries: [{ type: "custom", customType: "other", data: { guardEnabled: false } }],
    exec: leadExec(),
  });
  await h.fire("session_start", { type: "session_start" });
  await h.callCommand("hc-guard", "status");
  assert.match(h.notices.at(-1)!, /hc-guard: on/);
});

// ===========================================================================
// Argument validation
// ===========================================================================

test("hc_worker rejects an action outside the schema", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: leadExec() });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "destroy", name: "w1" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Unknown hc_worker action: destroy/);
});

test("hc_worker spawn forwards cwd to hc run", async () => {
  const h = await harness({ env: { HC_TERMINAL_ID: "t18" }, exec: spawnExec() });
  await h.fire("before_agent_start", beforeStartEvent());
  await h.callTool("hc_worker", {
    action: "spawn",
    name: "w1",
    template: "grunt",
    task: "x",
    cwd: "/repo/sub",
  });
  const runCall = h.execCalls.find((call) => call.command === "hc" && call.args[0] === "run");
  assert.deepEqual(runCall!.args.slice(-4), ["--cwd", "/repo/sub", "grunt", "x"]);
});

test("hc_report requires summary for done and target for peer", async () => {
  const h = await workerHarness();
  const noSummary = await h.callTool("hc_report", { action: "done" });
  assert.equal(noSummary.isError, true);
  assert.match(noSummary.content[0].text, /requires `summary`/);

  const noTarget = await h.callTool("hc_report", { action: "peer", summary: "hi" });
  assert.equal(noTarget.isError, true);
  assert.match(noTarget.content[0].text, /requires `target`/);

  const noPeerSummary = await h.callTool("hc_report", { action: "peer", target: "t39" });
  assert.equal(noPeerSummary.isError, true);
  assert.match(noPeerSummary.content[0].text, /requires `summary`/);
  assert.equal(h.execCalls.some((call) => call.command === "hc" && call.args[0] === "send"), false);
});

test("hc_worker surfaces hc run and hc send failures instead of pretending success", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return fail("absent");
      if (command === "hc" && args[0] === "run") return fail("template not found");
      if (command === "hc" && args[0] === "send") return fail("terminal is blocked");
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());

  const spawn = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(spawn.isError, true);
  assert.match(spawn.content[0].text, /template not found/);

  const send = await h.callTool("hc_worker", { action: "send", name: "w1", text: "go" });
  assert.equal(send.isError, true);
  assert.match(send.content[0].text, /terminal is blocked/);
});

// ===========================================================================
// Piped `hc run` (pipeline segment bypass)
// ===========================================================================

test("findHcRun looks past the pipeline head", async () => {
  const mod = await loadModule();
  assert.deepEqual(mod.findHcRun(`echo x | hc run grunt`), { target: "grunt" });
  assert.deepEqual(mod.findHcRun(`cat task.md | hc run --bg workhorse`), { target: "workhorse" });
  assert.deepEqual(mod.findHcRun(`grep -r foo . | sort | hc run grunt "x"`), { target: "grunt" });
  assert.equal(mod.findHcRun(`echo x | hc ls --json`), null);
});

test("detectRawHcTemplateRun blocks a piped template run", async () => {
  const mod = await loadModule();
  const templates = ["grunt", "workhorse", "peer"];
  const piped = mod.detectRawHcTemplateRun(`echo "implement X" | hc run grunt`, templates);
  assert.equal(piped.blocked, true);
  assert.equal(piped.template, "grunt");
  assert.equal(mod.detectRawHcTemplateRun(`cat task.md | hc run workhorse`, templates).blocked, true);
  // A piped non-template program stays allowed.
  assert.equal(mod.detectRawHcTemplateRun(`cat spec.md | hc run --bg --rm cargo test`, templates).blocked, false);
});

test("detectAntiRecursionHcRun blocks a piped hc run", async () => {
  const mod = await loadModule();
  assert.equal(mod.detectAntiRecursionHcRun(`echo x | hc run grunt`).blocked, true);
  assert.equal(mod.detectAntiRecursionHcRun(`cat task.md | hc run --bg workhorse`).blocked, true);
  assert.equal(mod.detectAntiRecursionHcRun(`hc ls --json | head -1`).blocked, false);
});

test("lead: a piped bash hc run of a known template is blocked through the hook", async () => {
  const h = await leadHarness();
  for (const command of [
    `echo "do it" | hc run grunt`,
    `cat task.md | hc run --bg workhorse`,
  ]) {
    const result = await h.fire("tool_call", toolCall("bash", { command }));
    assert.equal(result.block, true, command);
  }
});

test("worker: a piped bash hc run is blocked by the anti-recursion guard", async () => {
  const h = await roleHarness({
    address: "t3g",
    parent: "t18",
    template: "grunt",
    labels: { "herdr.space": SPACE },
  });
  const result = await h.fire("tool_call", toolCall("bash", { command: `echo x | hc run grunt` }));
  assert.equal(result?.block, true);
  assert.match(result.reason, /anti-recursion/);
});

// ===========================================================================
// hc_lead must not force-enable subagent
// ===========================================================================

test("lead turn keeps a manually disabled subagent disabled", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: leadExec(),
    // subagent deliberately absent from the active loadout.
    activeTools: [...BASE_TOOLS],
  });
  const event = beforeStartEvent({ selectedTools: [...BASE_TOOLS] });
  await h.fire("before_agent_start", event);
  assert.equal(h.activeTools().includes("subagent"), false, "subagent stays disabled");
  assert.equal(h.activeTools().includes("hc_worker"), true, "hc_worker is activated");
  assert.deepEqual(event.systemPromptOptions.selectedTools, h.activeTools());
});

test("lead turn keeps an already active subagent active", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: leadExec(),
    activeTools: [...BASE_TOOLS, "subagent"],
  });
  await h.fire("before_agent_start", beforeStartEvent());
  assert.equal(h.activeTools().includes("subagent"), true);
  assert.equal(h.activeTools().includes("hc_worker"), true);
});

// ===========================================================================
// Duplicate-name detection fails closed
// ===========================================================================

test("hc_worker spawn treats a live terminal name as taken", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return ok({ address: "w1", state: "live" });
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /already exists/);
  assert.match(result.content[0].text, /state live/);
});

test("hc_worker spawn fails closed when hc get omits the state field", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return ok({ address: "w1" });
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /state unknown/);
  assert.equal(h.execCalls.some((call) => call.command === "hc" && call.args[0] === "run"), false);
});

test("hc_worker spawn allows reusing the name of a finished terminal", async () => {
  const h = await harness({
    env: { HC_TERMINAL_ID: "t18" },
    exec: async (command, args) => {
      if (command === "hc" && args[0] === "get" && args[1] === "t18") return ok(leadTerminal());
      if (command === "hc" && args[0] === "get") return ok({ address: "w1", state: "finished" });
      if (command === "hc" && args[0] === "run") return ok({ address: "t60", first_message: { sent: true } });
      if (command === "herdr-app" && args[0] === "ls") return ok(appListPayload("hc-work", ["t18"]));
      return ok("");
    },
  });
  await h.fire("before_agent_start", beforeStartEvent());
  const result = await h.callTool("hc_worker", { action: "spawn", name: "w1", template: "grunt", task: "x" });
  assert.equal(result.isError, undefined);
  assert.ok(h.execCalls.some((call) => call.command === "hc" && call.args[0] === "run"));
});

test("worker/peer section wording follows the allow_subagents override", async () => {
  const mod = await loadModule();
  const workerRole = {
    kind: "hc_worker",
    terminalId: "t3g",
    parent: "t18",
    template: "grunt",
    spaceId: SPACE,
  };
  const base = mod.buildRolePlan(workerRole, baseState());
  assert.match(base.sections.hc_worker_role!, /Do not start agents: `hc_worker` and `subagent` are inactive/);

  const allowed = mod.buildRolePlan(workerRole, { ...baseState(), roleOverride: "allow_subagents" });
  assert.match(allowed.sections.hc_worker_role!, /was enabled for this session/);
  assert.doesNotMatch(allowed.sections.hc_worker_role!, /subagent` are inactive/);

  const peerBase = mod.buildRolePlan({ kind: "hc_peer", terminalId: "t41", spaceId: SPACE }, baseState());
  assert.match(peerBase.sections.hc_peer_role!, /Do not start agents/);
  const peerAllowed = mod.buildRolePlan(
    { kind: "hc_peer", terminalId: "t41", spaceId: SPACE },
    { ...baseState(), roleOverride: "allow_subagents" },
  );
  assert.match(peerAllowed.sections.hc_peer_role!, /was enabled for this session/);
});

// ===========================================================================
// Lead bash verification nudge (non-blocking)
// ===========================================================================

const bashResult = (command: string, text = "ok") => ({
  type: "tool_result",
  toolName: "bash",
  input: { command },
  content: [{ type: "text", text }],
});

test("lead: a direct verification suite in bash gets a delegation nudge", async () => {
  const h = await leadHarness();
  for (const command of [
    "node --test tests/hc-delegation.test.ts",
    "npm run lint",
    "cargo test",
    "openspec validate --strict",
  ]) {
    const result = await h.fire("tool_result", bashResult(command, "12 pass"));
    assert.ok(result, command);
    assert.equal(result.content.length, 2, command);
    assert.equal(result.content[0].text, "12 pass", "original output is preserved");
    assert.match(result.content[1].text, /\[hc-delegation\]/, command);
    assert.match(result.content[1].text, /belongs to the worker/, command);
    assert.match(result.content[1].text, /audit that evidence here/, command);
  }
});

test("lead: ordinary bash inspection never gets a verification nudge", async () => {
  const h = await leadHarness();
  for (const command of ["git diff", "git status", "ls -la", "hc ls --json", 'echo "npm test"']) {
    assert.equal(await h.fire("tool_result", bashResult(command)), undefined, command);
  }
});

test("the verification nudge is silent outside a guarded Lead", async () => {
  const worker = await roleHarness({
    address: "t3g",
    parent: "t18",
    template: "grunt",
    labels: { "herdr.space": SPACE },
  });
  await worker.fire("before_agent_start", beforeStartEvent());
  assert.equal(await worker.fire("tool_result", bashResult("node --test")), undefined);

  const guardedOff = await leadHarness();
  await guardedOff.callCommand("hc-guard", "off");
  assert.equal(await guardedOff.fire("tool_result", bashResult("node --test")), undefined);
});

test("the verification nudge does not disturb the inspection counter", async () => {
  const h = await leadHarness();
  await h.fire("tool_result", bashResult("cargo test"));
  await h.fire("tool_result", readResult());
  await h.fire("tool_result", readResult());
  const third = await h.fire("tool_result", readResult());
  assert.match(third.content[1].text, /3 direct/);
});
