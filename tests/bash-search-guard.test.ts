/**
 * bash-search-guard tests
 *
 * Run with zero dependencies on a clean checkout:
 *   node --test tests/bash-search-guard.test.ts
 *
 * The extension imports types (erased at runtime) plus the value
 * `isToolCallEventType` from "@earendil-works/pi-coding-agent", which is not
 * installed in this repo's node_modules. A registerHooks resolver below
 * redirects that specifier to an in-memory stub, then the extension module
 * is imported dynamically so the stub is in place first.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// In-memory stub for "@earendil-works/pi-coding-agent"
// ---------------------------------------------------------------------------

const stubSource = `
export function isToolCallEventType(toolName, event) {
  return (
    event &&
    event.type === "tool_call" &&
    event.toolName === toolName
  );
}
`;

const stubUrl = "data:text/javascript;base64," + Buffer.from(stubSource).toString("base64");

registerHooks({
  resolve(specifier, _context, nextResolve) {
    if (specifier === "@earendil-works/pi-coding-agent") {
      return { url: stubUrl, shortCircuit: true };
    }
    return nextResolve(specifier);
  },
});

// ---------------------------------------------------------------------------
// Load extension module (dynamic so the hook above is registered first)
// ---------------------------------------------------------------------------

const extensionUrl = pathToFileURL(
  new URL("../.pi/extensions/bash-search-guard.ts", import.meta.url).pathname,
).href;

type ExtensionModule = {
  detectBlockedBashSearch: (
    command: string,
    activeTools: readonly string[],
  ) => GuardResult;
  default: (pi: any) => void;
};

import type { GuardResult } from "../.pi/extensions/bash-search-guard.ts";

let modPromise: Promise<ExtensionModule> | null = null;
function loadExtensionModule(): Promise<ExtensionModule> {
  modPromise ??= import(extensionUrl) as Promise<ExtensionModule>;
  return modPromise;
}

const ALL = ["bash", "read", "edit", "write", "grep", "find", "ls"];

async function detect(
  command: string,
  activeTools: readonly string[] = ALL,
): Promise<GuardResult> {
  const m = await loadExtensionModule();
  return m.detectBlockedBashSearch(command, activeTools);
}

// ---------------------------------------------------------------------------
// Blocked scenarios
// ---------------------------------------------------------------------------

test("blocks grep -rn recursive search", async () => {
  const r = await detect(`grep -rn "foo" .`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks plain grep on a file", async () => {
  const r = await detect(`grep "foo" src/index.ts`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks rg search", async () => {
  const r = await detect(`rg "bar" src/`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks grep at pipeline head (grep ... | head)", async () => {
  const r = await detect(`grep -rn "foo" . | head -n 20`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks grep with env var prefix", async () => {
  const r = await detect(`FOO=1 rg pattern`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks grep in second compound statement", async () => {
  const r = await detect(`cd src && grep -r "bar" .`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks find -name search", async () => {
  const r = await detect(`find . -name "*.ts"`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "find");
});

test("blocks find -exec grep", async () => {
  const r = await detect(`find src -type f -exec grep "foo" {} +`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "find");
});

test("blocks absolute path grep /usr/bin/grep", async () => {
  const r = await detect(`/usr/bin/grep -n foo file.txt`);
  assert.equal(r.blocked, true);
});

test("blocks '(' glued directly onto grep (subshell)", async () => {
  const r = await detect(`(grep -rn foo .)`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks '!' glued directly onto grep (negation)", async () => {
  const r = await detect(`!grep foo bar.txt`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

test("blocks grep -qR (uppercase R combined short flags is recursive)", async () => {
  const r = await detect(`grep -qR foo .`);
  assert.equal(r.blocked, true);
  assert.equal(r.suggestedTool, "grep");
});

// ---------------------------------------------------------------------------
// Allowed scenarios
// ---------------------------------------------------------------------------

test("allows ps aux | grep node", async () => {
  assert.equal((await detect(`ps aux | grep node`)).blocked, false);
});

test("allows git log | grep feat", async () => {
  assert.equal((await detect(`git log --oneline | grep feat`)).blocked, false);
});

test("allows quoted string containing grep command text", async () => {
  assert.equal((await detect(`echo "use grep -rn here"`)).blocked, false);
});

test("allows non-recursive -q existence check", async () => {
  assert.equal(
    (await detect(`grep -q "foo" package.json && echo found`)).blocked,
    false,
  );
});

test("allows combined non-recursive -q check (-qn)", async () => {
  assert.equal((await detect(`grep -qn foo package.json`)).blocked, false);
});

test("allows find -delete cleanup", async () => {
  assert.equal((await detect(`find tmp -type f -delete`)).blocked, false);
});

test("allows find -exec rm (non-search maintenance)", async () => {
  assert.equal((await detect(`find tmp -name "*.log" -exec rm {} \\;`)).blocked, false);
});

test("allows grep when grep tool inactive", async () => {
  assert.equal((await detect(`grep -rn "foo" .`, ["bash", "read"])).blocked, false);
});

test("allows find when find tool inactive", async () => {
  assert.equal((await detect(`find . -name "*.ts"`, ["bash", "read"])).blocked, false);
});

test("allows semicolons inside quotes as data", async () => {
  assert.equal((await detect(`echo "a;b|c"; ls -la`)).blocked, false);
});

// ---------------------------------------------------------------------------
// Extension hook behavior (lightweight ExtensionAPI mock)
// ---------------------------------------------------------------------------

type Handler = (event: any) => any;

async function getHooks() {
  const hooks: Record<string, Handler[]> = { before_agent_start: [], tool_call: [] };
  const pi = {
    on: (event: string, handler: Handler) => {
      hooks[event] = hooks[event] ?? [];
      hooks[event].push(handler);
      return () => {};
    },
    getActiveTools: () => ["bash", "grep", "find", "read"],
  } as any;

  const mod = await loadExtensionModule();
  mod.default(pi);
  return { hooks, mod };
}

test("before_agent_start rewrites bash snippet and appends deduped guideline", async () => {
  const { hooks } = await getHooks();
  const event = {
    type: "before_agent_start",
    systemPromptOptions: {
      selectedTools: ["bash", "read", "grep", "find"],
      toolSnippets: { bash: "Execute shell commands" },
      promptGuidelines: ["Existing guideline"],
    },
  };
  hooks.before_agent_start[0](event);
  assert.equal(
    event.systemPromptOptions.toolSnippets.bash,
    "Execute shell commands (git, build, test, sed; NOT for repo grep/rg/find)",
  );
  assert.equal(event.systemPromptOptions.promptGuidelines.length, 2);
  assert.match(
    event.systemPromptOptions.promptGuidelines[1],
    /NEVER use bash to run grep/,
  );

  // Second run on the same event: guideline is deduped, not appended again
  hooks.before_agent_start[0](event);
  assert.equal(event.systemPromptOptions.promptGuidelines.length, 2);
});

test("before_agent_start no-ops when bash tool not selected", async () => {
  const { hooks } = await getHooks();
  const event = {
    type: "before_agent_start",
    systemPromptOptions: {
      selectedTools: ["read", "grep"],
      toolSnippets: { bash: "Execute shell commands" },
      promptGuidelines: [] as string[],
    },
  };
  hooks.before_agent_start[0](event);
  assert.equal(event.systemPromptOptions.toolSnippets.bash, "Execute shell commands");
  assert.equal(event.systemPromptOptions.promptGuidelines.length, 0);
});

test("tool_call blocks a blocked bash command with reason", async () => {
  const { hooks } = await getHooks();
  const event = {
    type: "tool_call",
    toolCallId: "t1",
    toolName: "bash",
    input: { command: `grep -rn "secret" .` },
  };
  const result = hooks.tool_call[0](event);
  assert.ok(result);
  assert.equal(result.block, true);
  assert.match(result.reason, /bash-search-guard/);
});

test("tool_call passes through allowed commands", async () => {
  const { hooks } = await getHooks();
  const event = {
    type: "tool_call",
    toolCallId: "t2",
    toolName: "bash",
    input: { command: "git log --oneline | grep fix" },
  };
  const result = hooks.tool_call[0](event);
  assert.equal(result, undefined);
});
