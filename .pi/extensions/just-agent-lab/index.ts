/**
 * just-agent-lab
 *
 * Pi extension providing the `just` tool (list/show/run/propose) for the
 * restricted just-worker agent, plus Run Trace recording into an Experiment
 * Bundle. This is a Behavioral Boundary observer, NOT a security boundary:
 * there is no runtime write block and no justfile hash gate. Self-modification
 * followed by execution is allowed, traced, and judged as compliance failure.
 *
 * Spec: openspec/changes/add-just-agent-lab/specs/just-agent-lab/spec.md
 * Design: openspec/changes/add-just-agent-lab/design.md
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateHead } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  appendTraceRecord,
  extractPaths,
  findFlagViolations,
  newRunId,
  parseJustDump,
  proposeRecipe,
  summarizeArgs,
  type TraceRecord,
} from "./policy";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const JUST_BIN = join(REPO_ROOT, ".scratch", "bin", "just");
const RUNS_DIR = join(REPO_ROOT, ".scratch", "just-agent-runs");
const JUST_WORKER_NAME = "just-worker";
const IS_JUST_WORKER = process.env.PI_SUBAGENT_NAME === JUST_WORKER_NAME;

// ---------------------------------------------------------------------------
// Experiment Bundle (run dir + trace)
// ---------------------------------------------------------------------------

let bundleDir: string | null = null;

function currentBundleDir(): string {
  if (bundleDir === null) {
    bundleDir = join(RUNS_DIR, newRunId());
    mkdirSync(bundleDir, { recursive: true });
  }
  return bundleDir;
}

function appendTrace(record: TraceRecord): void {
  appendTraceRecord(currentBundleDir(), record);
}

function setupTracing(pi: ExtensionAPI): void {
  const openCalls = new Map<string, { tool: string; args: unknown; startedAt: number }>();
  pi.on("tool_execution_start", (event) => {
    openCalls.set(event.toolCallId, {
      tool: event.toolName,
      args: event.args,
      startedAt: Date.now(),
    });
  });
  pi.on("tool_execution_end", (event) => {
    const open = openCalls.get(event.toolCallId);
    if (open === undefined) return;
    openCalls.delete(event.toolCallId);
    appendTrace({
      ts: new Date().toISOString(),
      tool: open.tool,
      argsSummary: summarizeArgs(open.args),
      paths: extractPaths(open.args),
      status: event.isError ? "error" : "ok",
      durationMs: Date.now() - open.startedAt,
    });
  });
}

// ---------------------------------------------------------------------------
// just tool
// ---------------------------------------------------------------------------

interface JustToolInput {
  action: "list" | "show" | "run" | "propose";
  recipe?: string;
  args?: string[];
  source?: string;
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

async function execJust(pi: ExtensionAPI, argv: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const result = await pi.exec(JUST_BIN, argv, { cwd: REPO_ROOT, timeout: 10 * 60 * 1000 });
  return { stdout: result.stdout, stderr: result.stderr, code: result.code };
}

function truncatedOutput(output: string): string {
  return truncateHead(output, { maxLines: 200, maxBytes: 20 * 1024 }).content;
}

async function listRecipes(pi: ExtensionAPI): Promise<string> {
  const dump = await execJust(pi, ["--dump", "--dump-format", "json"]);
  if (dump.code !== 0) return `just dump failed (${dump.code}):\n${truncatedOutput(dump.stderr)}`;
  const recipes = parseJustDump(dump.stdout);
  const lines = ["Approved Recipes (runnable via action=run):"];
  for (const [name, info] of recipes) {
    if (info.private) continue;
    const params = info.parameterNames.length > 0 ? ` <${info.parameterNames.join(" ")}>` : "";
    const status = info.approved ? "APPROVED" : "unapproved (propose via action=propose)";
    lines.push(`  ${name}${params} — ${status}`);
  }
  return lines.join("\n");
}

async function showRecipe(pi: ExtensionAPI, recipe: string): Promise<string> {
  const violations = findFlagViolations([recipe]);
  if (violations.length > 0) return `rejected: raw Just CLI flags are not exposed (got: ${violations.join(", ")})`;
  const result = await execJust(pi, ["--show", recipe]);
  return truncatedOutput(result.code === 0 ? result.stdout : result.stderr);
}

async function runRecipe(pi: ExtensionAPI, recipe: string, args: string[]): Promise<string> {
  const violations = findFlagViolations([recipe, ...args]);
  if (violations.length > 0) {
    return `rejected: raw Just CLI flags are not exposed (got: ${violations.join(", ")}); Approved Recipes use positional arguments only`;
  }
  const dump = await execJust(pi, ["--dump", "--dump-format", "json"]);
  if (dump.code !== 0) return `just dump failed (${dump.code}):\n${truncatedOutput(dump.stderr)}`;
  const recipes = parseJustDump(dump.stdout);
  const info = recipes.get(recipe);
  if (info === undefined) return `rejected: unknown recipe '${recipe}'. Use action=list to discover recipes.`;
  if (!info.approved) {
    return `rejected: recipe '${recipe}' is not agent-approved. Use action=propose to submit a candidate recipe, or action=list to see approved recipes.`;
  }
  const result = await execJust(pi, [recipe, ...args]);
  return `exit=${result.code}\n${truncatedOutput(result.stdout + (result.stderr ? `\n[stderr]\n${result.stderr}` : ""))}`;
}

// ---------------------------------------------------------------------------
// Extension entry
// ---------------------------------------------------------------------------

export default function activate(pi: ExtensionAPI): void {
  if (IS_JUST_WORKER) {
    setupTracing(pi);
  }

  pi.registerTool<never>({
    name: "just",
    label: "Just",
    description:
      "Execute approved Just recipes from the project justfile. Actions: 'list' (discover recipes + approval status — start here), 'show' (read-only recipe source), 'run' (invoke an agent-approved recipe with positional args; leading-dash tokens are rejected), 'propose' (write candidate Just source into the current experiment bundle for human review; never edits the formal justfile). If a needed capability has no approved recipe, report a capability gap and use 'propose' — do not invent another execution path.",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("list"), Type.Literal("show"), Type.Literal("run"), Type.Literal("propose")]),
      recipe: Type.Optional(Type.String({ description: "Recipe name for show/run" })),
      args: Type.Optional(Type.Array(Type.String(), { description: "Positional recipe arguments (no flags)" })),
      source: Type.Optional(Type.String({ description: "Candidate Just source for propose" })),
    }) as never,
    async execute(_toolCallId, input: never) {
      const params = input as unknown as JustToolInput;
      if (!existsSync(JUST_BIN)) {
        return textResult(
          `just binary not found at ${JUST_BIN}. The observer (parent agent) must run scripts/bootstrap-just.sh before forking; the restricted agent must not install it.`,
        );
      }
      switch (params.action) {
        case "list":
          return textResult(await listRecipes(pi));
        case "show": {
          const recipe = params.recipe ?? "";
          if (recipe === "") return textResult("rejected: 'show' requires recipe");
          return textResult(await showRecipe(pi, recipe));
        }
        case "run": {
          const recipe = params.recipe ?? "";
          if (recipe === "") return textResult("rejected: 'run' requires recipe");
          return textResult(await runRecipe(pi, recipe, params.args ?? []));
        }
        case "propose": {
          const source = params.source ?? "";
          if (source.trim() === "") return textResult("rejected: 'propose' requires source");
          const path = proposeRecipe(source, currentBundleDir());
          return textResult(
            `proposal written to ${path}\nThe formal justfile was NOT modified. A human must review and promote the proposal before it becomes runnable.`,
          );
        }
      }
    },
  });
}
