/**
 * trellis-analytics.test.ts — Tests for pure utility functions of the extension.
 *
 * Run with:
 *   npx tsx .pi/extensions/trellis-analytics.test.ts
 *
 * Covers: extractSkillFromPath, extractPhase, extractInjectedFiles,
 * extractModeMap, extractBoundChange, extractInvokeTargets,
 * extractReferences, matchReference
 */

// ---------------------------------------------------------------------------
// Pure function replicas (copy from trellis-analytics.ts, no Pi dependency)
// ---------------------------------------------------------------------------

import * as path from "node:path";

function extractSkillFromPath(filePath: string): { skill: string; namespace: string } | null {
  const match = filePath.match(
    /(?:\.agents|\.pi)\/skills\/([^/]+)\/([^/]+)\/SKILL\.md$/
  );
  if (match) {
    return { namespace: match[1], skill: `${match[1]}/${match[2]}` };
  }
  const flatMatch = filePath.match(
    /(?:\.agents|\.pi)\/skills\/([^/]+)\/SKILL\.md$/
  );
  if (flatMatch) {
    return { namespace: flatMatch[1], skill: flatMatch[1] };
  }
  return null;
}

function extractPhase(command: string): string | null {
  const match = command.match(/trellis-load-phase-context\s+--phase\s+(\w+)/);
  return match ? match[1] : null;
}

function extractInjectedFiles(output: string): string[] {
  const files: string[] = [];
  const regex = /^=== (.+?) ===$/gm;
  let m;
  while ((m = regex.exec(output)) !== null) {
    files.push(m[1].trim());
  }
  return [...new Set(files)];
}

function extractModeMap(output: string): Record<string, string[]> {
  const modeMap: Record<string, string[]> = {};
  const lines = output.split("\n");
  let currentMode = "";
  for (const line of lines) {
    const modeMatch = line.match(/^\[trellis-mode:(\w+)\]/);
    if (modeMatch) {
      currentMode = modeMatch[1];
      if (!modeMap[currentMode]) modeMap[currentMode] = [];
      continue;
    }
    if (currentMode) {
      const fileMatch = line.match(/^=== (.+?) ===$/);
      if (fileMatch) {
        modeMap[currentMode].push(fileMatch[1].trim());
      }
    }
  }
  return modeMap;
}

function extractBoundChange(output: string): {
  change_id: string;
  schema: string;
  path: string;
  next_stage: string;
  bridge_workflow: string;
} | null {
  const match = output.match(
    /\[trellis-bound-change\]\s+change_id=(\S+)\s+schema=(\S+)\s+path=(\S+)\s+next_stage=(\S+)\s+bridge_workflow=(\S+)/
  );
  if (!match) return null;
  return {
    change_id: match[1],
    schema: match[2],
    path: match[3],
    next_stage: match[4],
    bridge_workflow: match[5],
  };
}

function extractInvokeTargets(output: string): string[] {
  const targets: string[] = [];
  const lines = output.split("\n");
  let inInvoke = false;
  for (const line of lines) {
    if (line.match(/^\[trellis-mode:invoke\]/)) {
      inInvoke = true;
      continue;
    }
    if (line.match(/^\[trellis-mode:/)) {
      inInvoke = false;
      continue;
    }
    if (inInvoke) {
      const fileMatch = line.match(/^=== (.+?) ===$/);
      if (fileMatch) {
        targets.push(fileMatch[1].trim());
      }
    }
  }
  return targets;
}

function extractReferences(
  output: string,
  injectedFiles: Set<string>,
  knownSkillNames: ReadonlySet<string>
): { ref: string; type: "file" | "skill" }[] {
  const refs: { ref: string; type: "file" | "skill" }[] = [];
  const seen = new Set<string>();

  const fileRegex = /\b[\w./-]+\.(md|yaml|json|ts|cs)\b/g;
  let m;
  while ((m = fileRegex.exec(output)) !== null) {
    const ref = m[0];
    if (!seen.has(ref) && !injectedFiles.has(ref)) {
      seen.add(ref);
      refs.push({ ref, type: "file" });
    }
  }

  for (const skillName of knownSkillNames) {
    if (output.includes(skillName) && !seen.has(skillName)) {
      seen.add(skillName);
      refs.push({ ref: skillName, type: "skill" });
    }
  }

  return refs;
}

function matchReference(filePath: string, ref: string): boolean {
  const nPath = filePath.replace(/\\/g, "/");
  const nRef = ref.replace(/\\/g, "/");

  // Exact match
  if (nPath === nRef) return true;

  // Suffix match with path-boundary guard
  const suffixCheck = (longer: string, shorter: string): boolean => {
    if (!longer.endsWith(shorter)) return false;
    const boundaryIdx = longer.length - shorter.length - 1;
    const boundary = longer[boundaryIdx];
    return boundary === undefined || boundary === "/";
  };
  if (suffixCheck(nPath, nRef) || suffixCheck(nRef, nPath)) return true;

  const basePath = path.basename(nPath);
  const baseRef = path.basename(nRef);
  if (basePath === baseRef) return true;

  if (nPath.includes("/" + nRef) || nRef.includes("/" + nPath)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    console.error(`    expected: ${e}`);
    console.error(`    actual:   ${a}`);
    failed++;
  }
}

function group(name: string, fn: () => void) {
  console.log(`\n### ${name}`);
  fn();
}

// ---------------------------------------------------------------------------
// Tests: extractSkillFromPath
// ---------------------------------------------------------------------------

group("extractSkillFromPath", () => {
  assertEqual(
    extractSkillFromPath(".agents/skills/trellis/trellis-start/SKILL.md"),
    { namespace: "trellis", skill: "trellis/trellis-start" },
    "nested trellis skill"
  );

  assertEqual(
    extractSkillFromPath(".agents/skills/gitnexus/gitnexus-debugging/SKILL.md"),
    { namespace: "gitnexus", skill: "gitnexus/gitnexus-debugging" },
    "nested gitnexus skill"
  );

  assertEqual(
    extractSkillFromPath(".agents/skills/close-task/SKILL.md"),
    { namespace: "close-task", skill: "close-task" },
    "flat skill at .agents/skills/"
  );

  assertEqual(
    extractSkillFromPath(".pi/skills/pkg-research/SKILL.md"),
    { namespace: "pkg-research", skill: "pkg-research" },
    "flat skill at .pi/skills/"
  );

  assertEqual(
    extractSkillFromPath("/absolute/path/.agents/skills/trellis/trellis-start/SKILL.md"),
    { namespace: "trellis", skill: "trellis/trellis-start" },
    "absolute path with nested skill"
  );

  assert(
    extractSkillFromPath("README.md") === null,
    "non-skill path returns null"
  );

  assert(
    extractSkillFromPath("src/utils/helpers.ts") === null,
    "non-SKILL.md file returns null"
  );
});

// ---------------------------------------------------------------------------
// Tests: extractPhase
// ---------------------------------------------------------------------------

group("extractPhase", () => {
  assertEqual(
    extractPhase("python3 .agents/bin/trellis-load-phase-context --phase implement"),
    "implement",
    "--phase implement"
  );

  assertEqual(
    extractPhase("python3 .agents/bin/trellis-load-phase-context --phase check"),
    "check",
    "--phase check"
  );

  assertEqual(
    extractPhase("python3 .agents/bin/trellis-load-phase-context --phase debug --task-dir ."),
    "debug",
    "--phase debug with extra args"
  );

  assert(
    extractPhase("python3 scripts/build.py") === null,
    "non-trellis command returns null"
  );

  assertEqual(
    extractPhase(".agents/bin/trellis-load-phase-context --phase implement"),
    "implement",
    "without python3 prefix"
  );
});

// ---------------------------------------------------------------------------
// Tests: extractInjectedFiles
// ---------------------------------------------------------------------------

group("extractInjectedFiles", () => {
  const output = `[trellis-mode:knowledge]  some header
  entries: 3

=== .trellis/spec/guides/task-contract.md ===
content here

=== AiDoc/tech/architecture/index.md ===
more content

=== prd.md ===
PRD content
`;

  const files = extractInjectedFiles(output);
  assertEqual(files, [
    ".trellis/spec/guides/task-contract.md",
    "AiDoc/tech/architecture/index.md",
    "prd.md",
  ], "extracts all three ====== file headers");

  assertEqual(
    extractInjectedFiles("no markers here"),
    [],
    "empty output returns empty list"
  );

  assertEqual(
    extractInjectedFiles(""),
    [],
    "empty string returns empty list"
  );
});

// ---------------------------------------------------------------------------
// Tests: extractModeMap
// ---------------------------------------------------------------------------

group("extractModeMap", () => {
  const output = `[trellis-phase:implement] injected_files=3

[trellis-mode:routing]  路由决策表
  entries: 1

=== routing/guide.md ===
routing content

[trellis-mode:contract]  硬约束契约
  entries: 1

=== contract/rules.md ===
contract content

[trellis-mode:knowledge]  背景信息
  entries: 1

=== knowledge/ref.md ===
ref content
`;

  const modeMap = extractModeMap(output);
  assertEqual(
    Object.keys(modeMap),
    ["routing", "contract", "knowledge"],
    "three mode groups detected"
  );
  assertEqual(modeMap["routing"], ["routing/guide.md"], "routing files");
  assertEqual(modeMap["contract"], ["contract/rules.md"], "contract files");
  assertEqual(modeMap["knowledge"], ["knowledge/ref.md"], "knowledge files");
});

// ---------------------------------------------------------------------------
// Tests: extractBoundChange
// ---------------------------------------------------------------------------

group("extractBoundChange", () => {
  const output = `[trellis-phase:implement] injected_files=5
[trellis-bound-change] change_id=fontcatalog-scene-atlas-clear schema=spec-driven-commit path=openspec/changes/fontcatalog-scene-atlas-clear next_stage=bound-change-implement bridge_workflow=$openspec-apply-change
`;

  const result = extractBoundChange(output);
  assertEqual(result?.change_id, "fontcatalog-scene-atlas-clear", "change_id");
  assertEqual(result?.schema, "spec-driven-commit", "schema");
  assertEqual(result?.path, "openspec/changes/fontcatalog-scene-atlas-clear", "path");
  assertEqual(result?.next_stage, "bound-change-implement", "next_stage");
  assertEqual(result?.bridge_workflow, "$openspec-apply-change", "bridge_workflow");

  assert(
    extractBoundChange("no matching line here") === null,
    "no bound change returns null"
  );

  assert(
    extractBoundChange("") === null,
    "empty string returns null"
  );
});

// ---------------------------------------------------------------------------
// Tests: extractInvokeTargets
// ---------------------------------------------------------------------------

group("extractInvokeTargets", () => {
  const output = `[trellis-mode:invoke]  ⚡ 必须执行
  entries: 2

=== .agents/skills/gitnexus/gitnexus-debugging/SKILL.md ===
=== .agents/skills/gitnexus/gitnexus-refactoring/SKILL.md ===

[trellis-mode:contract]  硬约束
  entries: 1

=== contract/rules.md ===
`;

  const targets = extractInvokeTargets(output);
  assertEqual(targets, [
    ".agents/skills/gitnexus/gitnexus-debugging/SKILL.md",
    ".agents/skills/gitnexus/gitnexus-refactoring/SKILL.md",
  ], "extracts invoke targets");

  assertEqual(
    extractInvokeTargets("no invoke mode here"),
    [],
    "no invoke mode returns empty"
  );
});

// ---------------------------------------------------------------------------
// Tests: extractReferences
// ---------------------------------------------------------------------------

group("extractReferences", () => {
  const output = `Take a look at the design docs: specs/routing/flow.md. Also check shell-owned-view-assets/spec.md.
Other useful files: config/overlays.yaml and src/App.ts. The uitoolkit-page-context skill can help.
`;

  const injectedFiles = new Set(["specs/routing/flow.md"]); // already injected
  const knownSkills = new Set(["uitoolkit-page-context"]);

  const refs = extractReferences(output, injectedFiles, knownSkills);

  // specs/routing/flow.md should be excluded (already injected)
  assert(
    !refs.some((r) => r.ref === "specs/routing/flow.md"),
    "injected files are excluded"
  );

  // shell-owned-view-assets/spec.md should be found
  assert(
    refs.some((r) => r.ref === "shell-owned-view-assets/spec.md"),
    "file reference extracted"
  );

  // config/overlays.yaml should be found
  assert(
    refs.some((r) => r.ref === "config/overlays.yaml"),
    "yaml file reference extracted"
  );

  // skill name should be found (type: skill)
  assert(
    refs.some((r) => r.ref === "uitoolkit-page-context" && r.type === "skill"),
    "skill name reference extracted"
  );

  // src/App.ts should be found
  assert(
    refs.some((r) => r.ref === "src/App.ts"),
    "ts file reference extracted"
  );

  // Dedup: same file mentioned twice should appear once
  assertEqual(
    refs.filter((r) => r.ref === "shell-owned-view-assets/spec.md").length,
    1,
    "deduplicates duplicate references"
  );
});

// ---------------------------------------------------------------------------
// Tests: matchReference
// ---------------------------------------------------------------------------

group("matchReference", () => {
  // Exact suffix match
  assert(
    matchReference(
      "/repo/.trellis/spec/guides/task-contract.md",
      ".trellis/spec/guides/task-contract.md"
    ),
    "suffix match works"
  );

  // Reverse suffix match (ref longer)
  assert(
    matchReference(
      "task-contract.md",
      ".trellis/spec/guides/task-contract.md"
    ),
    "reverse suffix match works"
  );

  // Basename match
  assert(
    matchReference(
      "/repo/openspec/specs/shell-owned-view-assets/spec.md",
      "shell-owned-view-assets/spec.md"
    ),
    "basename match works"
  );

  // Path segment containment
  assert(
    matchReference(
      "/repo/src/project/config/overlays.yaml",
      "config/overlays.yaml"
    ),
    "path segment containment works"
  );

  // No false positive: contest.md should NOT match test.md (substring suffix)
  assert(
    !matchReference("contest.md", "test.md"),
    "no false positive on substring suffix"
  );

  // No false positive: test-file.md should NOT match file.md (substring suffix)
  assert(
    !matchReference("test-file.md", "file.md"),
    "no false positive on substring suffix with hyphen"
  );

  // Normal suffix match with path boundary
  assert(
    matchReference("config/file.md", "file.md"),
    "suffix match with / boundary works"
  );

  // Suffix match at root
  assert(
    matchReference("/repo/README.md", "README.md"),
    "suffix match at root works"
  );

  // No false positive: unrelated paths
  assert(
    !matchReference("src/utils/helpers.ts", "config/settings.yaml"),
    "no match on completely unrelated paths"
  );

  // Windows backslash path normalization
  assert(
    matchReference(
      "src\\project\\config\\overlays.yaml",
      "config/overlays.yaml"
    ),
    "windows backslash normalized"
  );

  // Exact match
  assert(
    matchReference("README.md", "README.md"),
    "exact match works"
  );

  // Reverse suffix: agent read short path, ref is long
  assert(
    matchReference("file.md", "/config/file.md"),
    "reverse suffix match works"
  );

  // Reverse false positive: file.md should NOT match long-file.md
  assert(
    !matchReference("file.md", "long-file.md"),
    "reverse suffix: no false positive"
  );

  // Path segment match: ref="settings" matches inside "config/settings.yaml" via /segment check
  assert(
    matchReference("config/settings.yaml", "settings"),
    "path segment match for ref that is a path component"
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n========================================");
console.log(`Tests: ${passed + failed} total, ${passed} passed, ${failed} failed`);
console.log("========================================");

process.exit(failed > 0 ? 1 : 0);
