/**
 * output-scroll-viewer
 *
 * Pi extension that detects when the agent's final assistant message
 * exceeds one terminal screen and offers to display it in a scrollable
 * overlay viewer with Markdown rendering and keyboard navigation.
 *
 * Capability: `output-scroll-viewer`
 *
 * Spec: openspec/changes/output-scroll-viewer/specs/output-scroll-viewer/spec.md
 */

import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import type { Component, MarkdownTheme, TUI } from "@earendil-works/pi-tui";
import {
	Key,
	Markdown,
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from an assistant message's content field.
 * Compatible with both content arrays and plain string formats.
 */
function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.filter(
				(block): block is { type: "text"; text: string } =>
					block &&
					typeof block === "object" &&
					(block as any).type === "text" &&
					typeof (block as any).text === "string",
			)
			.map((block) => block.text)
			.join("\n");
	}
	return "";
}

/**
 * Create a styled MarkdownTheme from a Theme instance.
 */
function createMarkdownTheme(theme: Theme): MarkdownTheme {
	return {
		heading: (text: string) => theme.fg("mdHeading", text),
		link: (text: string) => theme.fg("mdLink", text),
		linkUrl: (text: string) => theme.fg("mdLinkUrl", text),
		code: (text: string) => theme.fg("mdCode", text),
		codeBlock: (text: string) => theme.fg("mdCodeBlock", text),
		codeBlockBorder: (text: string) => theme.fg("mdCodeBlockBorder", text),
		quote: (text: string) => theme.fg("mdQuote", text),
		quoteBorder: (text: string) => theme.fg("mdQuoteBorder", text),
		hr: (text: string) => theme.fg("mdHr", text),
		listBullet: (text: string) => theme.fg("mdListBullet", text),
		bold: (text: string) => theme.bold(text),
		italic: (text: string) => theme.italic(text),
		strikethrough: (text: string) => theme.strikethrough(text),
		underline: (text: string) => theme.underline(text),
	};
}

/**
 * Create a plain (no-style) MarkdownTheme for line-count estimation
 * without needing a Theme instance.
 */
function createPlainMarkdownTheme(): MarkdownTheme {
	const id = (t: string) => t;
	return {
		heading: id,
		link: id,
		linkUrl: id,
		code: id,
		codeBlock: id,
		codeBlockBorder: id,
		quote: id,
		quoteBorder: id,
		hr: id,
		listBullet: id,
		bold: id,
		italic: id,
		strikethrough: id,
		underline: id,
	};
}

// ---------------------------------------------------------------------------
// ScrollableOutputViewer — overlay component
// ---------------------------------------------------------------------------

class ScrollableOutputViewer implements Component {
	private lines: string[] = [];
	private scrollOffset = 0;
	private maxVisibleLines: number;

	constructor(
		private tui: TUI,
		theme: Theme,
		private text: string,
		width: number,
		private done: () => void,
	) {
		// Calculate available height (border = 4 lines: top, scroll-indicator, hints, bottom)
		const terminalRows = this.tui.terminal?.rows ?? 24;
		this.maxVisibleLines = Math.max(1, terminalRows - 4);

		// Render markdown to get the line list at this width (minus border)
		const mdTheme = createMarkdownTheme(theme);
		const contentWidth = Math.max(1, width - 2);
		const md = new Markdown(text, 1, 0, mdTheme);
		this.lines = md.render(contentWidth);

		// Ensure at least one line for empty content
		if (this.lines.length === 0) {
			this.lines = [""];
		}

		// Enable SGR mouse mode for mouse wheel scrolling
		this.enableMouseMode();

		// Wrap done() to disable mouse mode before closing
		const originalDone = this.done;
		this.done = () => {
			this.disableMouseMode();
			originalDone();
		};
	}

	/**
	 * Enable SGR extended mouse mode (DECSET 1000 + 1006) so the terminal
	 * sends button events including mouse wheel scroll events.
	 */
	private enableMouseMode(): void {
		this.tui.terminal.write("\x1b[?1000h\x1b[?1006h");
	}

	/**
	 * Disable SGR mouse mode (DECRST 1000 + 1006) to restore the terminal
	 * to its default mouse event behavior.
	 */
	private disableMouseMode(): void {
		this.tui.terminal.write("\x1b[?1000l\x1b[?1006l");
	}

	handleInput(data: string): void {
		// ── SGR mouse event detection (mouse wheel scrolling) ──
		const sgrMatch = data.match(/^\x1b\[<(\d+);\d+;\d+[Mm]$/);
		if (sgrMatch) {
			const button = parseInt(sgrMatch[1], 10);
			if (button === 64) {
				// Mouse wheel up: scroll up 3 lines
				this.scrollOffset = Math.max(0, this.scrollOffset - 3);
				this.tui.requestRender();
			} else if (button === 65) {
				// Mouse wheel down: scroll down 3 lines
				const maxOffset = Math.max(0, this.lines.length - this.maxVisibleLines);
				this.scrollOffset = Math.min(maxOffset, this.scrollOffset + 3);
				this.tui.requestRender();
			}
			// Non-wheel mouse events (button !== 64/65) silently ignored
			return;
		}

		// Close: Escape, q, Ctrl+C
		if (
			matchesKey(data, Key.escape) ||
			matchesKey(data, "q") ||
			matchesKey(data, Key.ctrl("c"))
		) {
			this.done();
			return;
		}

		// Scroll up one line: ↑ or k
		if (matchesKey(data, Key.up) || matchesKey(data, "k")) {
			this.scrollOffset = Math.max(0, this.scrollOffset - 1);
			this.tui.requestRender();
			return;
		}

		// Scroll down one line: ↓ or j
		if (matchesKey(data, Key.down) || matchesKey(data, "j")) {
			const maxOffset = Math.max(0, this.lines.length - this.maxVisibleLines);
			this.scrollOffset = Math.min(maxOffset, this.scrollOffset + 1);
			this.tui.requestRender();
			return;
		}

		// Page up: PageUp or Ctrl+U
		if (matchesKey(data, Key.pageUp) || matchesKey(data, Key.ctrl("u"))) {
			this.scrollOffset = Math.max(0, this.scrollOffset - this.maxVisibleLines);
			this.tui.requestRender();
			return;
		}

		// Page down: PageDown or Ctrl+D
		if (matchesKey(data, Key.pageDown) || matchesKey(data, Key.ctrl("d"))) {
			const maxOffset = Math.max(0, this.lines.length - this.maxVisibleLines);
			this.scrollOffset = Math.min(maxOffset, this.scrollOffset + this.maxVisibleLines);
			this.tui.requestRender();
			return;
		}

		// Jump to start: Home or g
		if (matchesKey(data, Key.home) || matchesKey(data, "g")) {
			this.scrollOffset = 0;
			this.tui.requestRender();
			return;
		}

		// Jump to end: End, G, or Shift+G
		if (matchesKey(data, Key.end) || matchesKey(data, "G") || matchesKey(data, Key.shift("g"))) {
			const maxOffset = Math.max(0, this.lines.length - this.maxVisibleLines);
			this.scrollOffset = maxOffset;
			this.tui.requestRender();
			return;
		}
	}

	invalidate(): void {
		// No cached state to invalidate
	}

	render(width: number): string[] {
		const result: string[] = [];
		const innerW = Math.max(1, width - 2);

		// Pad a string to fill inner width
		const padLine = (s: string): string => {
			const visW = visibleWidth(s);
			if (visW >= innerW) return truncateToWidth(s, innerW, "...", true);
			return s + " ".repeat(innerW - visW);
		};

		// Dimmed border helper
		const border = (char: string) => `\x1b[2m${char}\x1b[22m`;

		// ── Top border with title ──
		const title = ` Output Scroll Viewer (${this.lines.length} lines) `;
		const titleW = visibleWidth(title);
		const dashCount = Math.max(0, innerW - titleW);
		const leftDashes = Math.floor(dashCount / 2);
		const rightDashes = dashCount - leftDashes;
		result.push(
			border(`┌${"─".repeat(leftDashes)}`) +
				title +
				border(`${"─".repeat(rightDashes)}┐`),
		);

		// ── Scroll indicators ──
		const canScrollUp = this.scrollOffset > 0;
		const canScrollDown = this.scrollOffset < this.lines.length - this.maxVisibleLines;
		const scrollUp = canScrollUp ? "\x1b[2m▲\x1b[22m" : " ";
		const scrollDown = canScrollDown ? "\x1b[2m▼\x1b[22m" : " ";
		const totalPages = Math.max(0, this.lines.length - this.maxVisibleLines);
		const scrollInfo = `${scrollUp} ${this.scrollOffset}/${totalPages} ${scrollDown}`;
		result.push(border("│") + padLine(scrollInfo) + border("│"));

		// ── Visible content lines ──
		const visibleLines = this.lines.slice(
			this.scrollOffset,
			this.scrollOffset + this.maxVisibleLines,
		);

		for (const line of visibleLines) {
			result.push(border("│") + padLine(line) + border("│"));
		}

		// Pad remaining rows to keep overlay height stable
		for (let i = visibleLines.length; i < this.maxVisibleLines; i++) {
			result.push(border("│") + padLine("") + border("│"));
		}

		// ── Bottom border with keyboard hints ──
		const hints = "↑↓/jk scroll | PgUp/Dn page | g/G home/end | Esc/q close";
		result.push(
			border("│") +
				padLine(` \x1b[2m${hints}\x1b[22m`) +
				border("│"),
		);
		result.push(border(`└${"─".repeat(innerW)}┘`));

		return result;
	}
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
	// GlobalThis self-dedup — prevents duplicate registration when loaded
	// from both project-local (.pi/extensions/) and global
	// (~/.pi/agent/extensions/) paths. Uses session-scoped key.
	const _key = "__pi_ext_output_scroll_viewer_loaded";
	const SESSION_COUNTER = "__pi_ext_session_counter";

	const sessionId = (globalThis as any)[SESSION_COUNTER] ?? 0;
	const sessionKey = `${_key}_session_${sessionId}`;

	if ((globalThis as any)[sessionKey]) return;
	(globalThis as any)[sessionKey] = true;

	pi.on("session_shutdown", () => {
		(globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
	});

	// session_start: hook point for capturing session-level context.
	// The TUI instance (needed for terminal.rows/columns) is only available
	// inside the overlay factory function passed to ctx.ui.custom(), so we
	// capture dimensions there rather than here.
	pi.on("session_start", async (_event, _ctx) => {
		// No-op — terminal dimensions are captured lazily in the overlay
		// factory when the component is created.
	});

	// ──── agent_end handler: main logic ────
	pi.on("agent_end", async (event, ctx) => {
		// Edge case 2.5.4: UI not available (print/JSON mode)
		if (!ctx.hasUI) return;

		// Find the last assistant message with text content from event.messages
		const messages = event.messages;
		let lastAssistantText = "";

		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (msg.role === "assistant") {
				const text = extractTextFromContent(msg.content);
				if (text.trim()) {
					lastAssistantText = text.trim();
					break;
				}
			}
		}

		// Edge case 2.5.1: no assistant message found → silent return
		// Edge case 2.5.2: assistant message has only tool calls, no text → silent return
		if (!lastAssistantText) return;

		// Edge case 2.5.5: default terminal rows to 36 if unknown
		// (user-configured threshold; change this value to adjust sensitivity)
		const terminalRows = 90;

		// Phase 1: Quick estimation — raw newline count
		const rawLineCount = lastAssistantText.split("\n").length;

		// Edge case 2.5.3: text fits on one screen (quick check)
		if (rawLineCount <= terminalRows) return;

		// Phase 2: Precise detection — render with Markdown at a reasonable width
		// (80 columns is a safe conservative estimate; if it at least fits at
		// 80 cols, actual wider terminals will only have fewer lines)
		let renderedLineCount: number;
		try {
			const plainMd = createPlainMarkdownTheme();
			const md = new Markdown(lastAssistantText, 0, 0, plainMd);
			renderedLineCount = md.render(80).length;
		} catch {
			renderedLineCount = rawLineCount;
		}

		// After precise rendering, still fits on one screen → no trigger
		if (renderedLineCount <= terminalRows) return;

		// ──── Show confirmation dialog ────
		const estimatedScreens = Math.ceil(renderedLineCount / terminalRows);

		const confirmed = await ctx.ui.confirm(
			"Output Scroll Viewer",
			`The response spans approximately ${estimatedScreens} screen${estimatedScreens > 1 ? "s" : ""}. View from the beginning?`,
		);

		// User declined → no action
		if (!confirmed) return;

		// ──── Open scrollable overlay viewer ────
		await ctx.ui.custom<void>(
			(tui, theme, _kb, done) =>
				new ScrollableOutputViewer(
					tui,
					theme,
					lastAssistantText,
					tui.terminal?.columns ?? 80,
					done,
				),
			{
				overlay: true,
				overlayOptions: {
					anchor: "center",
					width: "100%",
				},
			},
		);
	});
}
