# Pi Package Loading & Deduplication

> Last updated: 2026-05-07
> Source reference: `pi-mono/packages/coding-agent/src/core/package-manager.ts`, `resource-loader.ts`
> Related: [Pi Tool API Dependency](./pi-tool-api-dependency.md) (ExtensionAPI interface boundary)

## Overview

This document describes how Pi discovers, deduplicates, and loads packages from global and project-level settings. It is intended for developers working on Pi extensions who need to understand why a package loads (or doesn't) and how to diagnose tool/flag conflicts on startup.

The companion document [pi-tool-api-dependency.md](./pi-tool-api-dependency.md) covers the ExtensionAPI interface boundary (what `getAllTools()` returns vs. internal `ToolDefinition`). This document covers the **package manager** layer — everything that happens before extensions are instantiated.

---

## Package Loading Pipeline

```
┌─────────────────────────────────────────────────────┐
│  Pi Startup / Reload                                │
│                                                     │
│  1. Read settings                                   │
│     ├─ project: <cwd>/.pi/settings.json            │
│     └─ global:  ~/.pi/agent/settings.json           │
│                                                     │
│  2. resolve()                          ◄── pkg-mgr  │
│     ├─ Collect all packages (project first)         │
│     ├─ dedupePackages()                             │
│     └─ resolvePackageSources()                      │
│         ├─ npm → .pi/npm/<name>/                    │
│         ├─ git → .pi/git/<host>/<user>/<repo>/      │
│         └─ local → resolve(cwd, path)               │
│                                                     │
│  3. loadExtensions()                   ◄── res-loader│
│     ├─ mergePaths() — canonicalize dedup            │
│     └─ load each extension's index.ts               │
│                                                     │
│  4. detectExtensionConflicts()                      │
│     └─ Report tool/flag name collisions             │
└─────────────────────────────────────────────────────┘
```

### Step 1: Settings Collection

`package-manager.ts` → `resolve()` (line ~851)

Both global and project settings are read. Project packages are collected **first**:

```typescript
const allPackages: Array<{ pkg: PackageSource; scope: SourceScope }> = [];
for (const pkg of projectSettings.packages ?? []) {
    allPackages.push({ pkg, scope: "project" });
}
for (const pkg of globalSettings.packages ?? []) {
    allPackages.push({ pkg, scope: "user" });
}
```

### Step 2: Package Deduplication

`package-manager.ts` → `dedupePackages()` (line ~1626)

Each package is identified by an identity key (see below). When the same identity appears in both scopes, **project wins**:

```typescript
if (entry.scope === "project" && existing.scope === "user") {
    seen.set(identity, entry);  // project overrides user
}
```

### Step 3: Source Resolution

`package-manager.ts` → `resolvePackageSources()` (line ~1191)

Each surviving package is resolved to a filesystem path:

| Source Type | Resolution Path |
|-------------|----------------|
| `npm:<spec>` | `.pi/npm/<name>/` (or `~/.pi/agent/npm/<name>/`) |
| `git:github.com/user/repo` | `.pi/git/github.com/user/repo/` (or `~/.pi/agent/git/...`) |
| `/absolute/path` | Resolved as-is via `resolve(baseDir, path)` |
| `../relative/path` | Resolved relative to scope's base dir |

### Step 4: Extension Loading & Path Dedup

`resource-loader.ts` → `mergePaths()` (line ~661)

Resolved extension paths are deduplicated by **canonical filesystem path**:

```typescript
const canonicalPath = canonicalizePath(resolved);
if (seen.has(canonicalPath)) continue;
```

This catches cases where two source strings resolve to the same directory. But it does **not** catch cases where the same package is installed in two different locations (e.g., `.pi/git/` and a local fork).

### Step 5: Conflict Detection

`resource-loader.ts` → `detectExtensionConflicts()` (line ~882)

After all extensions are loaded, Pi checks for tool and flag name collisions across **different extension paths**. Conflicts are reported as errors but extensions remain loaded (precedence is by load order).

---

## Identity Key Calculation

`package-manager.ts` → `getPackageIdentity()` (line ~1606)

| Source String | Parsed Type | Identity Key |
|---------------|-------------|-------------|
| `npm:pi-tool-display` | npm | `npm:pi-tool-display` |
| `npm:@scope/pkg@1.2.3` | npm | `npm:@scope/pkg` (version stripped) |
| `git:github.com/nantas/pi-tool-display` | git | `git:github.com/nantas/pi-tool-display` |
| `git:git@github.com:nantas/pkg` | git | `git:github.com/nantas/pkg` (SSH normalized) |
| `/Users/x/forks/pkg` | local | `local:/Users/x/forks/pkg` |
| `../relative/pkg` | local | `local:<cwd-resolved-absolute-path>` |

### Critical Implication

**Identity is based on source type, not package name.** A local path and a git URL pointing to the same repository produce **different identities**:

```
project: /Users/x/forks/pi-tool-display  → identity: "local:/Users/x/forks/pi-tool-display"
global:  git:github.com/nantas/pi-tool-display → identity: "git:github.com/nantas/pi-tool-display"
```

These are **different keys** → `dedupePackages()` keeps both → both extensions load → tool name conflicts.

---

## Two-Layer Deduplication

Pi has two separate deduplication layers that operate on different keys:

| Layer | Location | Key | Scope |
|-------|----------|-----|-------|
| **Package dedup** | `dedupePackages()` | Identity key (type + name/path) | Cross-scope (project > user) |
| **Extension path dedup** | `mergePaths()` | Canonical filesystem path | Within a single merged list |

**Package dedup** happens first (decides which sources to resolve). **Extension path dedup** happens second (decides which resolved paths to load). Neither catches the "local path + git URL for same repo" case because:

1. Package dedup: different identities → not recognized as same package
2. Extension path dedup: different filesystem paths → not recognized as same directory

---

## Conflict Diagnosis Checklist

When Pi reports `Tool "X" conflicts with /path/to/extension`:

### 1. Check if two sources load the same package

```bash
# Project-level packages
cat .pi/settings.json | python3 -c "
import json, sys
for p in json.load(sys.stdin).get('packages', []):
    print(f'  PROJECT: {p}')
"

# Global-level packages
cat ~/.pi/agent/settings.json | python3 -c "
import json, sys
for p in json.load(sys.stdin).get('packages', []):
    print(f'  GLOBAL: {p}')
"
```

### 2. Identify identity mismatch

For each package that appears in both lists, check if the source types differ:

| Project Source | Global Source | Identity Match? | Conflict? |
|----------------|---------------|:---:|:---:|
| `git:github.com/user/pkg` | `git:github.com/user/pkg` | ✅ Same | No (project wins) |
| `npm:pkg` | `npm:pkg@1.0` | ✅ Same name | No (project wins) |
| `/path/to/fork/pkg` | `git:github.com/user/pkg` | ❌ local ≠ git | **Yes** |
| `file:/path/to/fork/pkg` | `git:github.com/user/pkg` | ❌ local ≠ git | **Yes** |

### 3. Remediation

**Option A**: Remove the global entry (temporary, for local testing):
```bash
# Edit ~/.pi/agent/settings.json, remove the conflicting git: entry
# Record the removal for later restoration
```

**Option B**: Switch project source back to git URL (permanent, after shipping):
```bash
# In .pi/settings.json, replace local path with git: URL
# Pi's package dedup will handle the rest
```

**Option C**: Run `scripts/sync-pi-agent.sh` to regenerate global settings from manifest, if the global entry is managed by capabilities.yaml.

---

## Scope Precedence Summary

| Scenario | Result |
|----------|--------|
| Same identity in project + global | Project wins, global ignored |
| Different identity, same package | Both load → potential conflicts |
| Only in global | Global loads normally |
| Only in project | Project loads normally |
| Local path in project, git in global | **Both load** (identity mismatch) |

---

## Relationship to Other Reference Documents

| Document | Scope | Relationship |
|----------|-------|-------------|
| This document | Package manager: loading, dedup, conflict diagnosis | What happens **before** extensions run |
| [pi-tool-api-dependency.md](./pi-tool-api-dependency.md) | ExtensionAPI boundary: `ToolInfo` vs `ToolDefinition` | What extensions **can access** after loading |
