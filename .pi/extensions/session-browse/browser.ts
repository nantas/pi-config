/**
 * /sb command handler — two-level interactive session search and browse.
 *
 * Flow:
 *   /sb <query>
 *   → searchGrouped() → session list (Level 1: SelectList)
 *   → select session → search() → hit list (Level 2: SelectList + paging)
 *   → Space: toggle turn preview overlay (Level 3)
 *   → Enter: explore with agent (setEditorText)
 *
 * Uses ctx.ui.custom() + SelectList for both levels.
 */

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { Component, SelectListTheme, SelectItem } from "@earendil-works/pi-tui";
import { SelectList, Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import { getDb, updateIndex, search, searchGrouped } from "./indexer";
import { buildTurnFromEntryId, formatTurn } from "./expander";
import type { SearchResult, SessionSearchGroup } from "./types";
import { existsSync } from "node:fs";

const MAX_HITS_PER_PAGE = 5;
const PREVIEW_PAGE_LINES = 15;

// ── Index Guard ────────────────────────────────────────────────

let _indexed = false;

function ensureIndexed(): void {
  if (_indexed) return;
  _indexed = true;
  try {
    updateIndex();
  } catch {
    // Index errors are non-fatal; commands will return empty results
  }
}

// ── Helpers ────────────────────────────────────────────────────

/** Extract a readable project name from raw project string. */
function extractProjectName(rawProject: string): string {
  const cleaned = rawProject.replace(/^--+|--+$/g, "");
  const segments = cleaned.split("--");
  return segments[segments.length - 1] || cleaned;
}

/** Extract the last meaningful path segment from a session path for display. */
function sessionDisplayName(path: string): string {
  // Remove trailing filename
  const dir = path.replace(/\/[^/]+$/, "");
  // Take last 2 segments: project-run/session-uuid
  const segments = dir.split("/");
  const last = segments[segments.length - 1];
  const secondLast = segments.length > 1 ? segments[segments.length - 2] : "";
  // session UUIDs are long — just show last 12 chars
  return secondLast
    ? `${secondLast.slice(0, 16)}/${last.slice(-12)}`
    : last.slice(-12);
}

/** Build a minimal inline SelectListTheme for custom components. */
function makeSelectListTheme(theme: any): SelectListTheme {
  if (theme && typeof theme.fg === "function") {
    return {
      selectedPrefix: (t: string) => t,
      selectedText: (t: string) => theme.bold(theme.fg("accent", t)),
      description: (t: string) => theme.fg("muted", t),
      scrollInfo: (t: string) => theme.fg("dim", t),
      noMatch: (t: string) => theme.fg("dim", t),
    };
  }
  // Fallback: no styling
  return {
    selectedPrefix: (t: string) => t,
    selectedText: (t: string) => `▸ ${t}`,
    description: (t: string) => t,
    scrollInfo: (t: string) => t,
    noMatch: (t: string) => t,
  };
}

/**
 * Compress system-generated text at the start of a message.
 * Handles:
 * - `<skill name="X"> + full skill content` → `[skill:X]`
 * - `> ...
 *   > ...` blockquote system docs → `[system documentation]`
 * - `/** ...
 *    * ...` JSDoc-style code blocks → `[code block]`
 * - Markdown headings like `# 🏖️` or `## SDK` → `[system info]`
 *
 * Saves display space in session lists, hit snippets, and preview overlays.
 */
function compressSystemText(text: string): string {
  if (!text) return text;

  // Pattern 1: <skill name="X" ...> skill expansion
  const skillMatch = text.match(/^<skill name="([^"]+)"[^>]*>/);
  if (skillMatch) {
    return "[skill:" + skillMatch[1] + "]";
  }

  // Pattern 2: JSDoc-style blocks /** ... */
  if (/^\/\*\*/.test(text)) {
    return "[code block]";
  }

  // Pattern 3: Blockquote system documentation (> pi can help... etc)
  if (/^> [a-z]+/.test(text)) {
    return "[system documentation]";
  }

  // Pattern 4: System-injected status headers (e.g., "# 🏖️ OSS Vacation")
  const firstLine = text.split("\n")[0].trim();
  if (/^# [^a-zA-Z0-9]/.test(firstLine)) {
    return "[system info]";
  }

  return text;
}

/**
 * Compress system text but preserve user input after the system block.
 * Used in the preview overlay where user text after skill/prompt expansion matters.
 *
 * Example:
 *   Input: `<skill name="X">...full skill content...><user actual request>`
 *   Output: `[skill:X]  …  <user actual request (first 500 chars)>`
 */
function compressWithUserText(text: string): string {
  if (!text) return text;

  const compressed = compressSystemText(text);
  if (compressed === text) {
    // No system block detected, return as-is
    return text;
  }

  // Compression happened — find user text after the system block
  const lines = text.split("\n");
  let userStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Skip lines that are clearly part of the system block
    if (line.startsWith("<skill")) continue;
    if (line.startsWith("[") && line.includes("]")) continue;
    if (line.startsWith("Location:")) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("- `")) continue;
    if (line.startsWith("-")) continue;
    if (line.startsWith("*")) continue;
    if (line.startsWith(">")) continue;
    if (line.match(/^\d+\.\s/)) continue;
    if (line.match(/^`{3}/)) continue;
    if (line.startsWith("/**")) continue;
    // This looks like actual user text
    userStart = i;
    break;
  }

  if (userStart === -1 || userStart >= lines.length) {
    // No user text found — just return the compressed tag
    return compressed;
  }

  const userText = lines.slice(userStart).join(" ").replace(/\s+/g, " ").trim();
  return compressed + "  …  " + userText.slice(0, 500);
}

/**
 * Deduplicate search results by turn — keep only the best-ranked hit from each turn.
 * A turn spans from one user message to the next user message.
 * This prevents showing N redundant results from the same conversation turn.
 */
function deduplicateByTurn(
  results: SearchResult[],
  sessionPath: string,
): SearchResult[] {
  if (results.length <= 1) return results;

  const db = getDb();

  // Get all entries for this session to compute turn boundaries
  const allEntries = db.prepare(
    "SELECT entry_id, role FROM entries WHERE session_path = ? ORDER BY line_number ASC",
  ).all(sessionPath) as { entry_id: string; role: string }[];

  if (allEntries.length === 0) return results;

  // Build entry_id -> turn_user_entry_id map
  let currentUserEntry = "";
  const turnMap = new Map<string, string>();
  for (const entry of allEntries) {
    if (entry.role === "user") {
      currentUserEntry = entry.entry_id;
    }
    turnMap.set(entry.entry_id, currentUserEntry);
  }

  // Deduplicate: keep first hit from each turn (results are rank-ordered)
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const hit of results) {
    const turnKey = turnMap.get(hit.entry_id) || hit.entry_id;
    if (!seen.has(turnKey)) {
      seen.add(turnKey);
      deduped.push(hit);
    }
  }

  return deduped;
}

// ── Main Handler ───────────────────────────────────────────────

export async function handleSbInput(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const query = args.trim();

  // sb-search-no-query
  if (!query) {
    ctx.ui.notify(
      "Usage: /sb <query> — Search and browse historical Pi sessions.",
      "info",
    );
    return;
  }

  ensureIndexed();

  const groups = searchGrouped(query);

  // sb-search-no-results
  if (groups.length === 0) {
    ctx.ui.notify(
      "No matching entries found. Try different keywords.",
      "info",
    );
    return;
  }

  // ── Two-level loop: session list → hit list → session list (on ESC) ──

  let selectedPath: string | undefined;
  while (true) {
    selectedPath = await ctx.ui.custom<string | undefined>(
      (tui, theme, _kb, done) => {
        return new SessionBrowser(groups, makeSelectListTheme(theme), done);
      },
    );

    if (!selectedPath) return; // Esc at session list → exit
    const path: string = selectedPath;

    // ── Level 2+3: Hit browsing + preview ───────────────────────

    const hits = deduplicateByTurn(search(query, path), path);

    if (hits.length === 0) {
      ctx.ui.notify("No hits in selected session.", "info");
      continue; // Back to session list
    }

    const selectedHit = await ctx.ui.custom<SearchResult | undefined>(
      (tui, theme, _kb, done) => {
        return new SessionHitBrowser(
          hits,
          path,
          makeSelectListTheme(theme),
          done,
        );
      },
    );

    if (!selectedHit) continue; // Esc in hit list → back to session list

    // User confirmed a hit → explore with agent and exit
    const prompt = buildExplorePrompt(selectedHit.session_path, selectedHit.entry_id);
    ctx.ui.setEditorText(prompt);
    return;
  }
}

// ── SessionBrowser (Level 1) ───────────────────────────────────

/**
 * Custom component showing sessions as a two-line list.
 * Each session occupies two rows:
 *   line 1: last path segment + timestamp + hit count
 *   line 2: first user message (indented)
 */
class SessionBrowser implements Component {
  private groups: SessionSearchGroup[];
  private theme: SelectListTheme;
  private done: (result: string | undefined) => void;
  private selectedIndex = 0;
  private scrollOffset = 0;
  private maxVisible = 8;
  wantsKeyRelease = false;

  constructor(
    groups: SessionSearchGroup[],
    theme: SelectListTheme,
    done: (result: string | undefined) => void,
  ) {
    this.groups = groups;
    this.theme = theme;
    this.done = done;
  }

  invalidate(): void {
    // No cached state
  }

  render(width: number): string[] {
    const lines: string[] = [];
    lines.push("  Select a session");
    lines.push("");

    // Recalculate scroll to keep selection visible
    const total = this.groups.length;
    const visibleCount = Math.min(this.maxVisible, total);
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = Math.max(0, this.selectedIndex);
    }
    if (this.selectedIndex >= this.scrollOffset + visibleCount) {
      this.scrollOffset = this.selectedIndex - visibleCount + 1;
    }

    const end = Math.min(this.scrollOffset + visibleCount, total);

    for (let i = this.scrollOffset; i < end; i++) {
      const g = this.groups[i];
      const isSelected = i === this.selectedIndex;

      // Build line 1: short path + timestamp + hits
      const ts = g.session_ts.slice(0, 16).replace("T", " ");
      const pathShort = sessionDisplayName(g.session_path);
      const project = extractProjectName(g.project);
      const hitsStr = `${g.hit_count} hit${g.hit_count !== 1 ? "s" : ""}`;
      const line1 = truncateToWidth(
        `${project} ${pathShort} ${ts} ${hitsStr}`,
        width - 4,
        "",
      );

      // Build line 2: first user message — truncate by visible width
      let rawMsg = compressSystemText(g.first_user_message).replace(/[\r\n]+/g, " ");
      // If msg is just a system tag with no actual user text, add project context
      if (rawMsg.match(/^\[[a-z]+:/) && rawMsg.length < 30) {
        rawMsg += "  ·  " + extractProjectName(g.project);
      }
      const msg = truncateToWidth(rawMsg, width - 4, "");

      if (isSelected) {
        lines.push(this.theme.selectedText(`→ ${line1}`));
        lines.push(this.theme.description(`   ${msg}`));
      } else {
        lines.push(`  ${line1}`);
        lines.push(this.theme.description(`   ${msg}`));
      }
    }

    // Scroll indicator
    if (total > visibleCount) {
      lines.push(
        this.theme.scrollInfo(
          `  (${this.selectedIndex + 1}/${total})`,
        ),
      );
    }

    lines.push("");
    lines.push("  ↑↓ navigate · Enter select · Esc cancel");
    return lines;
  }

  handleInput(keyData: string): void {
    // Enter
    if (matchesKey(keyData, Key.enter)) {
      const selected = this.groups[this.selectedIndex];
      this.done(selected?.session_path);
      return;
    }

    // Escape
    if (matchesKey(keyData, Key.escape)) {
      this.done(undefined);
      return;
    }

    // Up — wrap to bottom
    if (matchesKey(keyData, Key.up)) {
      this.selectedIndex =
        this.selectedIndex === 0
          ? this.groups.length - 1
          : this.selectedIndex - 1;
      return;
    }

    // Down — wrap to top
    if (matchesKey(keyData, Key.down)) {
      this.selectedIndex =
        this.selectedIndex === this.groups.length - 1
          ? 0
          : this.selectedIndex + 1;
      return;
    }
  }

  dispose(): void {
    // nothing
  }
}

// ── SessionHitBrowser (Level 2+3) ──────────────────────────────

class SessionHitBrowser implements Component {
  private allHits: SearchResult[];
  private sessionPath: string;
  private theme: SelectListTheme;
  private done: (result: SearchResult | undefined) => void;

  // Paging state
  private currentPage = 0;
  private totalPages: number;

  // Preview state
  private previewVisible = false;
  private previewLines: string[] = [];
  private previewScrollOffset = 0;

  // Active SelectList for current page
  private list: SelectList;

  wantsKeyRelease = false;

  constructor(
    hits: SearchResult[],
    sessionPath: string,
    theme: SelectListTheme,
    done: (result: SearchResult | undefined) => void,
  ) {
    this.allHits = hits;
    this.sessionPath = sessionPath;
    this.theme = theme;
    this.done = done;
    this.totalPages = Math.max(1, Math.ceil(hits.length / MAX_HITS_PER_PAGE));
    this.list = this.buildPageList(0);
  }

  /** Build a SelectList for the given page index. */
  private buildPageList(page: number): SelectList {
    const start = page * MAX_HITS_PER_PAGE;
    const end = Math.min(start + MAX_HITS_PER_PAGE, this.allHits.length);
    const pageHits = this.allHits.slice(start, end);

    const items: SelectItem[] = pageHits.map((h, i) => {
      const ts = h.timestamp ? h.timestamp.slice(11, 19) : "?";
      const role = h.role;
      const firstLine = truncateToWidth(
        compressSystemText((h.first_line || "").replace(/[\r\n]+/g, " ")),
        78,
        "",
      );
      return {
        value: String(start + i),
        label: `${ts} ${role} | ${firstLine}`,
      };
    });

    return new SelectList(items, MAX_HITS_PER_PAGE, this.theme);
  }

  /** Load preview content for the currently selected hit. */
  private loadPreview(): void {
    const pageStart = this.currentPage * MAX_HITS_PER_PAGE;
    const selected = this.list.getSelectedItem();
    if (!selected) return;

    const hitIdx = parseInt(selected.value, 10);
    const hit = this.allHits[hitIdx];
    if (!hit) return;

    if (!existsSync(hit.session_path)) {
      this.previewLines = ["[Session file not found]"];
      this.previewScrollOffset = 0;
      this.previewVisible = true;
      return;
    }

    const db = getDb();
    const turn = buildTurnFromEntryId(db, hit.entry_id, hit.session_path);
    if (!turn) {
      this.previewLines = ["[Entry not found]"];
      this.previewScrollOffset = 0;
      this.previewVisible = true;
      return;
    }

    // Compress system text but preserve user input after the system block
    turn.user_text = compressWithUserText(turn.user_text);

    // Truncate long user text in preview to avoid dominating the viewport
    const userLines = turn.user_text.split("\n");
    const MAX_USER_LINES = 15;
    if (userLines.length > MAX_USER_LINES) {
      turn.user_text =
        userLines.slice(0, MAX_USER_LINES).join("\n") +
        "\n[... " +
        (userLines.length - MAX_USER_LINES) +
        " more lines of user text truncated]";
    }

    const text = formatTurn(turn);
    this.previewLines = text.split("\n");
    this.previewScrollOffset = 0;
    this.previewVisible = true;
  }

  invalidate(): void {
    this.list.invalidate();
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const totalHits = this.allHits.length;

    lines.push(`  Hits in session (${totalHits} total)`);
    lines.push("");

    if (this.previewVisible) {
      // ── Preview mode ──
      const maxPreviewLines = PREVIEW_PAGE_LINES;
      const visibleStart = this.previewScrollOffset;
      const visibleEnd = Math.min(
        visibleStart + maxPreviewLines,
        this.previewLines.length,
      );

      const availWidth = width - 2; // account for "  " prefix
      for (let i = visibleStart; i < visibleEnd; i++) {
        lines.push(`  ${truncateToWidth(this.previewLines[i], availWidth, "")}`);
      }

      if (this.previewLines.length > maxPreviewLines) {
        const pct = Math.round(
          (visibleEnd / this.previewLines.length) * 100,
        );
        lines.push(
          `  ── ${visibleEnd}/${this.previewLines.length} lines (${pct}%) ──`,
        );
      }

      lines.push("");
      lines.push(
        "  ↑↓ scroll · PgUp/PgDn page · Space/Esc close",
      );
    } else {
      // ── Hit list mode ──
      lines.push(...this.list.render(width));

      // Pager
      const pageStart = this.currentPage * MAX_HITS_PER_PAGE + 1;
      const pageEnd = Math.min(
        pageStart + MAX_HITS_PER_PAGE - 1,
        totalHits,
      );
      lines.push(
        `  Page ${this.currentPage + 1}/${this.totalPages} (${pageStart}-${pageEnd} of ${totalHits})`,
      );

      lines.push("");
      lines.push(
        "  ↑↓ navigate · ←→ page · Space preview · Enter explore · Esc back",
      );
    }

    return lines;
  }

  handleInput(keyData: string): void {
    if (this.previewVisible) {
      // ── Preview mode input ──
      const pageSize = PREVIEW_PAGE_LINES;

      // Close preview: Space or Escape
      if (matchesKey(keyData, Key.space) || matchesKey(keyData, Key.escape)) {
        this.previewVisible = false;
        return;
      }

      // Page Up — scroll up by one viewport
      if (matchesKey(keyData, Key.pageUp)) {
        this.previewScrollOffset = Math.max(0, this.previewScrollOffset - pageSize);
        return;
      }

      // Page Down — scroll down by one viewport
      if (matchesKey(keyData, Key.pageDown)) {
        const maxOffset = Math.max(0, this.previewLines.length - pageSize);
        this.previewScrollOffset = Math.min(maxOffset, this.previewScrollOffset + pageSize);
        return;
      }

      // Scroll up — single line
      if (
        matchesKey(keyData, Key.up) ||
        matchesKey(keyData, "up" as any)
      ) {
        this.previewScrollOffset = Math.max(0, this.previewScrollOffset - 1);
        return;
      }

      // Scroll down
      if (
        matchesKey(keyData, Key.down) ||
        matchesKey(keyData, "down" as any)
      ) {
        const maxOffset = Math.max(0, this.previewLines.length - pageSize);
        this.previewScrollOffset = Math.min(
          maxOffset,
          this.previewScrollOffset + 1,
        );
        return;
      }

      return;
    }

    // ── Hit list mode input ──

    // Enter — confirm selection → explore with agent
    if (matchesKey(keyData, Key.enter)) {
      const selected = this.list.getSelectedItem();
      if (selected) {
        const hitIdx = parseInt(selected.value, 10);
        this.done(this.allHits[hitIdx]);
      } else {
        this.done(undefined);
      }
      return;
    }

    // Escape — back to session list
    if (matchesKey(keyData, Key.escape)) {
      this.done(undefined);
      return;
    }

    // Space — toggle preview
    if (matchesKey(keyData, Key.space)) {
      this.loadPreview();
      return;
    }

    // Left — previous page
    if (matchesKey(keyData, Key.left)) {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.list = this.buildPageList(this.currentPage);
      }
      return;
    }

    // Right — next page
    if (matchesKey(keyData, Key.right)) {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
        this.list = this.buildPageList(this.currentPage);
      }
      return;
    }

    // Delegate up/down to SelectList
    this.list.handleInput(keyData);
  }

  dispose(): void {
    // nothing
  }
}

// ── Explore Prompt Builder ─────────────────────────────────────

function buildExplorePrompt(sessionPath: string, entryId: string): string {
  return `请探索并总结一个历史 session 的内容。

定位信息:
- Session 文件: ${sessionPath}
- Entry ID: ${entryId}

工具使用建议:
1. 先用 session-iterate(direction="end", mode="summary") 了解会话全局结构
2. 根据 session_overview 中的 turn 摘要，定位关键 turn
3. 用 session-iterate(direction="next"|="prev", mode="full") 深读关键 turn
4. 用 session-read 查看特定 toolResult 的完整输出
5. 最后给出涵盖整个 session 的有结构总结

提示: 优先用 direction=end 获取全局视角，再决定深入方向。`;
}
