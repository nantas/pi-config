/**
 * just-agent-lab-policy — pure policy functions for the just tool and trace.
 *
 * Zero external imports (node builtins only) so tests can import this module
 * directly with Node type stripping. The extension shell (just-agent-lab.ts)
 * re-exports nothing from here except through its own behavior.
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Flag policy
// ---------------------------------------------------------------------------

/** Tokens starting with `-` are treated as raw Just CLI flag injection. Default deny. */
export function findFlagViolations(tokens: string[]): string[] {
  return tokens.filter((t) => typeof t === "string" && t.startsWith("-"));
}

// ---------------------------------------------------------------------------
// Dump parsing / approval policy
// ---------------------------------------------------------------------------

export interface RecipeInfo {
  approved: boolean;
  private: boolean;
  doc: string | null;
  parameterNames: string[];
}

/** Parse `just --dump --dump-format json` output into recipe info. */
export function parseJustDump(stdout: string): Map<string, RecipeInfo> {
  const parsed = JSON.parse(stdout) as {
    recipes?: Record<string, Record<string, unknown>>;
  };
  const result = new Map<string, RecipeInfo>();
  for (const [name, recipe] of Object.entries(parsed.recipes ?? {})) {
    const attributes = (recipe.attributes ?? []) as Array<Record<string, unknown>>;
    const approved = attributes.some(
      (a) => Array.isArray(a.metadata) && (a.metadata as unknown[]).includes("agent:approved"),
    );
    const parameters = (recipe.parameters ?? []) as Array<Record<string, unknown>>;
    result.set(name, {
      approved,
      private: Boolean(recipe.private),
      doc: (recipe.doc as string | null) ?? null,
      parameterNames: parameters.map((p) => String(p.name ?? "?")),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Trace redaction / summarization
// ---------------------------------------------------------------------------

const ARG_SUMMARY_MAX_LEN = 160;
const ARG_SUMMARY_MAX_ITEMS = 12;

const SENSITIVE_KEY = /token|secret|password|apikey|api_key|authorization|credential|cookie/i;

function redactValue(value: unknown, depth = 0): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    const s = value.length > ARG_SUMMARY_MAX_LEN ? value.slice(0, ARG_SUMMARY_MAX_LEN) + "…" : value;
    return s.replace(/\n/g, "\\n");
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (depth >= 2) return "…";
  if (Array.isArray(value)) {
    const items = value.slice(0, 4).map((v) => redactValue(v, depth + 1)).join(",");
    return "[" + items + (value.length > 4 ? ",…" : "") + "]";
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, ARG_SUMMARY_MAX_ITEMS);
    const body = entries
      .map(([k, v]) => `${k}:${SENSITIVE_KEY.test(k) ? "[redacted]" : redactValue(v, depth + 1)}`)
      .join(",");
    return "{" + body + "}";
  }
  return String(value);
}

/** Redacted, truncated argument summary for trace records. Never copies full content. */
export function summarizeArgs(args: unknown): string {
  if (args === undefined || args === null) return "";
  return redactValue(args);
}

/** Extract file-ish paths from tool args for the trace record (heuristic, capped). */
export function extractPaths(args: unknown): string[] {
  const paths: string[] = [];
  const visit = (v: unknown, depth: number) => {
    if (paths.length >= 8 || depth > 2 || v === null || typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const item of v.slice(0, 8)) visit(item, depth + 1);
      return;
    }
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string" && (k === "file" || k === "path" || k.endsWith("_path") || k.endsWith("Path"))) {
        paths.push(val.length > 200 ? val.slice(0, 200) + "…" : val);
      } else {
        visit(val, depth + 1);
      }
      if (paths.length >= 8) return;
    }
  };
  visit(args, 0);
  return paths;
}

// ---------------------------------------------------------------------------
// Run id / bundle artifacts
// ---------------------------------------------------------------------------

export function newRunId(date = new Date(), pid = process.pid): string {
  const iso = date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `${iso}-${pid.toString(36)}`;
}

export interface TraceRecord {
  ts: string;
  tool: string;
  argsSummary: string;
  paths: string[];
  status: "ok" | "error" | "cancelled";
  durationMs: number;
}

/** Append one JSONL trace record into the bundle dir (creates it if needed). */
export function appendTraceRecord(dir: string, record: TraceRecord): string {
  mkdirSync(dir, { recursive: true });
  const line = JSON.stringify(record) + "\n";
  const file = join(dir, "trace.jsonl");
  appendFileSync(file, line, "utf8");
  return file;
}

/** Write a candidate recipe proposal into the bundle's recipe-proposals dir. Never touches the formal justfile. */
export function proposeRecipe(source: string, baseDir: string): string {
  const dir = join(baseDir, "recipe-proposals");
  mkdirSync(dir, { recursive: true });
  const existing = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".just")).length : 0;
  const name = `proposal-${String(existing + 1).padStart(2, "0")}.just`;
  const path = join(dir, name);
  writeFileSync(path, source, "utf8");
  return path;
}
