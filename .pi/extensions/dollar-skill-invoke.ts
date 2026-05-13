/**
 * dollar-skill-invoke
 *
 * Pi extension that adds `$skill-name` autocomplete and input transformation.
 *
 * Capabilities:
 * - `$` prefix triggers skill autocomplete (fuzzy filter via pi.getCommands())
 * - `/` prefix autocomplete filters out skill:xxx entries (delegate→filter)
 * - `input` event transforms the first `$skill-name` token into a `<skill>` block
 * - `\$` escape supported; unknown skills / read failures left unchanged
 * - `$` autocomplete via Tab (addAutocompleteProvider chain; compatible with any editor)
 *
 * Spec: openspec/changes/dollar-skill-invoke/specs/
 *   - dollar-skill-autocomplete/spec.md
 *   - dollar-skill-invoke/spec.md
 *   - slash-skill-filter/spec.md
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  type AutocompleteItem,
  type AutocompleteProvider,
  type AutocompleteSuggestions,
  fuzzyFilter,
} from "@earendil-works/pi-tui";
import { readFileSync } from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillInfo {
  name: string;
  description?: string;
  filePath: string;
}

interface ExpandedSkill {
  name: string;
  filePath: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the current list of skills from pi.getCommands() filtered by source.
 */
function getSkills(pi: ExtensionAPI): SkillInfo[] {
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
 * Strip YAML frontmatter delimited by `---`.
 */
function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return trimmed;

  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) return trimmed;

  // Return body after closing `---`, preserving the skill's reference preamble
  return trimmed.slice(endIndex + 4).trimStart();
}

// ---------------------------------------------------------------------------
// Autocomplete provider wrapper
// ---------------------------------------------------------------------------

function createAutocompleteProvider(
  current: AutocompleteProvider,
  getSkillsSnapshot: () => SkillInfo[],
): AutocompleteProvider {
  return {
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
          // Items with non-string values are dropped.
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
// Input event transform
// ---------------------------------------------------------------------------

/**
 * Regex that matches unescaped `$skill-name` tokens:
 * - `(?<!\\)`   – not preceded by a single backslash
 * - `(?:\\\\)*` – zero or more escaped-backslash pairs (consumed as literal `\`)
 * - `\$`        – literal dollar sign
 * - `([a-z0-9-]+)` – skill name (capture group 1)
 */
const DOLLAR_SKILL_REGEX = /(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/;

function handleInputTransform(
  text: string,
  pi: ExtensionAPI,
): { action: "continue" } | { action: "transform"; text: string } {
  if (!text || !text.includes("$")) {
    return { action: "continue" };
  }

  const allSkills = getSkills(pi);
  const expanded: ExpandedSkill[] = [];
  let hasExpansion = false;

  const transformed = text.replace(
    DOLLAR_SKILL_REGEX,
    (fullMatch: string, skillName: string) => {
      const skill = allSkills.find((s) => s.name === skillName);
      if (!skill) return fullMatch; // unknown skill → leave unchanged

      let content: string;
      try {
        content = readFileSync(skill.filePath, "utf-8");
      } catch {
        return fullMatch; // file read failure → leave unchanged
      }

      const body = stripFrontmatter(content).trim();
      expanded.push({ name: skill.name, filePath: skill.filePath, body });
      hasExpansion = true;
      return ""; // remove the token from the text
    },
  );

  if (!hasExpansion) {
    return { action: "continue" };
  }

  // Build a single <skill> block matching the format of /skill:name
  // (_expandSkillCommand in pi-mono).
  const skill = expanded[0];
  const baseDir = path.dirname(skill.filePath);
  const skillBlock =
    `<skill name="${skill.name}" location="${skill.filePath}">\n` +
    `References are relative to ${baseDir}.\n\n` +
    `${skill.body}\n</skill>`;

  const finalText = `${skillBlock}\n\n${transformed.trimStart()}`;

  return { action: "transform", text: finalText };
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
  // Self-dedup — prevents double registration when loaded from both
  // project-local (.pi/extensions/) and global (~/.pi/agent/extensions/).
  // Uses session-scoped key (session_counter + ext_key) so that /new
  // always creates a fresh dedup domain without depending on
  // session_shutdown timing.
  const _key = "__pi_ext_dollar_skill_invoke_loaded";
  const SESSION_COUNTER = "__pi_ext_session_counter";

  const sessionId = (globalThis as any)[SESSION_COUNTER] ?? 0;
  const sessionKey = `${_key}_session_${sessionId}`;

  if ((globalThis as any)[sessionKey]) return;
  (globalThis as any)[sessionKey] = true;

  pi.on("session_shutdown", () => {
    (globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
  });

  // Register input event handler ONCE at top level ($skill-name expansion).
  // This MUST be outside session_start to prevent handler accumulation
  // across /new and /reload.
  pi.on("input", async (event) => {
    return handleInputTransform(event.text, pi);
  });

  pi.on("session_start", async (_event, ctx) => {
    // Register autocomplete provider for the new session context.
    // The provider chain detects `$` prefix (Tab to trigger) and filters
    // `skill:` entries from `/` autocomplete.
    ctx.ui.addAutocompleteProvider((current) =>
      createAutocompleteProvider(current, () => getSkills(pi)),
    );
  });
}
