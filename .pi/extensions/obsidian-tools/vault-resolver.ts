import { accessSync, constants, realpathSync } from "node:fs";
import { resolve, sep, parse as parsePath } from "node:path";
import { runCli, parseSearchJson } from "./cli-runner";

// ── Shared state ────────────────────────────────────────────────
let knownVaults: Map<string, string> = new Map(); // name → root path
let _preloaded = false;

/**
 * Whether Obsidian CLI was confirmed available during preload.
 */
let _cliAvailable = false;

/** @returns true if CLI was reachable during session preload */
export function isCliAvailable(): boolean {
  return _cliAvailable;
}

/** @returns the known vaults map (name → path) */
export function getKnownVaults(): ReadonlyMap<string, string> {
  return knownVaults;
}

/** @returns true if preloadKnownVaults() has been called this session */
export function hasPreloaded(): boolean {
  return _preloaded;
}

// ── Preloading ──────────────────────────────────────────────────

/**
 * Preload known vaults by running `obsidian vault list`.
 *
 * Called once at session_start. On failure (CLI unavailable), knownVaults
 * remains empty but the resolver still works via .obsidian/ detection.
 */
export async function preloadKnownVaults(): Promise<void> {
  if (_preloaded) return;
  _preloaded = true;

  try {
    const result = await runCli("", ["vaults", "verbose"], undefined, 5_000);
    if (result.code === 0 && result.stdout.trim()) {
      knownVaults = parseVaultListTable(result.stdout);
      _cliAvailable = true;
    }
  } catch {
    // CLI unavailable — vault-resolver will still work via .obsidian/ detection
    _cliAvailable = false;
  }
}

// ── Vault Detection ─────────────────────────────────────────────

/**
 * Check if the given directory is inside an Obsidian vault
 * by walking up the directory tree looking for a `.obsidian/` directory.
 * Uses only filesystem access — no CLI invocation.
 */
export function isInsideVault(cwd: string): boolean {
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

/**
 * Ensure vault list has been preloaded.
 * Idempotent — skips if already loaded.
 * Called lazily by tool handlers on first invocation.
 */
export async function ensurePreloaded(): Promise<void> {
  if (!_preloaded) {
    await preloadKnownVaults();
  }
}

// ── Vault Resolution ────────────────────────────────────────────

/**
 * Resolve a vault name from explicit parameter or cwd-based detection.
 *
 * Algorithm (D4):
 *   1. Explicit vault param → match against knownVaults
 *   2. CWD walk-up → find .obsidian/ directory, match path against knownVaults
 *   3. Fallback to cwd-based name detection (even without known vaults)
 *   4. Error if unresolvable
 *
 * @param explicitVault - Optional explicit vault name or path
 * @param cwd - Working directory for walk-up detection (default: process.cwd())
 * @returns The resolved vault name for CLI invocation
 * @throws Error if no vault can be resolved
 */
export function resolveVault(
  explicitVault?: string,
  cwd?: string,
): string {
  const workDir = cwd ?? process.cwd();

  // Step 1: Explicit parameter wins
  if (explicitVault) {
    return resolveExplicitVault(explicitVault);
  }

  // Step 2-3: CWD walk-up detection
  return resolveVaultFromCwd(workDir);
}

/**
 * Attempt to match an explicit vault parameter against known vaults,
 * or accept it as a path directly.
 */
function resolveExplicitVault(vault: string): string {
  // Try exact name match against known vaults
  if (knownVaults.has(vault)) {
    return vault;
  }

  // Try case-insensitive name match
  for (const [name] of knownVaults) {
    if (name.toLowerCase() === vault.toLowerCase()) {
      return name;
    }
  }

  // If known vaults are loaded but no match found, error
  if (_preloaded && knownVaults.size > 0) {
    const names = [...knownVaults.keys()].join(", ");
    throw new Error(
      `Vault '${vault}' not found in known vaults. Available vaults: ${names}`,
    );
  }

  // If preloading didn't run or had no results, accept the vault as-is
  // (it may be a direct path or the CLI may know about it)
  return vault;
}

/**
 * Walk up the directory tree from cwd, looking for .obsidian/ subdirectory.
 * Matches the found root against known vaults, or derives a name from the directory.
 */
function resolveVaultFromCwd(cwd: string): string {
  let current = resolve(cwd);
  const root = parsePath(current).root;

  while (true) {
    const obsidianDir = resolve(current, ".obsidian");
    try {
      accessSync(obsidianDir, constants.R_OK);
      // Found a .obsidian/ directory
      const vaultPath = realpathSync(current);

      // Try to match against known vaults by path
      let resolvedName = matchPathToKnownVaults(vaultPath);

      if (!resolvedName) {
        // If known vaults exist but no match, still use the directory name
        resolvedName = current.split(sep).pop() ?? "vault";
      }

      return resolvedName;
    } catch {
      // No .obsidian/ here — continue walking up
    }

    if (current === root) break;
    current = resolve(current, "..");
  }

  // Step 4: Can't resolve
  throw new Error(
    "vault parameter required: current directory is not inside an Obsidian vault. " +
      "Please specify the vault name explicitly.",
  );
}

/**
 * Match a realpath-normalized vault root against known vaults.
 * Tries exact path match first, then suffix match.
 */
function matchPathToKnownVaults(vaultPath: string): string | null {
  for (const [name, path] of knownVaults) {
    const normalizedKnown = normalizePath(path);
    if (normalizedKnown === vaultPath) {
      return name;
    }
  }

  // Suffix match: /User/projects/obsidian-mind matches .../obsidian-mind
  for (const [name, path] of knownVaults) {
    const normalizedKnown = normalizePath(path);
    if (vaultPath.endsWith(normalizedKnown) || normalizedKnown.endsWith(vaultPath)) {
      return name;
    }
  }

  return null;
}

// ── Parsing Helpers ─────────────────────────────────────────────

/**
 * Parse the tabular output of `obsidian vaults verbose`.
 *
 * Format (tab-separated, no header):
 *   my-wiki\t/Users/user/projects/my-wiki
 *   obsidian-mind\t/Users/user/projects/obsidian-mind
 *
 * Apply defensive validation to discard metadata-field keys
 * (e.g. "path", "files", "folders", "size") that could come from
 * incorrect commands like `obsidian vault list`.
 */
function parseVaultListTable(stdout: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = stdout.trim().split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Tab-separated: name\tpath (canonical format from `vaults verbose`)
    const tabMatch = line.match(/^(\S+)\t+(.+)$/);
    if (tabMatch) {
      const name = tabMatch[1].trim();
      const path = normalizePath(tabMatch[2].trim());

      // Defensive: reject metadata field names (from wrong commands)
      if (isMetadataField(name)) continue;

      map.set(name, path);
    }
  }

  return map;
}

/** Known metadata field names that might appear as keys from wrong CLI commands. */
const METADATA_FIELDS = new Set([
  "name", "path", "files", "folders", "size",
  "Vault", "Name", "Path", "Files", "Folders", "Size",
]);

function isMetadataField(key: string): boolean {
  return METADATA_FIELDS.has(key);
}

/**
 * Normalize a path: resolve to absolute, realpath, strip trailing slash.
 */
function normalizePath(p: string): string {
  try {
    return realpathSync(resolve(p.trim()));
  } catch {
    return resolve(p.trim());
  }
}
