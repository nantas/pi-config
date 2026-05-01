---
name: pkg-research
description: |
  Guide the LLM through a structured workflow for researching, evaluating,
  and managing third-party Pi packages within the pi-config repository.
  Covers four phases: security review, isolated install & research, user
  decision (global / backlog / discard), and global sync.

  Use when: user wants to research, evaluate, test, or install a Pi package;
  provides a package URL, npm source (e.g., npm:@scope/pkg), or git source
  (e.g., git:github.com/user/repo) to evaluate.
  Do NOT use for: creating new Pi packages or extensions (use pi-extension-dev),
  general pi-config configuration changes, or non-package coding tasks.
---

# pkg-research

A meta-skill for researching, testing, and managing third-party Pi packages.

## Workflow Overview

This skill structures package research into four sequential phases:

| Phase | Name | Exit Criteria |
|-------|------|---------------|
| 1 | Security Review | Source cloned/reviewed, suspicious code flagged or cleared, user approved to proceed |
| 2 | Install & Research | Package installed project-level, structure/deps/tests/conflicts analyzed |
| 3 | Decision (Backlog) | User chose global / backlog / discard; install cleaned if not global |
| 4 | Global Sync | `.pi/settings.json` updated, user confirmed sync, sync verified |

---

## Phase 1: Security Review

**Goal:** Review package source code for security risk indicators **before** any `pi install` command, using a temporary isolated clone.

### Step 1 — Determine package source type

Ask the user for the package source if not already provided. Expected formats:
- **npm package**: `npm:@scope/pkg` or `npm:@scope/pkg@version`
- **git repository**: `git:github.com/user/repo` or a full git URL
- **local path**: `file:./path/to/package`

If the source is unclear, prompt the user to clarify before proceeding.

### Step 2 — Clone/fetch source to temp directory

Create a temporary directory using `mktemp -d` and fetch source into it.

**For npm packages:**
```bash
# Use npm pack to download the tarball
npm pack <npm-source> --pack-destination "$TMPDIR"
# Extract for inspection
tar -xzf "$TMPDIR/$(ls $TMPDIR | grep .tgz)" -C "$TMPDIR/extracted"
```

**For git repositories:**
```bash
git clone --depth 1 <git-url> "$TMPDIR/repo"
```

**If source cannot be cloned** (e.g., npm pack fails, git repo not accessible):
- Report the failure reason to the user
- Request explicit user confirmation before proceeding to blind install
- If user declines, abort and record reason

### Step 3 — Scan for suspicious code

Use `grep` or `rg` to scan the temporary source for known risk patterns. For each category, report findings with file paths and line references.

**Network request detection:**
```bash
rg -n "(fetch|axios\.(get|post)|request\(|node:https|node:http)" --type-add 'ts:*.ts' --type-add 'js:*.js' -t ts -t js "$TMPDIR"
```
Flag any HTTP client usage targeting non-standard domains.

**Command execution detection:**
```bash
rg -n "(exec(File|Sync)?|spawn|child_process|execSync)" --type-add 'ts:*.ts' --type-add 'js:*.js' -t ts -t js "$TMPDIR"
```

**Dynamic code execution detection:**
```bash
rg -n "(eval\(|new Function|vm\.(runInNewContext|Script)|Function\()" --type-add 'ts:*.ts' --type-add 'js:*.js' -t ts -t js "$TMPDIR"
```

**Obfuscated code detection:**
```bash
# Large base64 blocks (lines with >100 chars of base64-like content)
rg -n "^(?:[A-Za-z0-9+/]{4}){20,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$" "$TMPDIR"
# Hex-encoded strings
rg -n "'\\\\x[0-9a-fA-F]{2}'" --type-add 'ts:*.ts' --type-add 'js:*.js' -t ts -t js "$TMPDIR"
# Excessively minified single-line files (single line > 5000 chars)
find "$TMPDIR" -name "*.js" -o -name "*.ts" | xargs -I{} sh -c 'wc -l "{}" | while read lines file; do [ "$lines" -le 3 -a "$(wc -c < "$file")" -gt 5000 ] && echo "Minified: $file"; done'
```

**Dependency chain review:**
```bash
# Check if package.json exists and list dependencies
if [ -f "$TMPDIR/package.json" ]; then
  node -e "const p = require('$TMPDIR/package.json'); console.log('Dependencies:', JSON.stringify(p.dependencies, null, 2)); console.log('Peer deps:', JSON.stringify(p.peerDependencies, null, 2));"
fi
```
Flag any dependencies with unusual names (typosquatting patterns), known malicious packages, or excessive dependency depth.

### Step 4 — Produce security review summary

Categorize and present findings to the user:

```
## Security Review: <package-source>

### Summary
- ✅ Network requests: N findings
- ✅ Command execution: N findings
- ✅ Dynamic code: N findings
- ✅ Obfuscation: N findings
- ✅ Dependencies: N flagged
- **Overall: [CLEAN / FLAGGED]**

### Details
[List each finding with file path and line number]
```

**If CLEAN:** Report clean review and prompt user to confirm continuation to installation.

**If FLAGGED:** Present the categorized findings and **require explicit user confirmation** to continue or abort. Do not proceed without user decision.

### Step 5 — Retain clone for Phase 2 (do NOT clean up)

After presenting findings and receiving user decision to proceed, **retain** the temp directory for Phase 2 reuse.

```bash
# Clone is NOT cleaned up here. It is retained for Phase 2 testing.
# Cleanup happens in Phase 3 after decision execution.
```

Include this note in the security review summary:
> 克隆保留用于 Phase 2 测试，在 Phase 3 决策完成后清理

**If user aborts:** Record the package in backlog with reason "security review rejected" (see Phase 3 for backlog format) AND clean up:
```bash
rm -rf "$TMPDIR"
```

---

## Phase 2: Install & Research

**Goal:** Analyze the source: detect its type (package vs raw extension), then execute the appropriate research workflow.

> **Prerequisite:** Security review (Phase 1) completed and user approved to proceed.
> **Clone path available:** The temp clone from Phase 1 is retained at `$TMPDIR` for reuse.

### Step 0 — Detect source type

At the entry of Phase 2, detect the source type by inspecting the retained clone at `$TMPDIR`:

```bash
# Check for root package.json → package source
if [ -f "$TMPDIR/package.json" ]; then echo "package" ; fi

# Check for extensions/ with .ts files AND no root package.json → raw extension source
if [ ! -f "$TMPDIR/package.json" ] && ls "$TMPDIR/extensions/"*.ts 2>/dev/null; then echo "raw-extension" ; fi
```

Branch accordingly:
- **package source** (root `package.json` exists): proceed to **Package Source Branch** below (Steps 1-6)
- **raw extension source** (no root `package.json`, has `extensions/*.ts`): proceed to **Raw Extension Branch** below
- **neither**: report "未识别源类型 — 该来源不是标准 Pi 包也不是 raw extension 目录" and ask user how to proceed

---

### Package Source Branch (Steps 1-6)

> **Prerequisite:** Source type detected as package (root `package.json` exists).

#### Step 1 — Project-level install

```bash
pi install -l <source>
```

- For npm packages: installs under `.pi/npm/`
- For git packages: clones under `.pi/git/`

**If install fails:** Report the error to user and request decision: retry, skip to backlog, or abort.

#### Step 2 — Package structure analysis

Identify which Pi resource types the package provides. Check:

**Manifest-based discovery (if package has pi manifest in `package.json` or `pi.json`):**
```bash
# Read the pi manifest to find declared resources
node -e "const p = require('.pi/npm/<name>/package.json'); console.log(JSON.stringify(p.pi, null, 2))"
```

**Convention-based discovery (check standard directories):**
```bash
ls -la .pi/npm/<name>/extensions/ 2>/dev/null && echo "Extensions found"
ls -la .pi/npm/<name>/skills/ 2>/dev/null && echo "Skills found"
ls -la .pi/npm/<name>/prompts/ 2>/dev/null && echo "Prompts found"
ls -la .pi/npm/<name>/themes/ 2>/dev/null && echo "Themes found"
```

Report which resource types are provided.

#### Step 3 — Dependency analysis

```bash
# Read package.json for dependencies
node -e "const p = require('.pi/npm/<name>/package.json'); console.log('Dependencies:', JSON.stringify(p.dependencies, null, 2)); console.log('Peer deps:', JSON.stringify(p.peerDependencies, null, 2)); console.log('Bundled deps:', JSON.stringify(p.bundledDependencies, null, 2))"
```

- List all runtime dependencies with declared version ranges
- List all peer dependencies and verify they are satisfied by pi's bundled core packages
- Flag any `bundledDependencies` for special attention

#### Step 4 — Functional smoke test

**For extensions:** Load the extension to verify it registers without errors:
```bash
# Check for any startup errors by examining the extension file structure
# and validating it can be loaded (basic syntax check)
node -e "try { require('.pi/npm/<name>') } catch(e) { console.log('Load error:', e.message) }"
```

**For skills:** Verify skill files have valid YAML frontmatter:
```bash
head -20 .pi/npm/<name>/skills/*/SKILL.md | grep -E "^---$"
```

**If any resource fails to load:** Report the specific error messages and affected files.

#### Step 5 — Conflict check

Compare the new package's resources against existing entries in `.pi/settings.json`:

**Skill name collision:**
```bash
# List all existing skill names
find .pi/skills -name "SKILL.md" -exec sh -c 'head -5 "$1" | grep "^name:" | cut -d" " -f2' _ {} \;
# Check against new package's skills
ls .pi/npm/<name>/skills/ 2>/dev/null
```

**Extension path collision:**
```bash
# List existing extensions
ls .pi/extensions/ 2>/dev/null
# Check against new package's extensions
ls .pi/npm/<name>/extensions/ 2>/dev/null
```

Report any overlaps with their sources. If no conflicts, report "no conflicts found."

#### Step 6 — Present research summary

Provide a structured summary to the user:

```
## Research Summary: <package-source>
- **Version:** <version>
- **Resource Types:** [extensions / skills / prompts / themes]
- **Resources:** [list of files/resources]
- **Dependencies:** N runtime, N peer, N bundled
- **Smoke Test:** [PASS / FAIL]
- **Conflicts:** [none / list conflicts]
- **Overall Assessment:** <brief assessment>
```

---

### Raw Extension Branch

> **Prerequisite:** Source type detected as raw extension (no root `package.json`, has `extensions/*.ts` files).
> The retained clone at `$TMPDIR` is used for all testing — NO files are written to `.pi/` during this branch.

#### Step R1 — List discovered extensions

List all `.ts` files in the `extensions/` directory of the clone:

```bash
# List all extension files found in the clone
echo "=== Discovered Extensions ==="
for f in "$TMPDIR/extensions/"*.ts; do
  basename="$(basename "$f" .ts)"
  echo "- $basename ($f)"
done
```

Present the list to the user with file paths and inferred purpose (read file contents for a brief description).

#### Step R2 — Check npm dependencies per extension

For each extension, check if it has a `package.json` at `extensions/<name>/package.json`:

```bash
# Check each extension for npm dependencies
for f in "$TMPDIR/extensions/"*.ts; do
  name="$(basename "$f" .ts)"
  dep_file="$TMPDIR/extensions/$name/package.json"
  if [ -f "$dep_file" ]; then
    echo "$name: has package.json — dependencies found"
    # Run npm install in that directory
    (cd "$TMPDIR/extensions/$name" && npm install)
  else
    echo "$name: no package.json — no external dependencies"
  fi
done
```

Report: for each extension, whether dependencies were found and installed.

#### Step R3 — Output ephemeral test commands

For each extension, provide a runnable `pi -e` command using the cloned path:

```bash
# Generate test commands
for f in "$TMPDIR/extensions/"*.ts; do
  name="$(basename "$f" .ts)"
  # Check if extension has a subdirectory with package.json
  if [ -f "$TMPDIR/extensions/$name/package.json" ]; then
    echo "pi -e $TMPDIR/extensions/$name/index.ts  # $name (with npm dependencies)"
  else
    echo "pi -e $f  # $name"
  fi
done
```

Present the commands to the user with the note: "在当前 session 内测试，clone 路径在本 session 生命周期内有效。"

#### Step R4 — Wait for user test feedback

Ask the user to test the extensions using the provided commands and report back:

- If **testing successful**: proceed to Phase 3 with the research results
- If **extension fails to load**: record failure details and ask: retry with fixes, skip this extension, or abort the entire research
- If **user reports mixed results**: handle each extension independently (skip failed ones, proceed with working ones)

> **Note:** Raw extension Phase 2 does NOT modify `.pi/` directory. No files are written to `.pi/extensions/`, `.pi/settings.json`, or any other `.pi/` path. All testing is done ephemerally via `pi -e`.

---

## Phase 3: Decision (Backlog)

**Goal:** Present the user with three updated options aligned with the global/catalog model, then execute the chosen one.

> **Note for package sources:** `pi install -l` in Phase 2 has already modified `.pi/settings.json` by adding the package to the `packages` array. This modification is temporary pending user decision. Non-global decisions (B/C) must roll back this change.
> **Note for raw extension sources:** Phase 2 did NOT modify `.pi/`. Installation happens here in Phase 3 based on user decision.

### Step 1 — Present decision options

After research summary (or user test feedback) is complete, present:

```
## Decision Required

### Option A: 加入本仓库能力 (Add to Repo)
- Installs the resource into this repository (.pi/extensions/ for raw extensions,
  retains .pi/settings.json for packages)
- Then asks about distribution scope:
  - A1) Global — add to `global.*` manifest + Phase 4 sync
  - A2) Catalog — add to `catalog.*` manifest (no sync, available for on-demand install)
- Writes a backlog entry as durable record

### Option B: 加入 backlog 列表 (Backlog Only)
- Pure record: only writes entry in `openspec/pkg-backlog.md`
- No files installed to .pi/
- No manifest modified
- For packages: rolls back .pi/settings.json + pi remove <source>
- Resource can be revisited later

### Option C: 放弃 (Discard)
- Cleans up temporary clone (rm -rf "$TMPDIR")
- Optional: record rejection note in backlog
- For packages: also rolls back .pi/settings.json + pi remove <source>
- Do NOT modify .pi/capabilities.yaml

Which option would you like? (A/B/C)
```

If the system cannot confidently recommend an option, present findings with noted uncertainties and explicitly request user decision. Default pre-selection for Option A sub-decision is A1 (Global) to match existing user expectations.

### Step 2 — Execute chosen option

**Option A — Sub-decision: Global or Catalog**

After user chooses A, present:
```
### Distribution Scope
- A1) Global — synced to all projects via scripts/sync-pi-agent.sh
- A2) Catalog — available for on-demand installation (no sync)
```

Then execute based on sub-choice:

**Option A1 (Global):**
1. Install resource if not already installed:
   - **Package**: retain `.pi/settings.json` modification (already done in Phase 2)
   - **Raw extension**: copy extension file(s) to `.pi/extensions/`
2. Write a backlog entry with `Decision: global` (see backlog format below)
3. **Update `.pi/capabilities.yaml`:**
   - Package: append to `global.settings.packages`. If already in `catalog.packages`, remove from there first.
   - Raw extension: append to `global.extensions`
4. Clean up temp clone: `rm -rf "$TMPDIR"`
5. Proceed to Phase 4

**Option A2 (Catalog):**
1. Install resource locally (same as A1):
   - **Package**: retain `.pi/settings.json` modification
   - **Raw extension**: copy extension file(s) to `.pi/extensions/`
2. Write a backlog entry with `Decision: catalog`
3. **Update `.pi/capabilities.yaml`:**
   - Package: append to `catalog.packages` with `type: settings-entry`
   - Raw extension: append to `catalog.extensions`
4. Do NOT roll back local install (local activation is expected for catalog-scoped resources)
5. Clean up temp clone: `rm -rf "$TMPDIR"`
6. Skip Phase 4 (catalog is published on next sync cycle, no immediate sync needed)

**Option B (Backlog Only):**
1. Do NOT install (no files copied, no .pi/ modified)
2. For **package sources**: roll back `.pi/settings.json` + `pi remove <source>`
3. Write a backlog entry with `Decision: backlog`
4. Clean up temp clone: `rm -rf "$TMPDIR"`
5. Do NOT modify `.pi/capabilities.yaml`

**Option C (Discard):**
1. Ask: "Would you like to record a brief rejection note in the backlog?"
2. If yes: write a backlog entry with `Decision: discarded` and the rejection reason
3. For **package sources**: roll back `.pi/settings.json` + `pi remove <source>`
4. Clean up temp clone: `rm -rf "$TMPDIR"`
5. Do NOT modify `.pi/capabilities.yaml`

### Backlog Entry Format

When writing a backlog entry, use the extended schema:

```markdown
### <research-date> — <resource-name>

- **Version:** <version or "latest">
- **Research Date:** <YYYY-MM-DD>
- **Resource Types:** <extensions / skills / prompts / themes / mixed>
- **Decision:** <global / catalog / backlog / discarded>
- **Source Type:** <npm-package | git-package | raw-extension>
- **Source Repo:** <URL>
- **Install Method:** <pi-install | raw-copy>
- **Has Dependencies:** <true | false>
- **Reason:** <decision rationale>
- **Notes:** <follow-up items or observations>
```

For **raw extensions**: each extension gets its own entry (not grouped).
For **package sources**: fields like `Source Repo` may be inferred from source URL.
For **Option A1 (Global)**: backlog still written as durable record.


---

## Phase 4: Global Sync

**Goal:** Sync the confirmed resource to global Pi runtime.

> **Trigger:** Phase 4 runs ONLY after **Option A1 (Global)** decision. It does NOT run for A2 (Catalog), B (Backlog), or C (Discard).

### Step 1 — Verify local configuration

**For packages:** Verify `.pi/settings.json` `packages` array contains the source:
- If present: confirm the entry and proceed to Step 2.
- If missing (unusual): append the package source string using the `edit` tool.
- If duplicate: skip addition, report, and proceed.

**For raw extensions:** Verify the extension file exists in `.pi/extensions/`:
```bash
ls -la .pi/extensions/<name>.ts 2>/dev/null && echo "Extension present"
```
- If present: confirm and proceed to Step 2.
- If missing: report the discrepancy and ask user to check.

### Step 2 — Confirm sync

Ask the user:
```
The resource has been added to the repository configuration.
Would you like to sync to the global Pi runtime (`~/.pi/agent/`)
via `scripts/sync-pi-agent.sh`?

- Yes: execute sync now
- No: changes remain locally only
- Defer: sync later
```

### Step 3 — Execute sync (if confirmed)

```bash
scripts/sync-pi-agent.sh
```

**On success** (exit code 0):
```
✓ Global sync completed successfully.
  Changes synced from .pi/ to ~/.pi/agent/.
```

**On failure** (non-zero exit code):
```
✗ Global sync failed.
  Error: <error output>
  Manual recovery: run `scripts/sync-pi-agent.sh` from the repository root
```

**Post-sync verification (for raw extensions):** Verify synced extension exists at global path:
```bash
ls -la ~/.pi/agent/extensions/<name>.ts 2>/dev/null && echo "✓ Extension synced to global"
```

**Post-sync verification (for packages):** Verify synced package in global settings:
```bash
grep "<package-source>" ~/.pi/agent/settings.json 2>/dev/null && echo "✓ Package synced to global"
```

---

## Appendix: Security Review Pattern Reference

| Pattern | Risk Type | Example |
|---------|-----------|---------|
| `fetch(...)`, `axios.*`, `request(...)` | Network exfiltration | Extension phoning home |
| `exec(...)`, `execSync(...)`, `spawn(...)` | Command execution | Arbitrary shell commands |
| `eval(...)`, `new Function(...)`, `vm.*` | Dynamic code | Obfuscated payload |
| Base64 blocks, hex strings | Obfuscation | Hidden malicious code |
| Typosquatting deps | Dependency attack | `lodash` vs `lodahs` |

## Appendix: Key File Paths

| Path | Purpose |
|---|---|
| `.pi/skills/pkg-research/SKILL.md` | This skill file |
| `.pi/settings.json` | Global package configuration |
| `.pi/extensions/` | Raw extension installation target (Option A) |
| `openspec/pkg-backlog.md` | Package/extension backlog file |
| `scripts/sync-pi-agent.sh` | Sync to `~/.pi/agent/` |
| `.pi/capabilities.yaml` | Capability manifest (must stay in sync with decisions) |

## Constraints

- **Security review must complete before any install** — never skip Phase 1
- **Project-level install only** (`pi install -l`) — never install globally without review
- **User drives all decisions** — never auto-select between A/B/C
- **Global sync requires explicit user confirmation** — never auto-sync
- **Clone retained through Phase 3** — temp clone from Phase 1 is NOT cleaned up until Phase 3 decision execution completes; Exception: if user aborts in Phase 1, clean up immediately
- **Raw extension Phase 2 does NOT modify .pi/** — all testing uses ephemeral `pi -e` from clone path
- **Settings rollback for non-global/backlog decisions** — when user chooses Option B or C (for package sources), always roll back `.pi/settings.json` modification made during Phase 2 install
- **Backlog for all decisions** — when user chooses Option A (A1/A2), B, or optionally C, always write a backlog entry as durable record
- **Manifest update only for Option A** — A1 updates `global.*`, A2 updates `catalog.*`; Options B and C do NOT modify `.pi/capabilities.yaml`
- **Duplicate check before manifest write** — always check if the resource already exists in the target manifest section before appending
- **Catalog-to-global promotion** — when promoting from catalog to global, remove from `catalog.*` before adding to `global.*`
- **All paths repo-relative** — works from pi-config repository root
