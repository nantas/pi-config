#!/usr/bin/env bash
# just-agent-lab bootstrap: install pinned Just to .scratch/bin/just (project-local).
# Audited path: download release asset -> verify SHA256 -> extract. Never `curl | bash`.
set -euo pipefail

JUST_VERSION="1.58.0"
JUST_SHA256_ARM64="50ae3e996c974a0bf32ea7d10f495070df33f1b43e0616b2769e3d4821ed8f48"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${REPO_ROOT}/.scratch/bin"
JUST_BIN="${BIN_DIR}/just"

ARCH="$(uname -m)"
OS="$(uname -s)"

if [[ "${OS}" != "Darwin" || "${ARCH}" != "arm64" ]]; then
  echo "ERROR: this MVP auto-bootstrap supports macOS arm64 only (got ${OS}/${ARCH})." >&2
  echo "Install Just manually from https://github.com/casey/just/releases to ${JUST_BIN} (pinned ${JUST_VERSION})." >&2
  exit 1
fi

if [[ -x "${JUST_BIN}" ]]; then
  INSTALLED="$("${JUST_BIN}" --version)"
  echo "already installed: ${INSTALLED} (pinned: just ${JUST_VERSION})"
  if [[ "${INSTALLED}" != "just ${JUST_VERSION}" ]]; then
    echo "WARNING: version mismatch. Remove ${JUST_BIN} and re-run to reinstall the pinned version." >&2
  fi
  exit 0
fi

ASSET="just-${JUST_VERSION}-aarch64-apple-darwin.tar.gz"
URL="https://github.com/casey/just/releases/download/${JUST_VERSION}/${ASSET}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "downloading ${URL}"
curl -fSL --retry 3 -o "${TMP_DIR}/${ASSET}" "${URL}"

echo "verifying SHA256..."
ACTUAL_SHA="$(shasum -a 256 "${TMP_DIR}/${ASSET}" | awk '{print $1}')"
if [[ "${ACTUAL_SHA}" != "${JUST_SHA256_ARM64}" ]]; then
  echo "ERROR: SHA256 mismatch." >&2
  echo "  expected: ${JUST_SHA256_ARM64}" >&2
  echo "  actual:   ${ACTUAL_SHA}" >&2
  exit 1
fi

echo "extracting..."
tar -xzf "${TMP_DIR}/${ASSET}" -C "${TMP_DIR}" just

mkdir -p "${BIN_DIR}"
install -m 0755 "${TMP_DIR}/just" "${JUST_BIN}"

echo "installed: $(${JUST_BIN} --version) -> ${JUST_BIN}"
