/**
 * dollar-skill-invoke
 *
 * Pi extension that adds `$skill-name` autocomplete and input transformation.
 *
 * Capabilities:
 * - `$` prefix triggers skill autocomplete (fuzzy filter via pi.getCommands())
 * - `/` prefix autocomplete filters out skill:xxx entries (delegate→filter)
 * - `input` event transforms `$skill-name` tokens into a consolidated `<skill>` block
 * - `\$` escape supported; unknown skills / read failures left unchanged
 * - Custom editor auto-triggers autocomplete on `$` (like builtin `@` / `#`)
 *
 * Spec: openspec/changes/dollar-skill-invoke/specs/
 *   - dollar-skill-autocomplete/spec.md
 *   - dollar-skill-invoke/spec.md
 *   - slash-skill-filter/spec.md
 */

import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  type AutocompleteItem,
  type AutocompleteProvider,
  type AutocompleteSuggestions,
  fuzzyFilter,
} from "@mariozechner/pi-tui";
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
          return {
            ...result,
            items: result.items.filter(
              (item) => !item.value.startsWith("skill:"),
            ),
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
const DOLLAR_SKILL_REGEX = /(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/g;

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

  // Build a SINGLE consolidated <skill> block that contains ALL expanded
  // skills. This is critical for the TUI chat renderer: its parseSkillBlock()
  // expects the user message text to START with at most one <skill> block.
  // Without consolidation, multiple blocks would cause the 2nd+ blocks to
  // appear as raw text in the user message area.
  const skillNames = expanded.map((s) => s.name).join(", ");
  const consolidatedContent = expanded
    .map(
      (s) =>
        `[skill:${s.name}]` +
        `\nLocation: ${s.filePath}` +
        `\n\n${s.body}`,
    )
    .join("\n\n---\n\n");

  const finalText =
    `<skill name="${skillNames}" location=".">\n` +
    `${consolidatedContent}\n</skill>\n\n` +
    transformed.trimStart();

  return { action: "transform", text: finalText };
}

// ---------------------------------------------------------------------------
// Custom editor — adds $ as an autocomplete trigger character
// ---------------------------------------------------------------------------

/**
 * Extends the default CustomEditor to auto-trigger autocomplete
 * when `$` is typed at a token boundary (like `@` and `#`).
 *
 * The built-in TUI editor only auto-triggers for `/` (slash commands),
 * `@` (file attach), and `#` (custom providers). This subclass adds `$`
 * so that our skill autocomplete provider is invoked automatically.
 */
class DollarSkillEditor extends CustomEditor {
  handleInput(data: string): void {
    const isDollar = data.length === 1 && data === "$";

    // Let parent handle the character insertion and existing triggers
    super.handleInput(data);

    // After insertion, auto-trigger for $ at token boundaries.
    // Using (this as any) because tryTriggerAutocomplete is TS-private
    // but accessible at runtime (JavaScript classes don't enforce private).
    if (isDollar && !(this as any).autocompleteState) {
      const cursor = this.getCursor();
      const lines = this.getLines();
      const line = lines[cursor.line] ?? "";
      const textBeforeCursor = line.slice(0, cursor.col);
      const charBeforeDollar = textBeforeCursor[textBeforeCursor.length - 2];

      if (
        textBeforeCursor.length === 1 ||
        charBeforeDollar === " " ||
        charBeforeDollar === "\t"
      ) {
        (this as any).tryTriggerAutocomplete();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    // 1. Register autocomplete provider FIRST so the full chain is built
    ctx.ui.addAutocompleteProvider((current) =>
      createAutocompleteProvider(current, () => getSkills(pi)),
    );

    // 2. Replace editor with auto-$-trigger variant.
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      return new DollarSkillEditor(tui, theme, keybindings);
    });

    // 3. Register input event handler ($skill-name expansion)
    pi.on("input", async (event) => {
      return handleInputTransform(event.text, pi);
    });
  });
}
