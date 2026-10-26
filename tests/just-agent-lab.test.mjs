/**
 * just-agent-lab.test.mjs — focused tests for the Just tool policy layer and
 * trace/bundle artifacts. Imports the zero-dependency policy module directly.
 *
 * Run: node --test tests/just-agent-lab.test.mjs
 * (via Approved Recipe: just test)
 */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  appendTraceRecord,
  extractPaths,
  findFlagViolations,
  newRunId,
  parseJustDump,
  proposeRecipe,
  summarizeArgs,
} from "../.pi/extensions/just-agent-lab/policy.ts";

// ---------------------------------------------------------------------------
// Flag policy — default deny on raw Just CLI flags
// ---------------------------------------------------------------------------

test("findFlagViolations rejects dangerous Just CLI flags", () => {
  const violations = findFlagViolations(["-c", "--command", "--yes", "-s", "--shell", "--chooser", "--evaluate", "--edit", "--init"]);
  assert.equal(violations.length, 9);
});

test("findFlagViolations allows recipe names, paths and positional args", () => {
  assert.deepEqual(findFlagViolations(["check-extension", ".pi/extensions/x.ts", "../foo.ts", "a b"]), []);
});

// ---------------------------------------------------------------------------
// Dump parsing / approval policy
// ---------------------------------------------------------------------------

const DUMP = JSON.stringify({
  first: "t1",
  recipes: {
    t1: {
      attributes: [{ metadata: ["agent:approved"] }],
      parameters: [{ name: "path" }],
      private: false,
      doc: "t1",
    },
    t2: { attributes: [], parameters: [], private: false, doc: "t2" },
    hidden: { attributes: [{ metadata: ["agent:approved"] }], parameters: [], private: true, doc: null },
  },
});

test("parseJustDump marks only agent:approved recipes as approved (default deny)", () => {
  const recipes = parseJustDump(DUMP);
  assert.equal(recipes.get("t1").approved, true);
  assert.equal(recipes.get("t2").approved, false);
  assert.equal(recipes.get("hidden").approved, true);
  assert.equal(recipes.get("hidden").private, true);
  assert.deepEqual(recipes.get("t1").parameterNames, ["path"]);
});

test("parseJustDump marks recipes without attributes as unapproved", () => {
  const recipes = parseJustDump(JSON.stringify({ recipes: { bare: {} } }));
  assert.equal(recipes.get("bare").approved, false);
});

// ---------------------------------------------------------------------------
// Trace redaction / summarization
// ---------------------------------------------------------------------------

test("summarizeArgs redacts sensitive keys and truncates long values", () => {
  const summary = summarizeArgs({
    api_token: "super-secret-value",
    password: "hunter2",
    path: "/repo/.pi/extensions/x.ts",
    command: "x".repeat(500),
    nested: { Authorization: "Bearer xyz", ok: 1 },
  });
  assert.ok(!summary.includes("super-secret-value"));
  assert.ok(!summary.includes("hunter2"));
  assert.ok(!summary.includes("Bearer xyz"));
  assert.ok(summary.includes("[redacted]"));
  assert.ok(summary.length < 600);
  assert.ok(!summary.includes("\n"));
});

test("summarizeArgs caps arrays and depth", () => {
  const summary = summarizeArgs({ files: Array.from({ length: 20 }, (_, i) => `f${i}`), deep: { a: { b: { c: "x" } } } });
  assert.ok(summary.includes("…"));
  assert.ok(!summary.includes("f10"));
});

test("extractPaths picks file-ish keys, capped at 8", () => {
  const paths = extractPaths({ file: "a.ts", out_path: "b.md", name: "nope", more: Array.from({ length: 12 }, (_, i) => ({ path: `p${i}` })) });
  assert.ok(paths.includes("a.ts"));
  assert.ok(paths.includes("b.md"));
  assert.ok(!paths.includes("nope"));
  assert.ok(paths.length <= 8);
});

test("newRunId format is sortable and filesystem-safe", () => {
  const id = newRunId(new Date("2026-02-26T10:20:30.400Z"), 12345);
  assert.match(id, /^20260226T102030Z-/);
  assert.ok(!id.includes(":"));
});

// ---------------------------------------------------------------------------
// Trace JSONL + bundle artifacts (tmpdir)
// ---------------------------------------------------------------------------

test("appendTraceRecord writes one JSON line with all required fields", () => {
  const dir = mkdtempSync(join(tmpdir(), "just-agent-lab-"));
  try {
    const file = appendTraceRecord(dir, {
      ts: "2026-02-26T10:20:30.000Z",
      tool: "just",
      argsSummary: "{action:run,recipe:test}",
      paths: [],
      status: "ok",
      durationMs: 42,
    });
    const lines = readFileSync(file, "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.deepEqual(Object.keys(record).sort(), ["argsSummary", "durationMs", "paths", "status", "tool", "ts"]);
    appendTraceRecord(dir, { ts: "2026-02-26T10:20:31.000Z", tool: "read", argsSummary: "{}", paths: ["a"], status: "error", durationMs: 1 });
    assert.equal(readFileSync(file, "utf8").trim().split("\n").length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("proposeRecipe writes only into the bundle, never the formal justfile", () => {
  const dir = mkdtempSync(join(tmpdir(), "just-agent-lab-"));
  const formalJustfile = join(dir, "justfile-content-sentinel");
  try {
    const formalBefore = "FORMAL-JUSTFILE-SENTINEL";
    writeFileSync(formalJustfile, formalBefore, "utf8");
    const p1 = proposeRecipe("# candidate\nfoo:\n  echo hi\n", dir);
    const p2 = proposeRecipe("# second\nbar:\n  echo bye\n", dir);
    assert.ok(p1.startsWith(join(dir, "recipe-proposals")));
    assert.match(p1, /proposal-01\.just$/);
    assert.match(p2, /proposal-02\.just$/);
    assert.equal(readFileSync(p1, "utf8"), "# candidate\nfoo:\n  echo hi\n");
    // formal justfile untouched
    assert.equal(readFileSync(formalJustfile, "utf8"), formalBefore);
    assert.ok(statSync(p1).isFile());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
