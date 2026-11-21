/**
 * dollar-skill-invoke
 *
 * Pi extension that adds `$skill-name` autocomplete and hybrid skill expansion:
 * - `$` prefix triggers skill autocomplete (auto-triggered via `triggerCharacters`
 *   in Pi 1.6.0+ and via Tab; fuzzy filter via `pi.getCommands()`)
 * - `/` prefix autocomplete filters out `skill:xxx` entries (delegate→filter)
 * - `input` event rewrites the first unescaped known `$skill-name` into Pi's
 *   native `/skill:<name>` command for full parity (collapsible TUI card,
 *   session persistence, multi-turn retention, prompt cache preservation):
 *   - Single leading `$skill-name` token is stripped (e.g. `$foo bar` → `/skill:foo bar`,
 *     `$foo` → `/skill:foo`)
 *   - Mid-sentence or multi-skill inputs preserve original prompt text
 *     (e.g. `use $foo and $bar` → `/skill:foo use $foo and $bar`)
 * - `context` event injects remaining distinct `$skill-name` tokens (2..N, or any
 *   tokens from paths that bypassed `input` rewriting) as independent `CustomMessage`
 *   entries, skipping already-expanded `<skill>` blocks via `parseSkillBlock()`
 * - `\$` escape supported; unknown skills / read failures left unchanged
 * - Stale-runtime defense: caches last non-empty `pi.getCommands()` snapshot and
 *   maintains an independent filesystem skill index (standard dirs + Pi packages)
 *   with on-demand scan fallback
 */

import {
  type ExtensionAPI,
  type InputEvent,
  type InputEventResult,
  parseFrontmatter,
  parseSkillBlock,
  stripFrontmatter,
} from "@earendil-works/pi-coding-agent";
import {
  type AutocompleteItem,
  type AutocompleteProvider,
  type AutocompleteSuggestions,
  fuzzyFilter,
} from "@earendil-works/pi-tui";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillInfo {
  name: string;
  description?: string;
  filePath: string;
}

// ---------------------------------------------------------------------------
// Skill Discovery & Independent Fallback Index
// ---------------------------------------------------------------------------

let _lastCwd: string | null = null;
let _lastKnownCommandSkills: SkillInfo[] = [];
let _fileSystemSkillIndex: SkillInfo[] | null = null;

/**
 * Get the current list of skills from pi.getCommands() filtered by source.
 */
function getSkillsFromCommands(pi: ExtensionAPI): SkillInfo[] {
  return pi
    .getCommands()
    .filter((c) => c.source === "skill")
    .map((c) => ({
      name: c.name.startsWith("skill:") ? c.name.slice(6) : c.name,
      description: c.description,
      filePath: c.sourceInfo.path,
    }));
}

/**
 * Read a single SKILL.md file and append its SkillInfo if not already indexed.
 */
function addSkillFile(filePath: string, skills: SkillInfo[]): void {
  if (skills.some((s) => s.filePath === filePath)) return;
  const skillDir = path.dirname(filePath);
  let name = path.basename(skillDir);
  let description: string | undefined;
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { frontmatter } = parseFrontmatter<{
      name?: unknown;
      description?: unknown;
    }>(raw);
    if (typeof frontmatter.name === "string" && frontmatter.name.trim()) {
      name = frontmatter.name.trim();
    }
    if (
      typeof frontmatter.description === "string" &&
      frontmatter.description.trim()
    ) {
      description = frontmatter.description.trim();
    }
  } catch {}
  skills.push({ name, description, filePath });
}

/** Recursively scan a directory for SKILL.md files */
function scanSkillDir(dir: string, skills: SkillInfo[]): void {
  if (!existsSync(dir)) return;
  try {
    const stats = statSync(dir);
    if (stats.isFile()) {
      if (path.basename(dir) === "SKILL.md") addSkillFile(dir, skills);
      return;
    }
    if (!stats.isDirectory()) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === "SKILL.md" &&
        (entry.isFile() || entry.isSymbolicLink())
      ) {
        addSkillFile(path.join(dir, entry.name), skills);
        return;
      }
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const fullPath = path.join(dir, entry.name);
        try {
          if (statSync(fullPath).isDirectory()) scanSkillDir(fullPath, skills);
        } catch {}
      }
    }
  } catch {}
}

/**
 * Resolve a Pi package source string (git:, npm:, file:, or local path)
 * to its installed directory on disk.
 */
function resolvePackageRoot(
  source: string,
  baseDir: string,
  settingsDir: string,
): string | null {
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("npm:")) {
    const spec = trimmed.slice(4);
    const match = spec.startsWith("@")
      ? spec.match(/^(@[^/@]+\/[^/@]+)(?:@.*)?$/)
      : spec.match(/^([^/@]+)(?:@.*)?$/);
    if (!match) return null;
    return path.join(baseDir, "npm", "node_modules", match[1]);
  }

  if (
    trimmed.startsWith("git:") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  ) {
    let repoPath = trimmed
      .replace(/^git:/, "")
      .replace(/^https?:\/\//, "")
      .replace(/\.git(?:@.*)?$/, "");
    const atIndex = repoPath.lastIndexOf("@");
    const slashIndex = repoPath.lastIndexOf("/");
    if (atIndex > slashIndex) {
      repoPath = repoPath.slice(0, atIndex);
    }
    return path.join(baseDir, "git", repoPath);
  }

  const rawPath = trimmed.startsWith("file:") ? trimmed.slice(5) : trimmed;
  if (rawPath.startsWith("~/")) {
    return path.join(homedir(), rawPath.slice(2));
  }
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(settingsDir, rawPath);
}

/**
 * Scan skills declared by Pi packages listed in a settings.json file.
 */
function scanPackagesFromSettings(
  settingsPath: string,
  baseDir: string,
  skills: SkillInfo[],
): void {
  if (!existsSync(settingsPath)) return;
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      packages?: unknown;
    };
    if (!Array.isArray(parsed.packages)) return;
    const settingsDir = path.dirname(settingsPath);

    for (const entry of parsed.packages) {
      let source: string | null = null;
      let explicitSkills: string[] | undefined;

      if (typeof entry === "string") {
        source = entry;
      } else if (entry && typeof entry === "object") {
        const obj = entry as { source?: unknown; skills?: unknown };
        if (typeof obj.source === "string") source = obj.source;
        if (Array.isArray(obj.skills)) {
          explicitSkills = obj.skills.filter(
            (s): s is string => typeof s === "string",
          );
          if (explicitSkills.length === 0) continue; // explicitly disabled
        }
      }

      if (!source) continue;
      const pkgRoot = resolvePackageRoot(source, baseDir, settingsDir);
      if (!pkgRoot || !existsSync(pkgRoot)) continue;

      let skillPaths: string[] | null = null;
      if (explicitSkills && explicitSkills.length > 0) {
        skillPaths = explicitSkills;
      } else {
        const pkgJsonPath = path.join(pkgRoot, "package.json");
        if (existsSync(pkgJsonPath)) {
          try {
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
              pi?: { skills?: unknown };
            };
            if (Array.isArray(pkgJson.pi?.skills)) {
              skillPaths = pkgJson.pi.skills.filter(
                (s): s is string => typeof s === "string",
              );
            }
          } catch {}
        }
      }

      if (skillPaths) {
        for (const rel of skillPaths) {
          if (rel.startsWith("!") || rel.includes("*")) continue;
          scanSkillDir(path.resolve(pkgRoot, rel), skills);
        }
      } else {
        const defaultSkillsDir = path.join(pkgRoot, "skills");
        if (existsSync(defaultSkillsDir)) {
          scanSkillDir(defaultSkillsDir, skills);
        }
      }
    }
  } catch {}
}

function buildFileSystemSkillIndex(cwd: string): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const home = homedir();
  const globalAgentDir = path.join(home, ".pi", "agent");
  const projectPiDir = path.join(cwd, ".pi");

  // Standard skill directories
  scanSkillDir(path.join(cwd, ".agents", "skills"), skills);
  scanSkillDir(path.join(projectPiDir, "skills"), skills);
  scanSkillDir(path.join(home, ".agents", "skills"), skills);
  scanSkillDir(path.join(globalAgentDir, "skills"), skills);

  // Package skill directories from project and global settings.json
  scanPackagesFromSettings(
    path.join(projectPiDir, "settings.json"),
    projectPiDir,
    skills,
  );
  scanPackagesFromSettings(
    path.join(globalAgentDir, "settings.json"),
    globalAgentDir,
    skills,
  );

  return skills;
}

function ensureFileSystemSkillIndex(): SkillInfo[] {
  if (_fileSystemSkillIndex === null) {
    try {
      _fileSystemSkillIndex = buildFileSystemSkillIndex(
        _lastCwd ?? process.cwd(),
      );
    } catch {
      return [];
    }
  }
  return _fileSystemSkillIndex;
}

function getSkills(pi: ExtensionAPI): SkillInfo[] {
  try {
    const fromCommands = getSkillsFromCommands(pi);
    if (fromCommands.length > 0) {
      _lastKnownCommandSkills = fromCommands;
      return fromCommands;
    }
  } catch {
    // pi.getCommands() may throw when the shared ExtensionRuntime is stale
    // after session replacement (/new, /fork, /switchSession).
  }

  if (_lastKnownCommandSkills.length > 0) return _lastKnownCommandSkills;

  const fsSkills = ensureFileSystemSkillIndex();
  if (fsSkills.length > 0) return fsSkills;
  return [];
}

function findSkill(name: string, primarySkills: SkillInfo[]): SkillInfo | undefined {
  const direct = primarySkills.find((s) => s.name === name);
  if (direct) return direct;
  if (_fileSystemSkillIndex && primarySkills !== _fileSystemSkillIndex) {
    return _fileSystemSkillIndex.find((s) => s.name === name);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Autocomplete provider wrapper
// ---------------------------------------------------------------------------

function createAutocompleteProvider(
  current: AutocompleteProvider,
  getSkillsSnapshot: () => SkillInfo[],
): AutocompleteProvider {
  const triggerCharacters = Array.from(
    new Set([...(current.triggerCharacters ?? []), "$"]),
  );

  return {
    triggerCharacters,

    async getSuggestions(
      lines: string[],
      cursorLine: number,
      cursorCol: number,
      options: { signal: AbortSignal; force?: boolean },
    ): Promise<AutocompleteSuggestions | null> {
      const line = lines[cursorLine] ?? "";
      const textBeforeCursor = line.slice(0, cursorCol);

      // ---- $ prefix: skill autocomplete ----
      const dollarMatch = textBeforeCursor.match(
        /(?<!\\)(?:\\\\)*\$([a-z0-9-]*)$/,
      );
      if (dollarMatch) {
        const query = dollarMatch[1];
        const prefix = `$${query}`;
        const skills = getSkillsSnapshot();

        if (!query) {
          return {
            prefix,
            items: skills.slice(0, 20).map(toAutocompleteItem),
          };
        }

        const filtered = fuzzyFilter(skills, query, (s) => s.name);
        return {
          prefix,
          items: filtered.slice(0, 20).map(toAutocompleteItem),
        };
      }

      // ---- / prefix: delegate-and-filter (remove skill: entries) ----
      if (
        textBeforeCursor.startsWith("/") &&
        !textBeforeCursor.includes(" ")
      ) {
        const result = await current.getSuggestions(
          lines,
          cursorLine,
          cursorCol,
          options,
        );
        if (result) {
          // Defensive sanitization: ensure all items have string `value`
          // before downstream editor code calls `.startsWith()` on them.
          const sanitized = result.items.filter(
            (item) =>
              typeof item.value === "string" &&
              !item.value.startsWith("skill:"),
          );
          return {
            ...result,
            items: sanitized,
          };
        }
        return result;
      }

      // ---- Fall through to original provider ----
      return current.getSuggestions(lines, cursorLine, cursorCol, options);
    },

    applyCompletion(
      lines: string[],
      cursorLine: number,
      cursorCol: number,
      item: AutocompleteItem,
      prefix: string,
    ) {
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(
      lines: string[],
      cursorLine: number,
      cursorCol: number,
    ): boolean {
      return (
        current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ??
        true
      );
    },
  };
}

function toAutocompleteItem(skill: SkillInfo): AutocompleteItem {
  return {
    value: `$${skill.name}`,
    label: `$${skill.name}`,
    description: skill.description,
  };
}

// ---------------------------------------------------------------------------
// Input Event Rewrite (First `$skill` → Native `/skill:<name>`)
// ---------------------------------------------------------------------------

/**
 * Regex matching unescaped `$skill-name` tokens.
 * - Matches `$` NOT preceded by an odd number of backslashes
 * - Captures skill name: `[a-z0-9-]+`
 */
const DOLLAR_SKILL_REGEX = /(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/;

/**
 * Rewrite the first unescaped known `$skill-name` token into Pi's native
 * `/skill:<name>` command so Pi handles expansion, persistence, and TUI
 * collapsible rendering natively.
 */
function handleInputRewrite(
  event: InputEvent,
  pi: ExtensionAPI,
): InputEventResult {
  if (event.source === "extension") return { action: "continue" };

  const text = event.text;
  if (!text.includes("$") || text.trimStart().startsWith("/")) {
    return { action: "continue" };
  }

  const effectiveSkills = getSkills(pi);
  if (effectiveSkills.length === 0) return { action: "continue" };

  const re = new RegExp(DOLLAR_SKILL_REGEX.source, "g");
  const matchedSkillNames: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const skillName = match[1];
    if (findSkill(skillName, effectiveSkills)) {
      matchedSkillNames.push(skillName);
    }
  }

  if (matchedSkillNames.length === 0) return { action: "continue" };

  const firstSkillName = matchedSkillNames[0];

  // If there is only one known skill token in the input and it stands at the
  // start followed by whitespace or end-of-string, strip the leading token so
  // the user message and TUI bubble match native `/skill:<name> <args>` exactly.
  if (matchedSkillNames.length === 1) {
    const leadingMatch = text.match(/^\s*\$([a-z0-9-]+)(?=$|\s)/);
    if (leadingMatch && leadingMatch[1] === firstSkillName) {
      const remaining = text.slice(leadingMatch[0].length).trimStart();
      return {
        action: "transform",
        text: remaining
          ? `/skill:${firstSkillName} ${remaining}`
          : `/skill:${firstSkillName}`,
      };
    }
  }

  // Mid-sentence or multi-skill input: keep original prompt text intact.
  return {
    action: "transform",
    text: `/skill:${firstSkillName} ${text}`,
  };
}

// ---------------------------------------------------------------------------
// Context Event Injection (Secondary `$skill` Tokens 2..N & Fallback Paths)
// ---------------------------------------------------------------------------

/**
 * Read a message's text content as a flat string, regardless of whether
 * the message stores content as a string or as (TextContent | ImageContent)[].
 */
function getMessageText(msg: { content: unknown }): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
  }
  return "";
}

/**
 * Handle `context` event: parse remaining unescaped `$skill-name` tokens from
 * the last user message and inject each distinct skill as an independent
 * `CustomMessage` (`customType: "skill"`, `display: false`).
 *
 * When the user message already starts with a natively-expanded `<skill>` block,
 * only `skillBlock.userMessage` is scanned (never the skill body itself) and
 * the already-expanded skill name is excluded from re-injection.
 */
function handleContextInjection(
  messages: unknown[],
  pi: ExtensionAPI,
): { messages: unknown[] } | undefined {
  // 1. Find last user message from tail
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>;
    if (msg.role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) return undefined;

  // 2. Dedup: scan up to 5 messages after user message for existing skill injection.
  //    This handles cases where before_agent_start or other extensions shift messages.
  const nextMsg = messages[lastUserIdx + 1] as
    | Record<string, unknown>
    | undefined;
  if (nextMsg) {
    if (nextMsg.role === "custom" && nextMsg.customType === "skill") {
      return undefined;
    }
    for (
      let j = lastUserIdx + 1;
      j < Math.min(lastUserIdx + 5, messages.length);
      j++
    ) {
      const m = messages[j] as Record<string, unknown>;
      if (m.role === "custom" && m.customType === "skill") return undefined;
      if (m.role === "assistant" || m.role === "toolResult") break;
    }
  }

  // 3. Extract user text and skip any natively-expanded <skill> block body
  const userMsg = messages[lastUserIdx] as { content: unknown };
  const userText = getMessageText(userMsg);
  const parsedSkill = parseSkillBlock(userText);

  const alreadyExpanded = new Set<string>();
  let scanText = userText;
  if (parsedSkill) {
    alreadyExpanded.add(parsedSkill.name);
    scanText = parsedSkill.userMessage ?? "";
  }

  if (!scanText.includes("$")) return undefined;

  const effectiveSkills = getSkills(pi);
  if (effectiveSkills.length === 0) return undefined;

  const re = new RegExp(DOLLAR_SKILL_REGEX.source, "g");
  const skillMessages: Array<{
    role: "custom";
    customType: string;
    content: string;
    display: false;
    timestamp: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = re.exec(scanText)) !== null) {
    const skillName = match[1];
    if (alreadyExpanded.has(skillName)) continue;

    const skill = findSkill(skillName, effectiveSkills);
    if (!skill) continue; // unknown skill → skip

    let content: string;
    try {
      content = readFileSync(skill.filePath, "utf-8");
    } catch {
      continue; // file read failure → skip
    }

    const body = stripFrontmatter(content).trim();
    const baseDir = path.dirname(skill.filePath);
    const skillBlock =
      `<skill name="${skill.name}" location="${skill.filePath}">\n` +
      `References are relative to ${baseDir}.\n\n` +
      `${body}\n</skill>`;

    alreadyExpanded.add(skillName);
    skillMessages.push({
      role: "custom",
      customType: "skill",
      content: skillBlock,
      display: false,
      timestamp: Date.now(),
    });
  }

  if (skillMessages.length === 0) return undefined;

  // 4. Insert skill messages immediately after the user message,
  //    before any pending nextTurn / before_agent_start messages.
  const newMessages = [
    ...messages.slice(0, lastUserIdx + 1),
    ...skillMessages,
    ...messages.slice(lastUserIdx + 1),
  ];

  return { messages: newMessages };
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
  // Single top-level registrations prevent handler accumulation across /new.
  pi.on("session_start", async (_event, ctx) => {
    try {
      const cwd = (ctx as { cwd?: string }).cwd ?? process.cwd();
      _lastCwd = cwd;
      _fileSystemSkillIndex = buildFileSystemSkillIndex(cwd);
    } catch {}

    ctx.ui.addAutocompleteProvider((current) =>
      createAutocompleteProvider(current, () => getSkills(pi)),
    );
  });

  pi.on("input", async (event) => {
    return handleInputRewrite(event, pi);
  });

  pi.on("context", async (event) => {
    return handleContextInjection(event.messages, pi);
  });
}
