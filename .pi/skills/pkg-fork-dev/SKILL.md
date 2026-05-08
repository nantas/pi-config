---
name: pkg-fork-dev
description: |
  Guide the LLM through the complete lifecycle of forking and modifying
  an existing third-party Pi package within the pi-config repository.
  Covers six phases: Fork & Setup → Modification Planning → Implementation
  → Local Testing → Commit & Ship → Maintenance.

  Use when: user wants to fork a Pi package, modify an already-forked
  package, or sync a fork with upstream changes.
  Do NOT use for: researching or evaluating a new package for the first
  time (use pkg-research), creating a brand-new Pi extension from scratch
  (use pi-extension-dev), or general pi-config configuration changes.
---

# pkg-fork-dev

A meta-skill for forking, modifying, and maintaining third-party Pi packages.

## Workflow Overview

This skill structures fork development into six sequential phases:

| Phase | Name | Exit Criteria |
|-------|------|---------------|
| A | Fork & Setup | Fork cloned, repo-registry registered, manifest written, settings.json updated, package reinstalled and verified |
| B | Modification Planning | Modification target identified, approach designed, user confirmed |
| C | Implementation | Code changes made in dev clone, existing tests pass, diff presented |
| D | Local Testing | Package installed from local clone (`file:`), functionality verified in pi |
| E | Commit & Ship | Committed, tagged, pushed; settings.json restored to git: URL; manifest and backlog updated |
| F | Maintenance | Upstream fetched, divergence inspected, merge executed if chosen |

---

## Phase A: Fork & Setup

**Goal:** Create a personal fork of the package, set up the local dev clone,
and update pi-config to point to the fork.

### Step A1 — Source identification

Detect the upstream type and extract key metadata from pi-config.

**Read current configuration:**
```bash
# Read settings.json packages array
cat .pi/settings.json | node -e "const s=require(0); console.log(JSON.stringify(s.packages,null,2))"

# For npm packages: read package.json from .pi/npm/ to find repository URL
if [ -f ".pi/npm/<name>/package.json" ]; then
  node -e "const p=require('.pi/npm/<name>/package.json'); console.log('repo:', p.repository?.url, 'version:', p.version)"
fi

# For git packages: inspect .pi/git/ clone remote
if [ -d ".pi/git/<repo-name>" ]; then
  git -C ".pi/git/<repo-name>" remote -v
fi
```

**Determine upstream type:**
- If original source starts with `npm:` → `upstream_type: npm`
- If original source starts with `git:` → `upstream_type: git`

**Extract metadata:**
| Upstream Type | Extract |
|--------------|---------|
| npm | GitHub repo URL from `package.json.repository`, version from `package.json.version` |
| git | Repo URL from `git remote -v`, upstream user from git URL |

### Step A2 — GitHub fork guidance

Instruct the user to fork the upstream repository on GitHub:

```
Please fork the upstream repository on GitHub:
  Upstream: <upstream_url>
  Your fork will be: https://github.com/<your-username>/<repo-name>

If you have the GitHub CLI (`gh`) installed, run:
  gh repo fork <upstream_url> --clone=false

Once forked, confirm your fork URL before proceeding.
```

Use `ask_user` to confirm the fork URL.

### Step A3 — Clone path confirmation

Use `ask_user` to confirm the local development clone path:

```
Where would you like to clone your fork locally?
  Suggested: /Users/<username>/projects/forks/<repo-name>
```

After confirmation:
```bash
CLONE_PATH="<confirmed-path>"
git clone "<fork-url>" "$CLONE_PATH"
cd "$CLONE_PATH"
git remote add upstream "<upstream-url>"
git remote -v  # verify both origin and upstream
```

### Step A4 — Repo-registry registration

Register the dev clone path in repo-registry:
```bash
python3 "/Users/nantasmac/.agents/skills/repo-registry/scripts/repo-registry.py" \
  set --repo-id "<name>" --path "$CLONE_PATH"
```

Verify:
```bash
python3 "/Users/nantasmac/.agents/skills/repo-registry/scripts/repo-registry.py" \
  get --repo-id "<name>"
```

### Step A5 — Manifest registration

Append a canonical entry to `forks/manifest.yaml`:

```yaml
forks:
  - name: <package-name>
    fork_url: "<fork-url>"
    upstream_url: "<upstream-url>"
    upstream_source: "<original-source-string>"
    status: active
    last_upstream_sync: null
    changes_summary: "Initial fork. No modifications yet."
```

Use the `edit` tool to append this entry.

### Step A6 — Settings update

Update `.pi/settings.json` to replace the original source with the fork's git URL.

**For npm → git:**
Replace `"npm:<pkg>[@version]"` with `"git:github.com/<user>/<repo>"`

**For git → git:**
Replace `"git:github.com/<upstream-user>/<repo>"` with `"git:github.com/<fork-user>/<repo>"`

Preserve the package's position in the `packages` array.

### Step A7 — Capabilities update

If the package appears in `.pi/capabilities.yaml`, update its `source` field:
- Check `catalog.packages` — update if found
- Check `global.settings.packages` — update if found
- Preserve all other fields (`name`, `description`, `type`)

### Step A8 — Reinstall

```bash
pi install -l "git:github.com/<user>/<repo>"
```

**For npm → git transitions:** Clean up old npm dependency:
```bash
# Remove old npm package to avoid conflicts
rm -rf ".pi/npm/<package-name>"
# If package had npm dependencies that are no longer needed:
cd .pi/npm && npm uninstall <package-name> 2>/dev/null || true
```

### Step A9 — Baseline verification

Start pi and confirm the package loads without errors:
- Verify extension/skill registers
- Check for any startup warnings related to the package

If errors occur: diagnose, fix, or roll back to original source.

---

## Phase B: Modification Planning

**Goal:** Understand the codebase, identify what to change, and get user approval.

### Step B1 — Codebase understanding

Read the fork codebase structure via `repo://<name>`:
```bash
python3 "/Users/nantasmac/.agents/skills/repo-registry/scripts/repo-registry.py" \
  resolve --repo-ref "repo://<name>"
```

Inspect key files:
```bash
# Determine package type
ls "$CLONE_PATH/extensions/"*.ts 2>/dev/null && echo "Has extensions"
ls "$CLONE_PATH/skills/"*/SKILL.md 2>/dev/null && echo "Has skills"
ls "$CLONE_PATH/themes/"*.css 2>/dev/null && echo "Has themes"
cat "$CLONE_PATH/package.json" 2>/dev/null | head -20

# Read README for context
cat "$CLONE_PATH/README.md" 2>/dev/null | head -40
```

### Step B2 — Modification target identification

Determine:
- What behavior needs to change
- Which files are affected
- Impact scope (single file vs cross-cutting)
- Breaking change risk

### Step B3 — Design decisions

Propose:
- Implementation approach
- API surface changes (if any)
- Backward compatibility considerations
- Testing strategy

### Step B4 — OpenSpec option (optional)

For significant modifications (multiple files, API changes, or architectural shifts),
suggest creating an OpenSpec change:

```
This is a significant modification. Would you like to create an OpenSpec change
for structured tracking?

If yes: openspec new change "<name>-modification"
```

For simple bug fixes or one-line changes, skip this step.

### Step B5 — User confirmation

Present the plan and wait for explicit approval:

```
## Modification Plan

**Target:** <file(s)>
**Approach:** <description>
**Impact:** <scope>
**Breaking:** <yes/no>
**OpenSpec:** <yes/no>

Proceed with implementation? (yes/no)
```

---

## Phase C: Implementation

**Goal:** Make the approved changes in the dev clone.

### Step C1 — Code changes

Make modifications in the dev clone's working tree at the path registered
in repo-registry (`repo://<name>`).

Keep changes minimal and focused on the approved plan.

### Step C2 — Existing tests

Run the fork repo's existing test suite to verify no regressions:
```bash
cd "$CLONE_PATH"
# If package.json has test script:
npm test 2>/dev/null || echo "No test script"
# Or manual verification:
node -e "try { require('.') } catch(e) { console.error('Load error:', e.message); process.exit(1) }"
```

If tests fail:
- Fix regressions before proceeding
- Or document known failures and get user approval to proceed

### Step C3 — Documentation update

If the fork repo has CHANGELOG.md or README.md:
- Add an entry describing the modification
- Include the reason for the fork change

### Step C4 — Diff review

Present the diff to the user for review:
```bash
cd "$CLONE_PATH"
git diff
```

Wait for user approval before proceeding to testing.

---

## Phase D: Local Testing

**Goal:** Test the modified package locally in pi before shipping.

### Step D1 — Temporarily switch to file source

Update `.pi/settings.json`: change the package source from
`git:github.com/<user>/<repo>` to the local dev clone absolute path.

> **Note**: Use the absolute path directly (e.g., `/Users/x/forks/pkg-name`),
> not a `file:` prefixed string. Pi's `isLocalPath()` treats `file:` as
> a local path but appends it to `cwd`, causing resolution errors.

### Step D1a — Global dedup gate（门禁）

Pi's package dedup uses identity keys based on source type. A local path
produces `local:/path/to/pkg` while a git URL produces `git:github.com/user/pkg`.
These are **different identities** — Pi loads both → tool name conflicts.

**Detection:**

```bash
# Read global packages
GLOBAL_PKGS=$(cat ~/.pi/agent/settings.json | python3 -c "
import json, sys
for p in json.load(sys.stdin).get('packages', []):
    print(p)")

# Extract package name from the local path being used in project settings
# e.g., /Users/x/forks/pi-tool-display → basename = pi-tool-display
LOCAL_PKG_NAME=$(basename "<dev-clone-path>")

# Check if global has a git/npm entry for the same package name
echo "$GLOBAL_PKGS" | grep -i "$LOCAL_PKG_NAME"
```

**If a match is found**, remove the conflicting entry from global settings:

```bash
python3 -c "
import json
with open('$HOME/.pi/agent/settings.json') as f:
    d = json.load(f)
removed = [p for p in d['packages'] if '$LOCAL_PKG_NAME' in p]
d['packages'] = [p for p in d['packages'] if '$LOCAL_PKG_NAME' not in p]
with open('$HOME/.pi/agent/settings.json', 'w') as f:
    json.dump(d, f, indent=2)
    f.write('\n')
for r in removed:
    print(f'Removed from global: {r}')
"
```

**Persist the removal record** (see D1a-persist below).

**If no match**, proceed without modification.

#### D1a-persist: Override state persistence

The removed entries MUST be persisted so they can be restored later.

**When an OpenSpec change exists** — append to `writeback.md`:

```markdown
## Phase D Global Override State

| Package | Removed from Global | Original Source |
|---------|:---:|----------------|
| <pkg-name> | ✅ | git:github.com/<user>/<repo> |

**Recovery**: Phase E4 will restore these entries. If session is lost,
read this section and manually add entries back to ~/.pi/agent/settings.json.
```

**When no OpenSpec change** — write to `<dev-clone>/.pi-dev-state.json`:

```bash
cat > "$CLONE_PATH/.pi-dev-state.json" << 'EOF'
{
  "globalOverride": {
    "removedPackages": ["git:github.com/<user>/<repo>"],
    "removedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
```

> **Why two locations?** OpenSpec changes have a structured `writeback.md` that
> tracks all state — the override section fits naturally there. Standalone fork
> modifications have no such file, so the dev clone directory (always locatable
> via `repo://<name>`) serves as the persistent store.

### Step D2 — Local install

```bash
pi install -l "<dev-clone-absolute-path>"
```

### Step D3 — Functional test

Start pi and verify:
- Package loads without errors
- Modified functionality works as expected
- No regressions in existing behavior

### Step D4 — Iteration

If issues are found:
1. Fix in the dev clone (return to Phase C)
2. Re-run `pi install -l file:<path>`
3. Re-test in pi

Repeat until all tests pass.

### Step D5 — Test complete

Once verified, confirm with the user:
```
✓ Local testing passed. Ready to commit and ship?
```

### Step D5a — Persist record verification（门禁）

Confirm the override record exists and contains the correct removed entries:

```bash
# OpenSpec change path
grep -A5 "Phase D Global Override State" openspec/changes/<change>/writeback.md

# Or standalone path
cat "$CLONE_PATH/.pi-dev-state.json"
```

If the record is missing or incomplete, recreate it before proceeding.
This record is the **only recovery mechanism** if the session is lost.

---

## Phase E: Commit & Ship

**Goal:** Commit changes, push to fork, restore pi-config to use the remote fork.

### Step E1 — Commit

```bash
cd "$CLONE_PATH"
git add -A
git commit -m "<type>(<scope>): <description>

<body explaining the change and why it was needed>

Forked-from: <upstream-url>"
```

Use conventional commit format.

### Step E2 — Tag

```bash
# Determine next version
cd "$CLONE_PATH"
git describe --tags --abbrev=0 2>/dev/null || echo "no existing tags"
# Bump version following semver
NEW_VERSION="<semver-bump>"
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
```

### Step E3 — Push

```bash
cd "$CLONE_PATH"
git push origin main
git push origin --tags
```

### Step E3a — Push verification（门禁）

验证推送已成功到达远程和本地 `.pi/git/` 克隆，确保修复可被 pi-config 加载：

```bash
# 1. Dev clone 确认 remote 已同步
cd "$CLONE_PATH"
git fetch origin
echo "=== Dev clone: local HEAD vs origin/main ==="
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "FAIL: origin/main ($REMOTE) does not match HEAD ($LOCAL). Push may have failed."
  exit 1
fi
echo "PASS: origin/main matches HEAD."

# 2. 项目 .pi/git/ 克隆确认（当前目录应是 pi-config 根目录）
cd ".pi/git/github.com/<user>/<repo>"
git fetch origin 2>/dev/null || true
INSTALLED="$(git rev-parse origin/main 2>/dev/null || echo none)"
if [ "$INSTALLED" != "$LOCAL" ]; then
  echo "WARN: .pi/git/ clone at $INSTALLED, expected $LOCAL. Run: pi install -l"
fi

echo "PASS: push verified."
```

> **必须执行**：此步骤不可跳过。如果 `origin/main` 与 HEAD 不匹配，`git push` 失败，必须重试或中断本次 change。

### Step E4 — Restore source

Update `.pi/settings.json` from the local path back to `git:github.com/<user>/<repo>`.

**Restore global settings** — read the override record and re-add removed entries:

```bash
# From OpenSpec change writeback.md: read the "Original Source" column
# From .pi-dev-state.json:
python3 -c "
import json
with open('$CLONE_PATH/.pi-dev-state.json') as f:
    state = json.load(f)
removed = state.get('globalOverride', {}).get('removedPackages', [])

with open('$HOME/.pi/agent/settings.json') as f:
    d = json.load(f)
for entry in removed:
    if entry not in d['packages']:
        d['packages'].append(entry)
        print(f'Restored to global: {entry}')
with open('$HOME/.pi/agent/settings.json', 'w') as f:
    json.dump(d, f, indent=2)
    f.write('\n')
"
```

**Cleanup override record:**

```bash
# Standalone: remove .pi-dev-state.json
rm "$CLONE_PATH/.pi-dev-state.json"

# OpenSpec: the writeback.md section will be cleaned up during writeback execution
```

### Step E5 — Remote reinstall

```bash
pi install -l "git:github.com/<user>/<repo>"
```

### Step E5a — Install verification（门禁）

验证 `.pi/git/` 和 `~/.pi/agent/git/` 两个克隆的 HEAD 是否与 dev clone 的提交一致：

```bash
EXPECTED="$(cd "$CLONE_PATH" && git rev-parse HEAD)"

for CLONE in ".pi/git/github.com/<user>/<repo>" "$HOME/.pi/agent/git/github.com/<user>/<repo>"; do
  if [ -d "$CLONE" ]; then
    ACTUAL="$(cd "$CLONE" && git log --oneline -1)"
    echo "=== $CLONE ==="
    echo "  $ACTUAL"
  fi
done

PI_INSTALLED="$(cd ".pi/git/github.com/<user>/<repo>" && git rev-parse HEAD)"
if [ "$PI_INSTALLED" != "$EXPECTED" ]; then
  echo "FAIL: .pi/git/ clone HEAD does not match dev clone. Manual git pull or pi install -l needed."
  exit 1
fi
echo "PASS: install verified."
```

**验证全局 settings 恢复**：

```bash
# Confirm global settings no longer has local path entries
cat ~/.pi/agent/settings.json | grep -c "/forks/" && echo "FAIL: global settings still contains local path" || echo "PASS: no local paths in global"

# Confirm override record is cleaned up
[ -f "$CLONE_PATH/.pi-dev-state.json" ] && echo "FAIL: .pi-dev-state.json not cleaned up" || echo "PASS: override record cleaned"
```

### Step E6 — Manifest update

Update the corresponding entry in `forks/manifest.yaml`:
- `changes_summary`: append or update modification description
- `last_upstream_sync`: keep existing value (not changed by modification)

### Step E7 — Backlog record

Record the modification in `openspec/pkg-backlog.md`:

```markdown
### <date> — <package-name> modification

- **Version:** <new-version>
- **Research Date:** <date>
- **Resource Types:** <types>
- **Decision:** forked
- **Source Type:** git-package
- **Source Repo:** <fork-url>
- **Install Method:** pi-install
- **Has Dependencies:** <true/false>
- **Reason:** <modification description>
- **Notes:** Fork of <upstream-url>. Changes: <summary>
```

---

## Phase F: Maintenance

**Goal:** Keep the fork synchronized with upstream.

### Step F1 — Fetch upstream

```bash
cd "$CLONE_PATH"
git fetch upstream
```

### Step F2 — Diff check

```bash
cd "$CLONE_PATH"
# Commits in upstream not in fork
git log HEAD..upstream/main --oneline
# Commits in fork not in upstream (your changes)
git log upstream/main..HEAD --oneline
# Full diff
git diff upstream/main...HEAD
```

### Step F3 — Merge decision

Present user with options:

```
## Upstream Sync

Upstream changes: <N> commits
Your changes: <M> commits

**Options:**
1. **Merge** — `git merge upstream/main` (preserves history, may create merge commit)
2. **Rebase** — `git rebase upstream/main` (linear history, rewrites fork commits)
3. **Cherry-pick** — select specific upstream commits
4. **Skip** — no action, check again later

Which option? (1/2/3/4)
```

### Step F4 — Execute merge

**Option 1 — Merge:**
```bash
cd "$CLONE_PATH"
git merge upstream/main
# Resolve conflicts if any
git status
```

**Option 2 — Rebase:**
```bash
cd "$CLONE_PATH"
git rebase upstream/main
# Resolve conflicts if any
git status
```

**Option 3 — Cherry-pick:**
```bash
cd "$CLONE_PATH"
# For each selected commit:
git cherry-pick <commit-hash>
```

If conflicts occur, resolve interactively with user guidance, then proceed to Phase D testing if needed.

### Step F5 — Manifest update

Update `last_upstream_sync` in `forks/manifest.yaml`:
```yaml
last_upstream_sync: "<YYYY-MM-DD>"
```

### Step F6 — Regression check

If upstream changes introduce regressions:
- Run existing tests
- If failures are related to upstream changes that conflict with fork modifications,
  route to Phase B for new modification planning
- If failures are upstream bugs, consider whether to patch locally or wait for upstream fix

---

## Appendix: Skill Path Reference

| Path | Purpose |
|------|---------|
| `.pi/skills/pkg-fork-dev/SKILL.md` | This skill file |
| `forks/manifest.yaml` | Canonical fork registry |
| `.pi/settings.json` | Package source configuration |
| `.pi/capabilities.yaml` | Capability manifest |
| `openspec/pkg-backlog.md` | Fork action backlog |
| `scripts/sync-pi-agent.sh` | Global sync script |
| `docs/reference/pi-package-loading.md` | Pi package loading, identity & dedup mechanism |

## Appendix: Skill Boundary Clarification

| Skill | Responsibility | When to Use |
|-------|---------------|-------------|
| `pkg-research` | Evaluate and decide on **new** third-party packages | First time encountering a package |
| `pi-extension-dev` | Build **brand-new** Pi extensions from scratch | Creating original functionality |
| `pkg-fork-dev` | **Fork and modify** existing packages | Package already used, needs customization |

**Transitions:**
- `pkg-research` Phase 3 → Option A (global/catalog) may lead to a package being used
- Later, if that package needs modification → switch to `pkg-fork-dev` Phase A
- `pkg-fork-dev` Phase B for major features → optionally create OpenSpec change
- `pi-extension-dev` for new extensions → never forks existing packages

## Appendix: Session Loss Recovery

If a session is lost during Phase D (global settings modified, override record exists),
a new session can detect and recover the abnormal state via three paths:

### Path 1: OpenSpec change status

```bash
openspec status --change "<change-name>"
```

If the change shows in-progress state, read `writeback.md`:
```bash
grep -A10 "Phase D Global Override State" openspec/changes/<change>/writeback.md
```

Restore the listed entries to `~/.pi/agent/settings.json`.

### Path 2: `.pi-dev-state.json` in dev clone

```bash
CLONE_PATH=$(python3 ~/.agents/skills/repo-registry/scripts/repo-registry.py get --repo-id "<name>")
cat "$CLONE_PATH/.pi-dev-state.json" 2>/dev/null
```

If the file exists, it contains `removedPackages` that need to be restored.

### Path 3: Manual global/project comparison

If neither record exists, compare the two settings files:

```bash
echo "=== Project local paths ==="
cat .pi/settings.json | python3 -c "
import json, sys
for p in json.load(sys.stdin).get('packages', []):
    if p.startswith('/') or p.startswith('./') or p.startswith('../'):
        print(f'  {p}')
"
echo "=== Global entries for same packages ==="
for name in $(cat .pi/settings.json | python3 -c "
import json, sys, os
for p in json.load(sys.stdin).get('packages', []):
    if p.startswith('/'):
        print(os.path.basename(p))
"); do
    cat ~/.pi/agent/settings.json | python3 -c "
import json, sys
for p in json.load(sys.stdin).get('packages', []):
    if '$name' in p:
        print(f'  GLOBAL: {p}')
"
done
```

If project has a local path and global has a git/npm entry for the same package,
a conflict exists. Either remove the global entry (if continuing Phase D) or
restore project source to git URL (if Phase E was intended).

## Appendix: Machine-Specific Path Handling

When `pkg-fork-dev` is used on a different machine:

1. Check repo-registry for existing mapping:
   ```bash
   python3 "/Users/nantasmac/.agents/skills/repo-registry/scripts/repo-registry.py" \
     get --repo-id "<name>"
   ```

2. If unregistered or path doesn't exist:
   - Ask user for the dev clone path on this machine
   - Register with `repo-registry set`

3. Never hardcode clone paths in skill instructions or manifest.yaml

## Constraints

- **Repo-registry for paths** — all dev clone paths MUST be registered in repo-registry as `repo://<name>` (仓库名，不加前缀后缀) before Phase C implementation begins. The `$CLONE_PATH` variable in Phases C-E is resolved from repo-registry, never hardcoded.
- **Manifest as canonical source** — every fork MUST have a `forks/manifest.yaml` entry
- **Settings.json source tracking** — original source recorded in manifest, current source in settings.json
- **File: install for testing only** — `file:<path>` is temporary; always restore to `git:` URL for production
- **User confirmation gates** — fork creation, modification plan, and merge strategy all require explicit approval
- **Backlog for all fork actions** — initial fork and every modification shipped recorded in `openspec/pkg-backlog.md`
- **Capabilities.yaml sync** — when a package moves from npm to git or upstream to fork, update both `catalog.packages` and `global.settings.packages` if present
- **Global dedup on local switch** — Phase D1a MUST check global settings for identity-conflicting entries before switching project source to local path. See `docs/reference/pi-package-loading.md` for the identity key mechanism.
- **No CI/CD automation** — this skill does not create or manage fork CI/CD pipelines
