/**
 * wikilink-batch-replace
 *
 * Pi extension tool for batch-replacing bare text references with Obsidian wikilinks.
 * Automatically detects Markdown table rows and escapes the `|` separator as `\|`.
 *
 * Spec: openspec/changes/wikilink-batch-replace/specs/wikilink-batch-replace/spec.md
 * Design: openspec/changes/wikilink-batch-replace/design.md
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatternConfig {
  regex: string;
  mapping: Record<string, string>;
  displayTemplate: string;
}

interface ToolInput {
  file: string;
  patterns: PatternConfig[];
}

interface Stats {
  replaced: number;
  replacedTable: number;
  replacedNormal: number;
  skippedWikilink: number;
  skippedUnmapped: number;
  skippedUnmappedKeys: string[];
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Check if position `pos` in `text` falls inside an existing [[...]] wikilink.
 * Searches backwards for the nearest `[[` and `]]`. If `[[` is closer, we're inside.
 */
function isInsideWikilink(text: string, pos: number): boolean {
  const lastOpen = text.lastIndexOf("[[", pos);
  const lastClose = text.lastIndexOf("]]", pos);
  if (lastOpen === -1) return false;
  return lastOpen > lastClose;
}

/**
 * Check if a line is a Markdown table row (starts with `|`).
 */
function isTableRow(line: string): boolean {
  return line.trimStart().startsWith("|");
}

/**
 * Render displayTemplate with capture groups.
 * E.g. displayTemplate = "#$1" with groups ["001"] → "#001"
 */
function renderDisplay(template: string, groups: string[]): string {
  return template.replace(/\$(\d+)/g, (_, idx) => groups[parseInt(idx, 10) - 1] ?? "");
}

/**
 * Generate a wikilink string with appropriate escaping for the context.
 */
function makeWikilink(path: string, display: string, inTable: boolean): string {
  const separator = inTable ? "\\|" : "|";
  // In table rows, escape any literal | in the display text to avoid breaking the table
  const escapedDisplay = inTable ? display.replace(/\|/g, "\\|") : display;
  return `[[${path}${separator}${escapedDisplay}]]`;
}

/**
 * Process a single line, replacing all pattern matches.
 */
function processLine(
  line: string,
  inTable: boolean,
  pattern: PatternConfig,
  stats: Stats,
): string {
  const regex = new RegExp(pattern.regex, "g");
  const parts: string[] = [];
  let lastEnd = 0;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;

    // Skip: already inside a wikilink
    if (isInsideWikilink(line, start)) {
      stats.skippedWikilink++;
      continue;
    }

    // Resolve mapping key: first capture group, or full match
    const key = m[1] ?? m[0];
    const mappedPath = pattern.mapping[key];
    if (!mappedPath) {
      stats.skippedUnmapped++;
      if (!stats.skippedUnmappedKeys.includes(key)) {
        stats.skippedUnmappedKeys.push(key);
      }
      continue;
    }

    // Render display text
    const groups = m.slice(1);
    const display = renderDisplay(
      pattern.displayTemplate,
      groups.length > 0 ? groups : [m[0]],
    );

    // Append text before this match
    parts.push(line.slice(lastEnd, start));

    // Append wikilink
    parts.push(makeWikilink(mappedPath, display, inTable));

    if (inTable) {
      stats.replacedTable++;
    } else {
      stats.replacedNormal++;
    }
    stats.replaced++;

    lastEnd = end;
  }

  // Append remaining text
  parts.push(line.slice(lastEnd));

  return parts.join("");
}

/**
 * Process entire file content with a single pattern.
 */
function applyPatternToContent(
  content: string,
  pattern: PatternConfig,
  stats: Stats,
): string {
  const lines = content.split("\n");
  const resultLines = lines.map((line) =>
    processLine(line, isTableRow(line), pattern, stats),
  );
  return resultLines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

async function handleBatchReplace(
  input: ToolInput,
): Promise<string> {
  const { file, patterns } = input;

  // Read file
  let content: string;
  try {
    content = readFileSync(file, "utf-8");
  } catch (err: any) {
    return `Error: Cannot read file "${file}": ${err.message}`;
  }

  const stats: Stats = {
    replaced: 0,
    replacedTable: 0,
    replacedNormal: 0,
    skippedWikilink: 0,
    skippedUnmapped: 0,
    skippedUnmappedKeys: [],
  };

  // Apply patterns sequentially
  for (const pattern of patterns) {
    content = applyPatternToContent(content, pattern, stats);
  }

  // Write file back
  try {
    writeFileSync(file, content, "utf-8");
  } catch (err: any) {
    return `Error: Cannot write file "${file}": ${err.message}`;
  }

  // Build result summary
  const lines: string[] = [
    `替换: ${stats.replaced} 处（正文 ${stats.replacedNormal}, 表格 ${stats.replacedTable}）`,
    `跳过（已在 wikilink 内）: ${stats.skippedWikilink} 处`,
  ];

  if (stats.skippedUnmapped > 0) {
    lines.push(
      `跳过（映射未命中）: ${stats.skippedUnmapped} 处（${stats.skippedUnmappedKeys.join(", ")}）`,
    );
  }

  lines.push(`文件: ${file}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
  pi.registerTool({
    name: "wikilink_batch_replace",
    description:
      "Batch-replace bare text references in a file with Obsidian wikilinks. " +
      "Automatically detects Markdown table rows (lines starting with |) and escapes " +
      "the wikilink pipe separator as \\|. Skips matches already inside [[...]]. " +
      "Does NOT discover file paths — mapping must be provided by the caller. " +
      "Modifies the file in-place and returns replacement statistics.",
    parameters: Type.Object({
      file: Type.String({
        description: "Target file path (absolute or project-relative)",
      }),
      patterns: Type.Array(
        Type.Object({
          regex: Type.String({
            description: "Regex pattern to match bare references, e.g. #(\\d{3,})",
          }),
          mapping: Type.Record(Type.String(), Type.String(), {
            description:
              "Capture group value → wikilink target path mapping. " +
              "The key is the first capture group value (or full match if no groups).",
          }),
          displayTemplate: Type.String({
            description:
              "Display text template. Use $1, $2... to reference capture groups.",
          }),
        }),
        {
          description: "One or more pattern configurations, processed sequentially",
        },
      ),
    }),
    async execute(_toolCallId, input: ToolInput, _signal, _onUpdate, _ctx) {
      const result = await handleBatchReplace(input);
      return { content: [{ type: "text", text: result }] };
    },
  });
}
