import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildDispatchToolDescription,
  buildDispatchUserMessage,
  formatDispatchSyncText,
  buildMissingAgentDiagnostic,
  shouldSkipGlobalDispatchExtensionRegistration,
  sanitizeAgentDefinition,
  normalizeProjectContext,
  normalizeSkillNames,
  serializeTaskPlan,
  summarizeDispatchResult,
} from "../.pi/extensions/subagent-dispatch/core.js";

test("normalizeSkillNames accepts string, array, and false", () => {
  assert.deepEqual(normalizeSkillNames("obsidian-cli"), ["obsidian-cli"]);
  assert.deepEqual(normalizeSkillNames(["obsidian-cli", " safe-bash "]), [
    "obsidian-cli",
    "safe-bash",
  ]);
  assert.equal(normalizeSkillNames(false), false);
  assert.equal(normalizeSkillNames(undefined), undefined);
});

test("normalizeProjectContext uses agent default when task leaves it at default", () => {
  assert.deepEqual(
    normalizeProjectContext("default", { inheritProjectContext: true }),
    { requested: "default", effective: "inherit" }
  );
  assert.deepEqual(
    normalizeProjectContext(undefined, { inheritProjectContext: false }),
    { requested: "default", effective: "strip" }
  );
});

test("serializeTaskPlan keeps user entry simple but preserves internal planning fields", () => {
  const plan = serializeTaskPlan(
    {
      agent: "vault-search",
      task: "Search harness pages",
      projectContext: "inherit",
      context: "fresh",
      skills: "obsidian-cli",
      reads: ["AGENTS.md"],
      model: "openai/gpt-5",
      cwd: "/vault",
    },
    {
      name: "vault-search",
      cwd: ".",
      systemPromptMode: "replace",
      tools: ["read", "bash"],
      extensions: [],
      inheritProjectContext: true,
      inheritSkills: false,
      skills: ["obsidian-cli"],
    },
    "run-1",
    "1"
  );

  assert.equal(plan.agent, "vault-search");
  assert.equal(plan.context, "fresh");
  assert.equal(plan.cwd, "/vault");
  assert.deepEqual(plan.reads, ["AGENTS.md"]);
  assert.deepEqual(plan.skills, ["obsidian-cli"]);
  assert.equal(plan.model, "openai/gpt-5");
  assert.deepEqual(plan.projectContext, {
    requested: "inherit",
    effective: "inherit",
  });
});

test("buildDispatchUserMessage keeps /dispatch natural-language", () => {
  const message = buildDispatchUserMessage("请启动三个 subagent 搜索 harness", [
    {
      name: "scout",
      source: "builtin",
      description: "Fast codebase recon",
    },
  ]);
  assert.equal(Array.isArray(message), true);
  assert.match(message[0].text, /repository-owned dispatch tool/i);
  assert.match(message[1].text, /Available dispatch agents right now/i);
  assert.match(message[1].text, /scout \(builtin\)/i);
  assert.match(message[2].text, /请启动三个 subagent 搜索 harness/);
});

test("sanitizeAgentDefinition drops empty extensions placeholders", () => {
  const agent = sanitizeAgentDefinition({
    name: "dispatch-planner",
    extensions: ["[]"],
  });

  assert.equal(agent.extensions, undefined);
});

test("buildDispatchToolDescription warns against inventing agent names", () => {
  const description = buildDispatchToolDescription([
    {
      name: "delegate",
      source: "builtin",
      description: "Lightweight subagent",
    },
    {
      name: "code-writer",
      source: "user",
      description: "Repository-local implementation agent",
    },
  ]);

  assert.match(description, /do not invent agent names/i);
  assert.match(description, /delegate \(builtin\)/i);
  assert.match(description, /code-writer \(user\)/i);
});

test("buildMissingAgentDiagnostic lists available agents", () => {
  const diagnostic = buildMissingAgentDiagnostic("agent", [
    { name: "delegate" },
    { name: "scout" },
  ]);

  assert.match(diagnostic.summary, /Available agents: delegate, scout/);
  assert.match(diagnostic.error, /Missing agent in dispatch scope: agent/);
});

test("summarizeDispatchResult falls back to artifact output when finalOutput is empty", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dispatch-core-test-"));
  const outputPath = path.join(tempDir, "output.md");
  fs.writeFileSync(outputPath, "Top-5 pages:\n1. Harness Overview\n2. Harness FAQ\n", "utf-8");

  assert.match(
    summarizeDispatchResult({
      artifactPaths: { outputPath },
    }),
    /Top-5 pages: 1\. Harness Overview 2\. Harness FAQ/
  );
});

test("formatDispatchSyncText includes child outputs and export paths", () => {
  const text = formatDispatchSyncText({
    runId: "run-123",
    mode: "sync",
    aggregateSummary: "Completed 2/2 tasks; failed 0; detached 0.",
    results: [
      {
        taskId: "1",
        agent: "scout",
        status: "completed",
        finalOutput: "Top-5 harness pages",
        artifactPaths: { outputPath: "/tmp/task1_output.md" },
        sessionFile: "/tmp/task1.jsonl",
        savedOutputPath: "/tmp/task1.saved.md",
        summary: "Top-5 harness pages",
      },
      {
        taskId: "2",
        agent: "scout",
        status: "completed",
        finalOutput: "Top-5 codex pages",
        summary: "Top-5 codex pages",
      },
    ],
  });

  assert.match(text, /dispatch run-123 \(sync\)/);
  assert.match(text, /Completed 2\/2 tasks/);
  assert.match(text, /Task 1: scout \(COMPLETED\)/);
  assert.match(text, /Top-5 harness pages/);
  assert.match(text, /Artifact output: `\/tmp\/task1_output\.md`/);
  assert.match(text, /Saved output: `\/tmp\/task1\.saved\.md`/);
  assert.match(text, /Session: `\/tmp\/task1\.jsonl`/);
  assert.match(text, /Task 2: scout \(COMPLETED\)/);
  assert.doesNotMatch(text, /status handle/i);
});

test("global extension yields to project-local copy in pi-config repo", () => {
  assert.equal(
    shouldSkipGlobalDispatchExtensionRegistration({
      extensionFile: "/Users/nantasmac/.pi/agent/extensions/subagent-dispatch/index.ts",
      cwd: "/Users/nantasmac/projects/pi-config",
    }),
    true
  );
});

test("project-local extension does not skip itself", () => {
  assert.equal(
    shouldSkipGlobalDispatchExtensionRegistration({
      extensionFile: "/Users/nantasmac/projects/pi-config/.pi/extensions/subagent-dispatch/index.ts",
      cwd: "/Users/nantasmac/projects/pi-config",
    }),
    false
  );
});
