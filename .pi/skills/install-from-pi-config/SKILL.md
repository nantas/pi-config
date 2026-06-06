---
name: install-from-pi-config
description: |
  Cross-repository capability installer — reads the pi-config catalog
  from ~/.pi/agent/catalog/pi-config.yaml and installs skills,
  extensions, or packages into the current repository's .pi/ directory.

  Use when: user wants to install a capability from the pi-config repository
  into their current project (e.g., "$install obsidian-search").
  Do NOT use for: installing npm/git packages directly (use pi install -l),
  or for general pi-config configuration changes.
---

# install-from-pi-config

A cross-repository capability installation skill. Reads the pi-config catalog
at `~/.pi/agent/catalog/pi-config.yaml` and installs declared capabilities
into the current repository's `.pi/` directory.

## Workflow Overview

| Phase | Name | Exit Criteria |
|-------|------|---------------|
| 1 | Discover Catalog | Catalog file read, `source_repo_path` resolved |
| 2 | Match Capability | Requested capability found in catalog or not-found reported |
| 3 | Resolve Dependencies | Transitive `requires` resolved, combined plan presented |
| 4 | Install (File-Based) | Skill/extension directories copied to target `.pi/` |
| 4b | Install (Settings-Entry) | Package source added to target `.pi/settings.json` |
| 5 | npm Dependencies | `npm install` executed if `has_package_json: true` or single-file extension imports detected |
| 6 | Verify Installation | Files exist or settings entry confirmed |

---

## Phase 1: Discover Catalog

**Goal:** Read the pi-config catalog to discover available capabilities and the source repository path.

### Step 1 — Read the catalog file

The catalog is published at `~/.pi/agent/catalog/pi-config.yaml` by the pi-config sync script.

```bash
if [[ -f "$HOME/.pi/agent/catalog/pi-config.yaml" ]]; then
  cat "$HOME/.pi/agent/catalog/pi-config.yaml"
else
  echo "Catalog not found: ~/.pi/agent/catalog/pi-config.yaml"
  echo "This catalog is published by the pi-config repository after running scripts/sync-pi-agent.sh."
  exit 1
fi
```

Parse the catalog to extract:
- `source_repo_path` — absolute path to the pi-config repository.
- `catalog.skills` — list of installable skills with name, source, description, and optional requires.
- `catalog.extensions` — list of installable extensions with name, source, description, and optional has_package_json.
- `catalog.packages` — list of installable packages with name, source, description, and type.

### Step 2 — Report catalog contents

Present the available capabilities to the user:

```
## Pi-Config Capability Catalog

### Skills
- obsidian-search — Intelligent Obsidian vault retrieval (requires: obsidian-tools)
- pi-extension-dev — Guide through Pi extension development lifecycle
- pkg-research — Structured workflow for researching Pi packages

### Extensions
- obsidian-tools — Obsidian integration tools (has package.json: true)

### Packages
- pi-mcp-adapter@2.5.1 — Pi MCP adapter (settings-entry)
- lsp-pi — LSP integration (settings-entry)
```

---

## Phase 2: Match Capability

**Goal:** Find the requested capability in the catalog or report it as unavailable.

### Step 1 — Match user request

The user specifies a capability name (e.g., `obsidian-search`, `obsidian-tools`, `lsp-pi`). Match it against `catalog.skills[].name`, `catalog.extensions[].name`, and `catalog.packages[].name`.

**If matched:** Record which catalog section the capability belongs to and proceed to Phase 3.
**If not matched:** Report:
```
Capability "{{name}}" not found in the pi-config catalog.

Available capabilities:
- Skills: [...]
- Extensions: [...]
- Packages: [...]
```

### Step 2 — Determine install type

From the catalog entry:
- **skills** → file-based install (Phase 4)
- **extensions** → file-based install (Phase 4) + possibly npm install (Phase 5)
- **packages** with `type: settings-entry` → settings-entry install (Phase 4b)

---

## Phase 3: Resolve Dependencies

**Goal:** Resolve transitive dependencies declared in catalog entries and present the complete installation plan.

### Step 1 — Build dependency tree

If the requested capability has a `requires` field, traverse it:

```yaml
# Example: obsidian-search has a dependency
requires:
  extensions:
    - obsidian-tools
```

For each dependency:
- Check if it already exists in the target repository
- If not, add it to the installation plan
- Recursively resolve any sub-dependencies

### Step 2 — Check for already-installed dependencies

For each dependency, check if the target path already exists:

```bash
# Check if skill exists
[[ -d ".pi/skills/{{name}}" ]] && echo "already installed"
# Check if extension exists
[[ -d ".pi/extensions/{{name}}" ]] && echo "already installed"
```

Already-installed dependencies are skipped and reported as "already present".

### Step 3 — Present installation plan

Show the user what will be installed:

```
## Installation Plan

The following capabilities will be installed:

Requested: obsidian-search (skill)
Dependencies:
  - obsidian-tools (extension) — NEW

Total: 2 items

Proceed with installation? (yes/no)
```

Wait for user confirmation before proceeding.

---

## Phase 4: File-Based Installation

**Goal:** Copy skill directories or extension files from the source repository.

### Prerequisites

- `source_repo_path` resolved from catalog (`~/.pi/agent/catalog/pi-config.yaml`)
- User confirmed the installation plan

### Step 1 — Copy files

For **skills**:
```bash
SOURCE="{{source_repo_path}}/.pi/skills/{{name}}/"
TARGET="{{target_repo}}/.pi/skills/{{name}}/"

if [[ -d "$TARGET" ]]; then
  # Prompt user: overwrite?
  echo "Target path already exists: $TARGET"
  echo "Overwrite? (yes/no)"
  read -r overwrite
  if [[ "$overwrite" != "yes" ]]; then
    echo "Skipping: $name"
    return
  fi
  rm -rf "$TARGET"
fi

mkdir -p "$(dirname "$TARGET")"
cp -R "$SOURCE" "$TARGET"
echo "Installed: $name → $TARGET"
```

For **extensions** — auto-detect single-file (`.ts`) vs directory:
```bash
SOURCE_REPO="{{source_repo_path}}"
TARGET_REPO="{{target_repo}}"
NAME="{{name}}"

# Detect source type: single-file (.ts) or directory
if [[ -f "$SOURCE_REPO/.pi/extensions/$NAME.ts" ]]; then
  # Single-file extension
  SOURCE="$SOURCE_REPO/.pi/extensions/$NAME.ts"
  TARGET="$TARGET_REPO/.pi/extensions/$NAME.ts"

  if [[ -f "$TARGET" ]]; then
    echo "Target file already exists: $TARGET"
    echo "Overwrite? (yes/no)"
    read -r overwrite
    if [[ "$overwrite" != "yes" ]]; then
      echo "Skipping: $NAME"
      return
    fi
  fi

  mkdir -p "$(dirname "$TARGET")"
  cp "$SOURCE" "$TARGET"
  echo "Installed (single-file): $NAME → $TARGET"
elif [[ -d "$SOURCE_REPO/.pi/extensions/$NAME" ]]; then
  # Directory extension
  SOURCE="$SOURCE_REPO/.pi/extensions/$NAME/"
  TARGET="$TARGET_REPO/.pi/extensions/$NAME/"

  if [[ -d "$TARGET" ]]; then
    echo "Target path already exists: $TARGET"
    echo "Overwrite? (yes/no)"
    read -r overwrite
    if [[ "$overwrite" != "yes" ]]; then
      echo "Skipping: $NAME"
      return
    fi
    rm -rf "$TARGET"
  fi

  mkdir -p "$(dirname "$TARGET")"
  cp -R "$SOURCE" "$TARGET"
  echo "Installed (directory): $NAME → $TARGET"
else
  echo "Error: Extension source not found: $NAME"
  echo "Checked:"
  echo "  - $SOURCE_REPO/.pi/extensions/$NAME.ts (single-file)"
  echo "  - $SOURCE_REPO/.pi/extensions/$NAME/ (directory)"
  return 1
fi
```

---

## Phase 4b: Settings-Entry Installation

**Goal:** Add a package source to the target repository's `.pi/settings.json` packages array.

### Step 1 — Read target settings

Read the target repository's `.pi/settings.json`:

```bash
SETTINGS="{{target_repo}}/.pi/settings.json"
```

### Step 2 — Check for duplicate

If the package source already exists in `packages` array:
```json
{
  "packages": ["npm:lsp-pi", ...]
}
```
→ Report that the package is already installed and skip.

### Step 3 — Append to packages array

Use the edit tool to append the package source string to the `packages` array.

### Step 4 — Guide restart

```
Package "{{name}}" ({{source}}) has been added to .pi/settings.json.

To complete installation, please:
1. Exit the current Pi session (/exit or Ctrl+C)
2. Restart Pi in this repository

This triggers Pi's package loader to install the package.
```

---

## Phase 5: npm Dependencies

**Goal:** Install npm dependencies for extensions.

### Step 1 — Directory extension dependencies

If the catalog entry has `has_package_json: true`:

```bash
TARGET_DIR="{{target_repo}}/.pi/extensions/{{name}}/"

if [[ -f "$TARGET_DIR/package.json" ]]; then
  echo "Installing npm dependencies for $name..."
  cd "$TARGET_DIR"
  npm install --no-package-lock --ignore-scripts
  echo "npm dependencies installed."
fi
```

### Step 2 — Single-file extension dependencies

For single-file extensions (`.ts`), scan the file for npm `import` statements
and install detected packages into the target repository's `.pi/npm/`:

```bash
TARGET_REPO="{{target_repo}}"
NAME="{{name}}"
EXT_FILE="$TARGET_REPO/.pi/extensions/$NAME.ts"

if [[ -f "$EXT_FILE" ]]; then
  echo "Scanning $NAME.ts for npm dependencies..."

  # Extract import package names, excluding:
  #   - node: built-in modules (node:fs, node:path, etc.)
  #   - relative imports (./ or ../)
  #   - bare file imports
  PACKAGES=$(grep -oP 'from\s+["\'](@?[^"\'./]+[^"\']*)["\'\)]' "$EXT_FILE" \
    | grep -oP '(?<=from\s+["\'])@?[^"\'']+' \
    | grep -v '^node:' \
    | grep -v '^\.' \
    | sort -u)

  if [[ -n "$PACKAGES" ]]; then
    PKG_LIST=($PACKAGES)
    echo "Detected npm packages: ${PKG_LIST[*]}"

    NPM_DIR="$TARGET_REPO/.pi/npm"
    mkdir -p "$NPM_DIR"

    # Initialize package.json if missing
    if [[ ! -f "$NPM_DIR/package.json" ]]; then
      cd "$NPM_DIR"
      npm init -y > /dev/null 2>&1
    fi

    cd "$NPM_DIR"
    echo "Installing npm packages for single-file extension $NAME..."
    npm install "${PKG_LIST[@]}"
    echo "npm dependencies installed for $NAME."
  else
    echo "No external npm dependencies found for $NAME."
  fi
fi
```

### Step 3 — No dependencies

If neither `has_package_json` is set nor the extension is a single-file,
skip this phase.

---

## Phase 6: Verify Installation

**Goal:** Confirm that all files exist at expected target paths or the settings entry is correct.

### For file-based installs

```bash
# Verify skill
[[ -f ".pi/skills/{{name}}/SKILL.md" ]] && echo "✓ Skill installed: $name"
# Verify extension (directory or single-file)
[[ -f ".pi/extensions/{{name}}/index.ts" ]] || [[ -f ".pi/extensions/{{name}}/index.js" ]] \
  && echo "✓ Extension installed (directory): $name"
[[ -f ".pi/extensions/{{name}}.ts" ]] \
  && echo "✓ Extension installed (single-file): $name"
```

### For settings-entry installs

Verify the target `.pi/settings.json` contains the package source:

```bash
node -e "const s = require('.pi/settings.json'); console.log('packages:', JSON.stringify(s.packages))"
# Verify the package source is in the array
node -e "const s = require('.pi/settings.json'); const found = s.packages.includes('{{source}}'); process.exit(found ? 0 : 1)" && echo "✓ Package entry confirmed" || echo "✗ Package entry not found"
```

### Report results

```
## Installation Complete

Installed capabilities:
- [x] {{name}} ({{type}})
- [x] {{dependency1}} (dependency)

Restart Pi with /reload to activate new extensions/skills.
For packages: restart Pi session.
```

---

## Appendix: Key File Paths

| Path | Purpose |
|---|---|
| `~/.pi/agent/catalog/pi-config.yaml` | Pi-config capability catalog |
| `{{source_repo}}/.pi/skills/` | Source skill directories |
| `{{source_repo}}/.pi/extensions/` | Source extension directories |
| `{{target_repo}}/.pi/settings.json` | Target package configuration |

## Constraints

- **Catalog must exist** — cannot run without `~/.pi/agent/catalog/pi-config.yaml`
- **Dependencies are resolved recursively** — all transitive deps are included in the plan
- **Overwrite requires confirmation** — never overwrite existing files without asking
- **Settings-entry packages require Pi restart** — always guide user to restart
- **All paths are absolute** — resolve source_repo_path and target_repo_path to absolute paths
