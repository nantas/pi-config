#!/usr/bin/env node
/**
 * Regression check: obsidian-tools rg fallback resolves rg on Windows.
 *
 * Loads the real search-tool.ts and runs a zero-match query, which forces
 * the rg fallback path (FFF returns no hits). Before the fix, every scope
 * warned "rg (ripgrep) not found" because resolveRgPath() only had
 * macOS candidates. After the fix, rg must be found (no not-found warns).
 *
 * Usage: node scripts/obsidian-rg-check.mjs [vaultPath]
 * Exit 0 = pass, 1 = fail.
 */
const PI_ROOT = "C:/Users/nanta/.pi/agent/install/releases/1.4.0/node_modules";
const EXT = new URL("../.pi/extensions/obsidian-tools/search-tool.ts", import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, "$1");
const VAULT = process.argv[2] ?? "D:/Projects/my-wiki";

const { createRequire } = await import("node:module");
const req = createRequire(PI_ROOT + "/jiti/package.json");
const { createJiti } = req("jiti");
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { typebox: PI_ROOT + "/typebox/build/index.mjs" },
});
const { searchToolDefinition } = jiti(EXT);

const warnLines = [];
const origWarn = console.warn;
console.warn = (...a) => warnLines.push(a.join(" "));

const res = await searchToolDefinition.execute(
  "rg-check",
  { query: "zzqqxxwv_regression_notexist", vault: VAULT, mode: "fast" },
  undefined, undefined, undefined,
);

const text = res.content?.[0]?.text ?? "";
const backend = text.match(/\*\*Backend:\*\* (\w+)/)?.[1] ?? "?";
const notFound = warnLines.filter(l => l.includes("rg (ripgrep) not found"));

origWarn("backend:", backend, "| not-found warns:", notFound.length, "| ok:", res.details?.ok);

if (notFound.length > 0) {
  origWarn("FAIL: rg fallback still cannot resolve rg:", notFound[0]);
  process.exit(1);
}
if (backend !== "rg") {
  origWarn(`FAIL: expected rg fallback backend, got "${backend}"`);
  process.exit(1);
}
origWarn("PASS: rg fallback resolved rg and ran without not-found errors");
