#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_ROOT="${PI_SOURCE_ROOT:-${REPO_ROOT}/.pi}"
TARGET_ROOT="${PI_AGENT_HOME:-${HOME}/.pi/agent}"

# Extensions in this list are NOT synced to the global Pi runtime.
# They remain project-local to avoid shortcut conflicts or duplicate
# registration with the globally-synced copy.
# Add filenames (without path) to keep project-specific extensions local.
declare -a EXTENSIONS_EXCLUDE=(
  "planner-toggle.ts"
)

declare -a MAPPINGS=(
  "settings.json:settings.json:file"
  "extensions:extensions:dir"
  "prompts:prompts:dir"
  "themes:themes:dir"
  "agents:agents:dir"
)

LOCAL_PACKAGE_REL="packages/subagent-dispatch"
LOCAL_PACKAGE_SOURCE="./packages/subagent-dispatch"
LOCAL_PACKAGE_ROOT="${SOURCE_ROOT}/${LOCAL_PACKAGE_REL}"

ensure_local_package_dependencies() {
  if [[ ! -f "${LOCAL_PACKAGE_ROOT}/package.json" ]]; then
    return
  fi

  if [[ -d "${LOCAL_PACKAGE_ROOT}/node_modules/pi-subagents" ]]; then
    return
  fi

  npm install --no-package-lock --ignore-scripts --prefix "${LOCAL_PACKAGE_ROOT}"
}

render_settings_file() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "${target_path}")"

  if [[ ! -f "${source_path}" ]]; then
    rm -f "${target_path}"
    return
  fi

  SOURCE_PATH="${source_path}" \
  TARGET_PATH="${target_path}" \
  LOCAL_PACKAGE_SOURCE="${LOCAL_PACKAGE_SOURCE}" \
  LOCAL_PACKAGE_ROOT="${LOCAL_PACKAGE_ROOT}" \
  node <<'EOF'
const fs = require("node:fs");

const sourcePath = process.env.SOURCE_PATH;
const targetPath = process.env.TARGET_PATH;
const localPackageSource = process.env.LOCAL_PACKAGE_SOURCE;
const localPackageRoot = process.env.LOCAL_PACKAGE_ROOT;

const settings = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const packages = Array.isArray(settings.packages) ? settings.packages : [];

settings.packages = packages.map((entry) => {
  if (entry === localPackageSource) {
    return localPackageRoot;
  }

  if (entry && typeof entry === "object" && entry.source === localPackageSource) {
    return { ...entry, source: localPackageRoot };
  }

  return entry;
});

fs.writeFileSync(targetPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
EOF
}

sync_file() {
  local source_path="$1"
  local target_path="$2"
  render_settings_file "${source_path}" "${target_path}"
}

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

sync_agents_md() {
  local source_path="${REPO_ROOT}/.pi/agent/AGENTS.md"
  local target_path="${TARGET_ROOT}/AGENTS.md"

  mkdir -p "${TARGET_ROOT}"

  if [[ -f "${source_path}" ]]; then
    cp "${source_path}" "${target_path}"
  else
    rm -f "${target_path}"
  fi
}

ensure_local_package_dependencies

for mapping in "${MAPPINGS[@]}"; do
  IFS=":" read -r source_rel target_rel kind <<< "${mapping}"
  source_path="${SOURCE_ROOT}/${source_rel}"
  target_path="${TARGET_ROOT}/${target_rel}"

  if [[ "${kind}" == "file" ]]; then
    sync_file "${source_path}" "${target_path}"
  else
    sync_dir "${source_path}" "${target_path}"
    # Remove project-local extensions from the global target
    if [[ "${source_rel}" == "extensions" ]]; then
      for exclude_file in "${EXTENSIONS_EXCLUDE[@]}"; do
        rm -f "${target_path}/${exclude_file}"
      done
    fi
  fi
done

# Sync AGENTS.md (plain file copy, not via render_settings_file which processes JSON)
sync_agents_md

cat <<EOF
Synced managed Pi paths from:
  ${SOURCE_ROOT}
to:
  ${TARGET_ROOT}

Managed mappings:
  .pi/settings.json       -> ~/.pi/agent/settings.json
  .pi/extensions/         -> ~/.pi/agent/extensions/
  .pi/prompts/            -> ~/.pi/agent/prompts/
  .pi/themes/             -> ~/.pi/agent/themes/
  .pi/agents/             -> ~/.pi/agent/agents/
  .pi/agent/AGENTS.md     -> ~/.pi/agent/AGENTS.md

Rendered runtime values:
  ./packages/subagent-dispatch -> ${LOCAL_PACKAGE_ROOT}
EOF
