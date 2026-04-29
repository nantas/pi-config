#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_ROOT="${PI_SOURCE_ROOT:-${REPO_ROOT}/.pi}"
TARGET_ROOT="${PI_AGENT_HOME:-${HOME}/.pi/agent}"

declare -a MAPPINGS=(
  "settings.json:settings.json:file"
  "extensions:extensions:dir"
  "npm:npm:dir"
  "prompts:prompts:dir"
  "themes:themes:dir"
  "agents:agents:dir"
)

sync_file() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "${target_path}")"

  if [[ -f "${source_path}" ]]; then
    cp "${source_path}" "${target_path}"
  else
    rm -f "${target_path}"
  fi
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

for mapping in "${MAPPINGS[@]}"; do
  IFS=":" read -r source_rel target_rel kind <<< "${mapping}"
  source_path="${SOURCE_ROOT}/${source_rel}"
  target_path="${TARGET_ROOT}/${target_rel}"

  if [[ "${kind}" == "file" ]]; then
    sync_file "${source_path}" "${target_path}"
  else
    sync_dir "${source_path}" "${target_path}"
  fi
done

cat <<EOF
Synced managed Pi paths from:
  ${SOURCE_ROOT}
to:
  ${TARGET_ROOT}

Managed mappings:
  .pi/settings.json -> ~/.pi/agent/settings.json
  .pi/extensions/   -> ~/.pi/agent/extensions/
  .pi/npm/          -> ~/.pi/agent/npm/
  .pi/prompts/      -> ~/.pi/agent/prompts/
  .pi/themes/       -> ~/.pi/agent/themes/
  .pi/agents/       -> ~/.pi/agent/agents/
EOF
