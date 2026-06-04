import { accessSync, constants, realpathSync } from "node:fs";
import { resolve, sep, parse as parsePath } from "node:path";

// ── Vault Detection ─────────────────────────────────────────────

// ── Internal cache ──────────────────────────────────────────────
let _cachedVaultRoot: string | null = null;
let _cachedCwd: string | null = null;

// ── Vault Caching ───────────────────────────────────────────────

/**
 * Invalidate the cached vault root (e.g., on session shutdown or cwd change).
 * Called by search-tool resetSessionState().
 */
export function clearVaultCache(): void {
  _cachedVaultRoot = null;
  _cachedCwd = null;
}

// ── Vault Detection ─────────────────────────────────────────────

/**
 * Check if the given directory is inside an Obsidian vault
 * by walking up the directory tree looking for a `.obsidian/` directory.
 * Uses only filesystem access — no CLI invocation.
 */
function isInsideVault(cwd: string): boolean {
  let current = resolve(cwd);
  const root = parsePath(current).root;

  while (true) {
    try {
      accessSync(resolve(current, ".obsidian"), constants.R_OK);
      return true;
    } catch {
      // no .obsidian here
    }

    if (current === root) break;
    current = resolve(current, "..");
  }

  return false;
}

// ── Vault Resolution ────────────────────────────────────────────

/**
 * Resolve the vault root path from an explicit parameter or cwd-based detection.
 *
 * Algorithm:
 *   1. Explicit vault param → treat as direct path, resolve to absolute
 *   2. CWD walk-up → find .obsidian/ directory, return absolute root path
 *   3. Error if unresolvable
 *
 * @param explicitVault - Optional explicit vault path
 * @param cwd - Working directory for walk-up detection (default: process.cwd())
 * @returns The resolved absolute vault root path
 * @throws Error if no vault can be resolved
 */
export function resolveVault(
  explicitVault?: string,
  cwd?: string,
): string {
  const workDir = cwd ?? process.cwd();

  // Step 1: Explicit parameter wins — treat as direct path
  if (explicitVault) {
    return resolve(explicitVault);
  }

  // Step 2: Return cached result if cwd hasn't changed
  if (_cachedVaultRoot !== null && _cachedCwd === workDir) {
    return _cachedVaultRoot;
  }

  // Step 3: CWD walk-up detection (cache miss)
  _cachedVaultRoot = resolveVaultFromCwd(workDir);
  _cachedCwd = workDir;
  return _cachedVaultRoot;
}

/**
 * Walk up the directory tree from cwd, looking for .obsidian/ subdirectory.
 * Returns the absolute vault root path.
 */
function resolveVaultFromCwd(cwd: string): string {
  let current = resolve(cwd);
  const root = parsePath(current).root;

  while (true) {
    const obsidianDir = resolve(current, ".obsidian");
    try {
      accessSync(obsidianDir, constants.R_OK);
      // Found a .obsidian/ directory — return the vault root path
      return realpathSync(current);
    } catch {
      // No .obsidian/ here — continue walking up
    }

    if (current === root) break;
    current = resolve(current, "..");
  }

  // Can't resolve
  throw new Error(
    "vault parameter required: current directory is not inside an Obsidian vault. " +
      "Please specify the vault path explicitly.",
  );
}
