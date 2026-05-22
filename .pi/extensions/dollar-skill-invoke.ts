/**
 * dollar-skill-invoke
 *
 * Pi extension that adds `$skill-name` autocomplete and context-level skill injection.
 *
 * Capabilities:
 * - `$` prefix triggers skill autocomplete (fuzzy filter via pi.getCommands())
 * - `/` prefix autocomplete filters out skill:xxx entries (delegate→filter)
 * - `context` event injects matched `$skill-name` tokens as separate `<skill>` messages
 *   appended to the user message, preserving original prompt text intact
 * - `\$` escape supported; unknown skills / read failures left unchanged
 * - `$` autocomplete via Tab (addAutocompleteProvider chain; compatible with any editor)
 * - Multi-skill support: all `$skill-name` tokens are expanded independently
 *   and injected as individual CustomMessage entries
 * - Repeat injection prevention: dedup checks if user message is already followed
 *   by skill custom messages
 *
 * Spec: openspec/changes/dollar-skill-invoke-context/specs/dollar-skill-invoke/spec.md
 * Design: openspec/changes/dollar-skill-invoke-context/design.md
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
// Context event injection
// ---------------------------------------------------------------------------

/**
 * Regex that matches unescaped `$skill-name` tokens:
 * - `(?<!\\)`   – not preceded by a single backslash
 * - `(?:\\\\)*` – zero or more escaped-backslash pairs (consumed as literal `\`)
 * - `\$`        – literal dollar sign
 * - `([a-z0-9-]+)` – skill name (capture group 1)
 *
 * Non-global variant (single-match) kept as canonical pattern source.
 */
const DOLLAR_SKILL_REGEX = /(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/;

/**
 * Read a custom message's text content as a flat string, regardless of whether
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
 * Handle `context` event: parse `$skill-name` tokens from the last user
 * message and inject skill content as individual `CustomMessage` entries.
 *
 * Dedup: if the user message is already followed by a custom message with
 * `customType === "skill"`, skip injection (prevents re‑injection on
 * tool‑call continuations within the same turn).
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

  // 2. Dedup: check if the next message is already a skill injection
  const nextMsg = messages[lastUserIdx + 1] as Record<string, unknown> | undefined;
  if (nextMsg && nextMsg.role === "custom" && nextMsg.customType === "skill") {
    return undefined;
  }

  // 3. Parse $skill tokens from user message text
  const userMsg = messages[lastUserIdx] as { content: unknown };
  const userText = getMessageText(userMsg);
  if (!userText.includes("$")) return undefined;

  const allSkills = getSkills(pi);

  // Build a global regex from the canonical pattern for multi-match
  const re = new RegExp(DOLLAR_SKILL_REGEX.source, "g");
  const skillMessages: Array<{
    role: "custom";
    customType: string;
    content: string;
    display: false;
    timestamp: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = re.exec(userText)) !== null) {
    const skillName = match[1];
    const skill = allSkills.find((s) => s.name === skillName);
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
  // Dedup: Pi's resolveExtensionPaths deduplicates by resolved file path,
  // so the same file is never loaded twice. No globalThis guard needed.
  //
  // Context handler dedup is handled inside handleContextInjection()
  // (checks if a skill custom message already follows the user message).
  // Autocomplete double-registration is harmless.

  pi.on("context", async (event) => {
    return handleContextInjection(event.messages, pi);
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
