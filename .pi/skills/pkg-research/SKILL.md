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

### Step 5 — Clean up temp directory

After presenting findings and receiving user decision, unconditionally remove the temp directory:
```bash
rm -rf "$TMPDIR"
```

**If user aborts:** Record the package in backlog with reason "security review rejected" (see Phase 3 for backlog format).

---

## Phase 2: Install & Research

**Goal:** Install the package at project level using `pi install -l`, then analyze its structure, dependencies, functionality, and conflicts.

> **Prerequisite:** Security review (Phase 1) completed and user approved to proceed.

### Step 1 — Project-level install

```bash
pi install -l <source>
```

- For npm packages: installs under `.pi/npm/`
- For git packages: clones under `.pi/git/`

**If install fails:** Report the error to user and request decision: retry, skip to backlog, or abort.

### Step 2 — Package structure analysis

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

### Step 3 — Dependency analysis

```bash
# Read package.json for dependencies
node -e "const p = require('.pi/npm/<name>/package.json'); console.log('Dependencies:', JSON.stringify(p.dependencies, null, 2)); console.log('Peer deps:', JSON.stringify(p.peerDependencies, null, 2)); console.log('Bundled deps:', JSON.stringify(p.bundledDependencies, null, 2))"
```

- List all runtime dependencies with declared version ranges
- List all peer dependencies and verify they are satisfied by pi's bundled core packages
- Flag any `bundledDependencies` for special attention

### Step 4 — Functional smoke test

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

### Step 5 — Conflict check

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

### Step 6 — Present research summary

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

## Phase 3: Decision (Backlog)

**Goal:** Present the user with three clear options and execute the chosen one.

> **Note:** `pi install -l` in Phase 2 has already modified `.pi/settings.json` by adding the package to the `packages` array. This modification is temporary pending user decision. Non-global decisions (B/C) must roll back this change.

### Step 1 — Present decision options

After research summary is complete, present:

```
## Decision Required

### Option A: Add to Global Config
- Retains `.pi/settings.json` modification from Phase 2 install
- Updates `.pi/capabilities.yaml`: appends package source to `global.settings.packages`
- Also writes a backlog entry in `openspec/pkg-backlog.md` (backlog serves as durable record of all approved packages)
- Syncs to `~/.pi/agent/` via scripts/sync-pi-agent.sh (with confirmation)
- Package becomes available across all projects

### Option B: Record to Backlog
- Rolls back `.pi/settings.json` modification (remove package from `packages` array)
- Cleans up project install (`pi remove <source>`)
- Updates `.pi/capabilities.yaml`: adds a new entry to `catalog.packages` with `type: settings-entry`
- Records entry in `openspec/pkg-backlog.md`
- Package can be revisited later for promotion to global

### Option C: Discard
- Rolls back `.pi/settings.json` modification (remove package from `packages` array)
- Cleans up project install (`pi remove <source>`)
- Does NOT modify `.pi/capabilities.yaml`
- Optional: record rejection note in backlog

Which option would you like? (A/B/C)
```

If the system cannot confidently recommend an option, present findings with noted uncertainties and explicitly request user decision.

### Step 2 — Execute chosen option

**Option A (Add to Global):**
1. The `.pi/settings.json` modification from Phase 2 is retained (no rollback needed).
2. Write a backlog entry in `openspec/pkg-backlog.md` with decision "global" (see Option B for entry format).
3. **Update `.pi/capabilities.yaml`:** If the package source is already in `catalog.packages`, remove it from there first. Then append the package source string to `global.settings.packages` in `.pi/capabilities.yaml`. If the source already exists in `global.settings.packages`, skip the update and report the package is already listed.

   **Example edit** (append to `global.settings.packages`):
   ```yaml
   global:
     settings:
       packages:
         - npm:pi-mcp-adapter@2.5.1
         - ./packages/subagent-dispatch
         - <new-package-source>  # ← appended here
   ```
4. Proceed to Phase 4.

**Option B (Backlog):**
1. Roll back `.pi/settings.json`: use the `edit` tool to remove the package source string from the `packages` array.
2. Execute `pi remove <source>` to clean up installed resources.
3. Read existing `openspec/pkg-backlog.md` (create if not exists).
4. Append a new entry (newest first) with:
   - Package source/name
   - Version (if pinned)
   - Research date
   - Resource types provided
   - Decision reason (why backlog, not global)
   - Follow-up notes
5. **Update `.pi/capabilities.yaml`:** Append a new entry to `catalog.packages` with `name`, `source`, `description`, and `type: "settings-entry"`. If the source already exists in `catalog.packages`, skip the update and report.

   **Example catalog package entry:**
   ```yaml
   catalog:
     packages:
       - name: my-package
         source: npm:my-package@1.0.0
         description: "Brief description of the package"
         type: settings-entry
   ```
6. Confirm entry written.

**Option C (Discard):**
1. Roll back `.pi/settings.json`: use the `edit` tool to remove the package source string from the `packages` array.
2. Ask: "Would you like to record a brief rejection note in the backlog?"
3. If yes: append a backlog entry with status "discarded" and the rejection reason.
4. Execute `pi remove <source>` to clean up installed resources.
5. If no note: clean up without creating any record.
6. Do NOT modify `.pi/capabilities.yaml`.

---

## Phase 4: Global Sync

**Goal:** Add the confirmed package to global configuration and sync to Pi runtime.

### Step 1 — Verify `.pi/settings.json`

The package should already be in `.pi/settings.json` `packages` array from Phase 2 install. Verify it exists:

- If present: confirm the entry and proceed to Step 2.
- If missing (unusual): append the package source string to the `packages` array using the `edit` tool.
- If duplicate: skip addition, report, and proceed.

### Step 2 — Confirm sync

Ask the user:
```
The package has been added to `.pi/settings.json`. Would you like to sync to
the global Pi runtime (`~/.pi/agent/`) via `scripts/sync-pi-agent.sh`?

- Yes: execute sync now
- No: changes remain in `.pi/settings.json` only
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
| `openspec/pkg-backlog.md` | Package backlog file |
| `scripts/sync-pi-agent.sh` | Sync to `~/.pi/agent/` |
| `.pi/capabilities.yaml` | Capability manifest (must stay in sync with decisions) |

## Constraints

- **Security review must complete before any install** — never skip Phase 1
- **Project-level install only** (`pi install -l`) — never install globally without review
- **User drives all decisions** — never auto-select between A/B/C
- **Global sync requires explicit user confirmation** — never auto-sync
- **Temp directories must be cleaned up** — unconditionally remove after review
- **Settings rollback for non-global decisions** — when user chooses Option B or C, always roll back `.pi/settings.json` modification made during Phase 2 install
- **Backlog for all approved packages** — when user chooses Option A or B, always write a backlog entry as durable record
- **Manifest update for global/backlog decisions** — Option A updates `global.settings.packages`; Option B updates `catalog.packages`; Option C does NOT modify manifest
- **Duplicate check before manifest write** — always check if the package source already exists in the target manifest section before appending
- **Catalog-to-global promotion** — when promoting a package from catalog to global, remove it from `catalog.packages` before adding to `global.settings.packages`
- **All paths repo-relative** — works from pi-config repository root
