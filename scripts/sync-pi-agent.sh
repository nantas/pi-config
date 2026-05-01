#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_ROOT="${PI_SOURCE_ROOT:-${REPO_ROOT}/.pi}"
TARGET_ROOT="${PI_AGENT_HOME:-${HOME}/.pi/agent}"



# --- Helper Functions ---

ensure_extension_dependencies() {
  local extensions_dir="${SOURCE_ROOT}/extensions"
  if [[ ! -d "${extensions_dir}" ]]; then
    return
  fi

  for ext_dir in "${extensions_dir}"/*/; do
    if [[ ! -f "${ext_dir}/package.json" ]]; then
      continue
    fi

    local ext_name
    ext_name="$(basename "${ext_dir}")"

    if [[ -d "${ext_dir}/node_modules" ]] && ls "${ext_dir}/node_modules/"* >/dev/null 2>&1; then
      continue
    fi

    echo "  Installing dependencies for: ${ext_name}"
    (cd "${ext_dir}" && npm install --no-package-lock --ignore-scripts)
  done
}

# Parse .pi/capabilities.yaml using node (no yq dependency)
# Usage: parse_manifest <field_path>
# Returns JSON string. Field path uses dot notation for arrays.
parse_manifest() {
  local field="$1"
  node -e "
const fs = require('fs');
const path = require('path');

// Minimal YAML parsing — only handles our known structure.
// We use line-based extraction to avoid js-yaml dependency.
function readYamlValue(text, section) {
  const lines = text.split('\n');
  const result = [];
  let inSection = false;
  let indent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find the section start
    if (line.trim() === section + ':') {
      inSection = true;
      indent = line.search(/\\S/);
      continue;
    }

    if (!inSection) continue;

    // Check if we've left the section
    const currentIndent = line.search(/\\S/);
    if (currentIndent <= indent && line.trim() !== '' && !line.startsWith(' '.repeat(indent + 2))) {
      break;
    }

    // Collect list items
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      result.push(trimmed.slice(2).trim());
    }
  }

  return JSON.stringify(result);
}

const content = fs.readFileSync('${REPO_ROOT}/.pi/capabilities.yaml', 'utf8');
const field = '$field';

// Handle nested dot paths like 'global.settings.packages'
const parts = field.split('.');

if (parts.length === 2 && parts[1] === 'packages') {
  // Extract packages from settings sub-section
  const lines = content.split('\\n');
  const pkgs = [];
  let inPackages = false;
  let packagesIndent = 0;

  for (const line of lines) {
    if (line.trim() === 'packages:' && line.includes('settings')) {
      inPackages = true;
      packagesIndent = line.search(/\\S/);
      continue;
    }
    if (!inPackages) continue;

    const ci = line.search(/\\S/);
    if (ci <= packagesIndent && line.trim() !== '' && !line.startsWith(' '.repeat(packagesIndent + 2))) {
      break;
    }

    if (line.trimStart().startsWith('- ')) {
      pkgs.push(line.trimStart().slice(2).trim());
    }
  }
  console.log(JSON.stringify(pkgs));
} else if (parts.length === 2 && parts[1] === 'exclude_keys') {
  const lines = content.split('\\n');
  const keys = [];
  let inExclude = false;
  let excludeIndent = 0;

  for (const line of lines) {
    if (line.trim() === 'exclude_keys:' && line.includes('settings')) {
      inExclude = true;
      excludeIndent = line.search(/\\S/);
      continue;
    }
    if (!inExclude) continue;

    const ci = line.search(/\\S/);
    if (ci <= excludeIndent && line.trim() !== '' && !line.startsWith(' '.repeat(excludeIndent + 2))) {
      break;
    }

    if (line.trimStart().startsWith('- ')) {
      keys.push(line.trimStart().slice(2).trim());
    }
  }
  console.log(JSON.stringify(keys));
} else {
  // Simple top-level list extraction: section is the last part
  const sectionName = parts[parts.length - 1];
  const result = readYamlValue(content, sectionName);
  console.log(result);
}
" 2>/dev/null
}

# Strip quotes from a parsed value
strip_quotes() {
  local val="$1"
  val="${val#\"}"
  val="${val%\"}"
  echo "$val"
}

# Sync a single file
sync_file() {
  local source_path="$1"
  local target_path="$2"
  mkdir -p "$(dirname "${target_path}")"
  cp "${source_path}" "${target_path}"
}

# Sync a directory tree
sync_dir() {
  local source_path="$1"
  local target_path="$2"

  if [[ -d "${source_path}" ]]; then
    rm -rf "${target_path}"
    mkdir -p "$(dirname "${target_path}")"
    cp -R "${source_path}" "${target_path}"
    find "${target_path}" -name ".gitkeep" -delete
  else
    rm -rf "${target_path}"
  fi
}

# Remove a stale item from target
remove_stale() {
  local target_path="$1"
  if [[ -e "${target_path}" ]]; then
    rm -rf "${target_path}"
    echo "  Removed stale: ${target_path}"
  fi
}

# --- Render settings.json with manifest filtering ---
render_settings_file() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "${target_path}")"

  if [[ ! -f "${source_path}" ]]; then
    rm -f "${target_path}"
    return
  fi

  local manifest_file="${REPO_ROOT}/.pi/capabilities.yaml"

  if [[ ! -f "${manifest_file}" ]]; then
    echo "ERROR: ${manifest_file} not found. Cannot sync settings without manifest." >&2
    exit 1
  fi

  # Parse whitelist and exclude_keys via node
  node <<'NODEEOF'
const fs = require("fs");
const path = require("path");

const sourcePath = process.env.SOURCE_PATH;
const targetPath = process.env.TARGET_PATH;
const manifestPath = process.env.MANIFEST_PATH;


const content = fs.readFileSync(manifestPath, "utf8");
const lines = content.split("\n");

// Extract global.settings.packages (whitelist)
const whitelist = [];
let inPackages = false;
let pkgIndent = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^\s+packages:/.test(line) && /\s+settings:/.test(lines.slice(Math.max(0,i-3), i).join("\n"))) {
    inPackages = true;
    pkgIndent = line.search(/\S/);
    continue;
  }
  if (!inPackages) continue;
  const ci = line.search(/\S/);
  if (ci <= pkgIndent && line.trim() !== "" && !line.startsWith(" ".repeat(pkgIndent + 2))) break;
  if (line.trimStart().startsWith("- ")) {
    whitelist.push(line.trimStart().slice(2).trim());
  }
}

// Extract global.settings.exclude_keys
const excludeKeys = [];
let inExclude = false;
let excIndent = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^\s+exclude_keys:/.test(line)) {
    inExclude = true;
    excIndent = line.search(/\S/);
    continue;
  }
  if (!inExclude) continue;
  const ci = line.search(/\S/);
  if (ci <= excIndent && line.trim() !== "" && !line.startsWith(" ".repeat(excIndent + 2))) break;
  if (line.trimStart().startsWith("- ")) {
    excludeKeys.push(line.trimStart().slice(2).trim());
  }
}

// Read settings
const settings = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const packages = Array.isArray(settings.packages) ? settings.packages : [];

// Whitelist filter
settings.packages = packages.filter((entry) => {
  const source = (typeof entry === "string") ? entry : (entry.source || "");
  return whitelist.includes(source);
});

// (no local package path rendering needed — all packages are npm/git entries)

// Remove excluded keys
for (const key of excludeKeys) {
  delete settings[key];
}

fs.writeFileSync(targetPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
NODEEOF
}

# --- Sync managed paths from manifest ---
sync_from_manifest() {
  local manifest_file="${REPO_ROOT}/.pi/capabilities.yaml"

  if [[ ! -f "${manifest_file}" ]]; then
    echo "ERROR: ${manifest_file} not found. Run from pi-config repository root." >&2
    exit 1
  fi

  # Read manifest and sync using node (reliable JSON parsing)
  node <<'NODEEOF'
const fs = require("fs");
const path = require("path");

const manifestPath = process.env.MANIFEST_PATH;
const sourceRoot = process.env.SOURCE_ROOT;
const targetRoot = process.env.TARGET_ROOT;
const repoRoot = process.env.REPO_ROOT;

const content = fs.readFileSync(manifestPath, "utf8");
const lines = content.split("\n");

// Parse a YAML list at a given indentation level under a parent keyword
function parseListUnder(lines, parentKeyword) {
  // Find the parent line
  let parentIdx = -1;
  let parentIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(parentKeyword + ":") || trimmed === parentKeyword + ":") {
      parentIdx = i;
      parentIndent = lines[i].search(/\S/);
      break;
    }
  }
  if (parentIdx === -1) return [];

  const results = [];
  for (let i = parentIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const ci = line.search(/\S/);
    // Return if we hit a sibling at same or lesser indent
    if (ci <= parentIndent && line.trim() !== "") break;
    // Must be at parentIndent + 2 or more
    if (ci < parentIndent + 2) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      results.push(trimmed.slice(2).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
    }
  }
  return results;
}

// Extract global.extensions, global.agents, global.skills
const extensions = parseListUnder(lines, "extensions");
const agents = parseListUnder(lines, "agents");
const skills = parseListUnder(lines, "skills");

// Separate global extensions vs catalog extensions by context:
// Global extensions are under "global:" section, catalog under "catalog:"
// We need to find which section each list is under
function findSectionKw(keyword) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === keyword + ":") return "global";
    // Check if it's under a section header
    if (trimmed.startsWith(keyword + ":")) {
      // Walk back to find which section
      for (let j = i - 1; j >= 0; j--) {
        const t = lines[j].trim();
        if (t === "global:" || t.startsWith("global:")) return "global";
        if (t === "catalog:" || t.startsWith("catalog:")) return "catalog";
      }
      return "unknown";
    }
  }
  return "unknown";
}

// Collect manifests: { name, type }
const globalItems = [];

// Global extensions
const globalLines = content.split("\n");
let inGlobal = false;
let inCatalog = false;
let globalIndent = 0;
let catalogIndent = 0;

// Find indent levels
for (const line of globalLines) {
  const trimmed = line.trim();
  if (trimmed === "global:") { inGlobal = true; globalIndent = line.search(/\S/); }
  else if (trimmed === "catalog:") { inCatalog = true; catalogIndent = line.search(/\S/); }
  else if (inGlobal && trimmed !== "" && line.search(/\S/) <= globalIndent) inGlobal = false;
  else if (inCatalog && trimmed !== "" && line.search(/\S/) <= catalogIndent) inCatalog = false;
}

// Determine which list entries are in global vs catalog
function itemsInSection(sectionLines, keyword, sectionIndent, isInSection) {
  const items = [];
  if (!isInSection) return items;

  let foundKw = false;
  for (const line of sectionLines) {
    const trimmed = line.trim();
    const ci = line.search(/\S/);

    if (trimmed === keyword + ":" || trimmed.startsWith(keyword + ":")) {
      foundKw = true;
      continue;
    }
    if (!foundKw) continue;
    // Stop at next sibling key
    if (ci <= sectionIndent + 2) {
      // Could be another key at same level as the keyword
      if (trimmed !== "" && !trimmed.startsWith("-") && !trimmed.startsWith("#")) {
        // Check if this is a sibling key at same indent
        const nextColon = trimmed.indexOf(":");
        if (nextColon > 0 && ci >= sectionIndent + 2) break;
      }
    }
    if (ci <= sectionIndent && trimmed !== "") break;
    if (ci < sectionIndent + 2) continue;

    if (trimmed.startsWith("- ")) {
      items.push(trimmed.slice(2).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
    }
  }
  return items;
}

// Extract items section by section
// We'll do it differently - just parse the global section
function extractItems(sectionName, keyword) {
  const result = [];
  let inSection = false;
  let inKeyword = false;
  let sectionIndent = 0;
  let keywordIndent = 0;

  for (const line of globalLines) {
    const trimmed = line.trim();
    const ci = line.search(/\S/);

    // Track section (global/catalog)
    if (trimmed === sectionName + ":") {
      inSection = true;
      inKeyword = false;
      sectionIndent = ci;
      continue;
    }

    if (!inSection) continue;

    // Detect if we left the section
    if (trimmed !== "" && ci <= sectionIndent && !trimmed.startsWith("#")) {
      inSection = false;
      inKeyword = false;
      continue;
    }

    // Inside section: look for the keyword (e.g., "extensions:")
    if (!inKeyword && (trimmed === keyword + ":" || trimmed.startsWith(keyword + ":"))) {
      inKeyword = true;
      keywordIndent = ci;
      continue;
    }

    if (!inKeyword) continue;

    // Detect if we left the keyword list
    if (trimmed !== "" && ci <= keywordIndent && !trimmed.startsWith("#") && !trimmed.startsWith("-")) break;

    // Collect list items
    if (trimmed.startsWith("- ")) {
      result.push(trimmed.slice(2).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
    }
  }

  return result;
}

// Get global items for each type
const globalExts = extractItems("global", "extensions");
const globalAgents = extractItems("global", "agents");
const globalSkills = extractItems("global", "skills");

// --- SYNC EXTENSIONS ---
console.log("\n--- Syncing global extensions ---");
for (const extName of globalExts) {
  // Check single-file .ts first
  const singleFile = path.join(sourceRoot, "extensions", extName + ".ts");
  const dirPath = path.join(sourceRoot, "extensions", extName);
  const targetFile = path.join(targetRoot, "extensions", extName + ".ts");
  const targetDir = path.join(targetRoot, "extensions", extName);

  if (fs.existsSync(singleFile)) {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.cpSync(singleFile, targetFile, { force: true });
    console.log("  Synced extension:", extName + ".ts");
  } else if (fs.existsSync(dirPath)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.cpSync(dirPath, targetDir, { recursive: true, force: true });
    console.log("  Synced extension dir:", extName + "/");
  } else {
    console.log("  WARNING: Extension not found:", extName);
  }
}

// --- STALE EXTENSION CLEANUP ---
const existingExts = fs.existsSync(path.join(targetRoot, "extensions"))
  ? fs.readdirSync(path.join(targetRoot, "extensions"), { withFileTypes: true })
  : [];
for (const entry of existingExts) {
  const name = entry.name;
  // Skip .gitkeep
  if (name === ".gitkeep") continue;
  // Strip .ts extension for comparison
  const baseName = name.endsWith(".ts") ? name.slice(0, -3) : name;
  if (!globalExts.includes(baseName)) {
    const fullPath = path.join(targetRoot, "extensions", name);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log("  Removed stale extension:", name);
  }
}

// --- SYNC AGENTS ---
console.log("\n--- Syncing global agents ---");
for (const agentName of globalAgents) {
  const sourceFile = path.join(sourceRoot, "agents", agentName + ".md");
  const targetFile = path.join(targetRoot, "agents", agentName + ".md");

  if (fs.existsSync(sourceFile)) {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.cpSync(sourceFile, targetFile, { force: true });
    console.log("  Synced agent:", agentName + ".md");
  } else {
    console.log("  WARNING: Agent not found:", agentName);
  }
}

// --- STALE AGENT CLEANUP ---
const existingAgents = fs.existsSync(path.join(targetRoot, "agents"))
  ? fs.readdirSync(path.join(targetRoot, "agents"), { withFileTypes: true })
  : [];
for (const entry of existingAgents) {
  const name = entry.name;
  if (name === ".gitkeep") continue;
  const baseName = name.endsWith(".md") ? name.slice(0, -3) : name;
  if (!globalAgents.includes(baseName)) {
    const fullPath = path.join(targetRoot, "agents", name);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log("  Removed stale agent:", name);
  }
}

// --- SYNC SKILLS ---
console.log("\n--- Syncing global skills ---");
for (const skillName of globalSkills) {
  const sourceDir = path.join(sourceRoot, "skills", skillName);
  const targetDir = path.join(targetRoot, "skills", skillName);

  if (fs.existsSync(sourceDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
    console.log("  Synced skill:", skillName + "/");
  } else {
    console.log("  WARNING: Skill not found:", skillName);
  }
}

// --- STALE SKILL CLEANUP ---
const existingSkills = fs.existsSync(path.join(targetRoot, "skills"))
  ? fs.readdirSync(path.join(targetRoot, "skills"), { withFileTypes: true })
  : [];
for (const entry of existingSkills) {
  const name = entry.name;
  if (name === ".gitkeep") continue;
  if (!globalSkills.includes(name)) {
    const fullPath = path.join(targetRoot, "skills", name);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log("  Removed stale skill:", name);
  }
}

// --- CATALOG PUBLISH ---
console.log("\n--- Publishing catalog ---");
// Extract catalog section (everything under "catalog:")
function extractCatalogYaml(content) {
  const allLines = content.split("\n");
  let inCatalog = false;
  let catalogIndent = 0;
  const catalogLines = [];

  for (const line of allLines) {
    const trimmed = line.trim();
    const ci = line.search(/\S/);

    if (trimmed === "catalog:") {
      inCatalog = true;
      catalogIndent = ci;
      catalogLines.push(line);
      continue;
    }

    if (!inCatalog) continue;

    if (trimmed !== "" && ci <= catalogIndent) {
      break;
    }

    catalogLines.push(line);
  }

  return catalogLines.join("\n");
}

const catalogYaml = extractCatalogYaml(content);
const sourceRepoPath = repoRoot;

const catalogTargetDir = path.join(targetRoot, "catalog");
fs.mkdirSync(catalogTargetDir, { recursive: true });

// Write catalog as YAML with source_repo_path header
const catalogContent = `# Pi-Config Capability Catalog
# Published by ${repoRoot}/scripts/sync-pi-agent.sh
# Generated: ${new Date().toISOString()}
source_repo_path: ${sourceRepoPath}
${catalogYaml}
`;

fs.writeFileSync(path.join(catalogTargetDir, "pi-config.yaml"), catalogContent, "utf8");
console.log("  Catalog published to:", path.join(catalogTargetDir, "pi-config.yaml"));
console.log("  Source repo path:", sourceRepoPath);
NODEEOF
}

# --- Sync prompts and themes (unchanged, not catalog'd) ---
sync_prompts_and_themes() {
  # prompts: full directory copy
  if [[ -d "${SOURCE_ROOT}/prompts" ]]; then
    rm -rf "${TARGET_ROOT}/prompts"
    cp -R "${SOURCE_ROOT}/prompts" "${TARGET_ROOT}/prompts"
    find "${TARGET_ROOT}/prompts" -name ".gitkeep" -delete
    echo "  Synced prompts/"
  else
    rm -rf "${TARGET_ROOT}/prompts"
  fi

  # themes: full directory copy
  if [[ -d "${SOURCE_ROOT}/themes" ]]; then
    rm -rf "${TARGET_ROOT}/themes"
    cp -R "${SOURCE_ROOT}/themes" "${TARGET_ROOT}/themes"
    find "${TARGET_ROOT}/themes" -name ".gitkeep" -delete
    echo "  Synced themes/"
  else
    rm -rf "${TARGET_ROOT}/themes"
  fi
}

# --- Sync AGENTS.md + AGENTS.d/ ---
sync_agents_md() {
  local source_path="${REPO_ROOT}/.pi/agent/AGENTS.md"
  local target_path="${TARGET_ROOT}/AGENTS.md"
  local source_dir="${REPO_ROOT}/.pi/agent/AGENTS.d"
  local target_dir="${TARGET_ROOT}/AGENTS.d"

  mkdir -p "${TARGET_ROOT}"

  if [[ -f "${source_path}" ]]; then
    cp "${source_path}" "${target_path}"
    echo "  Synced AGENTS.md"
  else
    rm -f "${target_path}"
  fi

  # Sync AGENTS.d/ directory (on-demand detail files)
  if [[ -d "${source_dir}" ]]; then
    rm -rf "${target_dir}"
    cp -R "${source_dir}" "${target_dir}"
    echo "  Synced AGENTS.d/"
  else
    rm -rf "${target_dir}"
  fi
}

# --- Main ---

echo "Checking extension dependencies..."
ensure_extension_dependencies

echo "Syncing managed Pi paths from manifest..."
echo "  Source: ${SOURCE_ROOT}"
echo "  Target: ${TARGET_ROOT}"
echo "  Manifest: ${REPO_ROOT}/.pi/capabilities.yaml"
echo ""

# Export env vars for node scripts
export MANIFEST_PATH="${REPO_ROOT}/.pi/capabilities.yaml"
export SOURCE_ROOT
export TARGET_ROOT
export REPO_ROOT

export SOURCE_PATH="${SOURCE_ROOT}/settings.json"
export TARGET_PATH="${TARGET_ROOT}/settings.json"

# 1. Sync manifest-driven resources (extensions, agents, skills)
sync_from_manifest

# 2. Sync settings.json with manifest filtering
echo ""
echo "--- Syncing settings.json ---"
render_settings_file "${SOURCE_PATH}" "${TARGET_PATH}"
echo "  Synced settings.json (filtered by manifest)"

# 3. Sync prompts and themes (unchanged, full copy)
echo ""
echo "--- Syncing prompts and themes ---"
sync_prompts_and_themes

# 4. Sync AGENTS.md
echo ""
echo "--- Syncing AGENTS.md ---"
sync_agents_md

# 5. Summary
echo ""
cat <<EOF
========================================
Sync Complete
========================================
Managed by manifest (.pi/capabilities.yaml):
  extensions/     -> ~/.pi/agent/extensions/  (whitelist: global.extensions)
  agents/         -> ~/.pi/agent/agents/      (whitelist: global.agents)
  skills/         -> ~/.pi/agent/skills/      (whitelist: global.skills)
  settings.json   -> ~/.pi/agent/settings.json (filtered: packages whitelist + exclude_keys)
  catalog/        -> ~/.pi/agent/catalog/pi-config.yaml

Unchanged (full directory copy):
  prompts/        -> ~/.pi/agent/prompts/
  themes/         -> ~/.pi/agent/themes/
  AGENTS.md       -> ~/.pi/agent/AGENTS.md
  AGENTS.d/       -> ~/.pi/agent/AGENTS.d/      (on-demand detail files)
EOF
