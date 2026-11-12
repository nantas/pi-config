/**
 * Context-usage bar and status labels.
 *
 * The bar is a fixed 20-cell gauge so it never reflows as the percentage grows:
 *   `#` tokens served from the prompt cache
 *   `=` tokens used but not cached
 *   `-` free
 *   `~` soft watermark marker
 *   `!` recommend watermark marker
 *   `|` forced watermark marker
 */

export const BAR_CELLS = 20;

export type BarCell = "#" | "=" | "-" | "~" | "!" | "|";

export interface ContextBarInput {
  usedPct: number | null;
  cachedPct: number;
  softPct: number;
  warnPct: number;
  forcedPct: number;
  usedTokens?: number | null;
  window?: number;
  cells?: number;
}

export interface ContextBar {
  cells: BarCell[];
  label: string;
}

function clampPct(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Cell index (0-based) for a percentage, clamped into the bar. */
export function markerIndex(pct: number, cells: number = BAR_CELLS): number {
  const width = Math.max(1, cells);
  return Math.min(width - 1, Math.max(0, Math.floor((clampPct(pct) / 100) * width)));
}

export function renderContextBar(input: ContextBarInput): ContextBar {
  const cells = Math.max(1, input.cells ?? BAR_CELLS);
  const filled = input.usedPct === null ? 0 : Math.round((clampPct(input.usedPct) / 100) * cells);
  const cached = Math.min(filled, Math.round((clampPct(input.cachedPct) / 100) * cells));

  const bar: BarCell[] = [];
  for (let i = 0; i < cells; i++) {
    if (i < cached) bar.push("#");
    else if (i < filled) bar.push("=");
    else bar.push("-");
  }

  // Markers win over fill so a watermark is never hidden by the used portion.
  if (input.softPct > 0) bar[markerIndex(input.softPct, cells)] = "~";
  if (input.warnPct > 0) bar[markerIndex(input.warnPct, cells)] = "!";
  if (input.forcedPct > 0) bar[markerIndex(input.forcedPct, cells)] = "|";

  const percent = input.usedPct === null ? "--" : `${clampPct(input.usedPct).toFixed(1)}%`;
  const detail =
    input.usedTokens !== null && input.usedTokens !== undefined && input.window
      ? `${formatTokens(input.usedTokens)}/${formatTokens(input.window)}`
      : "";
  return { cells: bar, label: detail ? `${percent} ${detail}` : percent };
}

export function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined || !Number.isFinite(tokens)) return "--";
  if (tokens < 1000) return String(Math.round(tokens));
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`;
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

export function formatPct(pct: number | null | undefined, digits = 1): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "--";
  return `${pct.toFixed(digits)}%`;
}

export const LEVEL_TAGS: Record<string, string> = {
  idle: "idle",
  notice: "notice",
  recommend: "recommend",
  forced: "forced",
};

/** Footer/status text for the current tier. */
export function levelTag(level: string): string {
  return LEVEL_TAGS[level] ?? level;
}

/**
 * One-line status for `ctx.ui.setStatus`. Deliberately compact: pi-powerline owns the footer,
 * so this only adds a secondary indicator.
 */
export function formatStatus(input: {
  percent: number | null;
  level: string;
  cycle?: number;
  silent?: boolean;
  locked?: boolean;
}): string {
  const percent = input.percent === null ? "--" : `${Math.round(input.percent)}%`;
  const tier = input.locked ? "FORCED" : levelTag(input.level);
  const suffix = input.silent ? " (mid-op)" : "";
  const cycle = input.cycle ? ` · c${input.cycle}` : "";
  return `🗜 ${percent} · ${tier}${suffix}${cycle}`;
}

/** Multi-line panel shown by the `/self-compact` info command. */
export function renderInfoPanel(lines: { title: string; rows: Array<[string, string]> }): string[] {
  const width = Math.max(...lines.rows.map(([key]) => key.length), 0);
  return [lines.title, ...lines.rows.map(([key, value]) => `  ${key.padEnd(width)}  ${value}`)];
}
