/**
 * browse-session-tree
 *
 * Pi extension that registers `/browse` command. Uses the built-in
 * TreeSelectorComponent for ALL tree rendering (same as `/tree`).
 * Adds a scrollable DetailPanel below the tree, toggled with Space.
 * Mouse wheel + j/k + PgUp/PgDn supported for DetailPanel scrolling.
 * Search mode via `/`, cancel via Escape/Enter.
 *
 * Capability: `browse-session-tree`
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import type { SessionTreeNode } from "@mariozechner/pi-coding-agent";
import { Container, Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import type { TUI } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";
import { TreeSelectorComponent } from "@mariozechner/pi-coding-agent";

// ── word-wrap helper ──

function wrapLines(text: string, width: number): string[] {
	const out: string[] = [];
	for (const para of text.split("\n")) {
		if (para.length === 0) { out.push(""); continue; }
		let i = 0;
		while (i < para.length) {
			out.push(para.slice(i, i + width));
			i += width;
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// DetailPanel
// ---------------------------------------------------------------------------

class DetailPanel {
	private entry: any = null;
	private lines: string[] = [];
	private offset = 0;
	private maxLines = 10;
	private visible = false;
	private mouse = false;
	constructor(private tui: TUI) {}

	get expanded() { return this.visible; }

	toggle() {
		this.visible = !this.visible;
		if (this.visible) this.enableMouse();
		else this.disableMouse();
	}

	setEntry(e: any) { this.entry = e; this.offset = 0; this.build(); }
	setMaxLines(n: number) { this.maxLines = Math.max(3, n); }

	private enableMouse() { if (!this.mouse) { this.mouse = true; this.tui.terminal.write("\x1b[?1000h\x1b[?1006h"); } }
	disableMouse() { if (this.mouse) { this.mouse = false; this.tui.terminal.write("\x1b[?1000l\x1b[?1006l"); } }

	private build() {
		if (!this.entry) { this.lines = ["(no selection)"]; return; }
		const e = this.entry;
		const l: string[] = [];

		if (e.type === "message") {
			const msg = e.message;
			const r = msg.role ?? "?";

			if (r === "assistant") {
				l.push(`Role: assistant${msg.model ? ` | Model: ${msg.model}` : ""}`);
				if (typeof msg.stopReason === "string" && msg.stopReason !== "stop" && msg.stopReason !== "toolUse") {
					l.push(`Stop: ${msg.stopReason}`);
				}
				// Text content
				const t = allText(msg.content);
				if (t) { l.push("", "── Response ──"); for (const ln of wrapLines(t, 100)) l.push(ln); }
				// Tool calls
				const tc = allToolCalls(msg.content);
				if (tc.length > 0) {
					l.push("", `── Tool Calls (${tc.length}) ──`);
					for (const t of tc) {
						l.push(`  ${t.name ?? "?"}`);
						const a = t.input ?? t.arguments;
						if (a) {
							const js = typeof a === "string" ? a : JSON.stringify(a, null, 2);
							for (const ln of js.split("\n")) l.push(`    ${ln}`);
						}
					}
				}
			} else if (r === "tool" || r === "toolResult") {
				const tn = msg.toolName ?? msg.name ?? extractToolName(msg);
				l.push(`Role: tool${tn ? ` | ${tn}` : ""} | ${msg.isError ? "ERROR" : "OK"}`);
				const t = allText(msg.content);
				if (t) { l.push("", "── Output ──"); for (const ln of wrapLines(t, 100)) l.push(ln); }
			} else if (r === "user") {
				l.push("Role: user");
				const t = allText(msg.content);
				if (t) { l.push("", "── Message ──"); for (const ln of wrapLines(t, 100)) l.push(ln); }
				if (Array.isArray(msg.content)) {
					const imgs = msg.content.filter((b: any) => b?.type === "image" || b?.type === "image_url");
					if (imgs.length > 0) l.push("", `📷 ${imgs.length} image${imgs.length > 1 ? "s" : ""}`);
				}
			} else {
				l.push(`Role: ${r}`);
				const t = allText(msg.content);
				if (t) for (const ln of wrapLines(t, 100)) l.push(ln);
			}
		} else if (e.type === "compaction") {
			l.push(`Compaction`);
			if (e.summary) { l.push(""); for (const ln of wrapLines(e.summary, 100)) l.push(ln); }
			if (typeof e.tokensBefore === "number") l.push(`Tokens before: ${e.tokensBefore}`);
		} else if (e.type === "branch_summary") {
			l.push(`Branch Summary (from ${e.fromId ?? "?"})`);
			if (e.summary) { l.push(""); for (const ln of wrapLines(e.summary, 100)) l.push(ln); }
		} else if (e.type === "model_change") {
			l.push(`Model: ${e.provider ?? "?"}/${e.modelId ?? "?"}`);
		} else if (e.type === "thinking_level_change") {
			l.push(`Thinking Level: ${e.thinkingLevel ?? "?"}`);
		} else {
			l.push(`${e.type}: ${e.id}`);
		}

		this.lines = l;
	}

	private scroll(d: number) {
		if (d < 0) this.offset = Math.max(0, this.offset + d);
		else this.offset = Math.min(Math.max(0, this.lines.length - this.maxLines), this.offset + d);
	}

	handleInput(data: string) {
		if (!this.visible) return;
		const m = data.match(/^\x1b\[<(\d+);\d+;\d+[Mm]$/);
		if (m) { const b = parseInt(m[1], 10); if (b === 64) this.scroll(-3); else if (b === 65) this.scroll(3); return; }
		if (matchesKey(data, Key.pageUp)) this.scroll(-this.maxLines);
		else if (matchesKey(data, Key.pageDown)) this.scroll(this.maxLines);
		else if (data === 'k') this.scroll(-1);
		else if (data === 'j') this.scroll(1);
	}

	render(width: number): string[] {
		const l: string[] = [];
		const B = (c: string) => `\x1b[2m${c}\x1b[22m`;
		const iw = width - 2;

		l.push(truncateToWidth(B("┌") + "─".repeat(iw) + B("┐"), width, "...", true));

		if (!this.visible || !this.entry) {
			// Collapsed or no entry — show placeholder, keep fixed height
			l.push(truncateToWidth(B("│") + "┄ Press Space for detail ┄".padEnd(iw) + B("│"), width, "...", true));
			for (let i = 1; i < this.maxLines + 1; i++) {
				l.push(truncateToWidth(B("│") + " ".repeat(iw) + B("│"), width, "...", true));
			}
		} else {
			// Expanded — show content with scroll offset
			l.push(truncateToWidth(B("│") + `┄ Detail ${this.offset}/${Math.max(0, this.lines.length - this.maxLines)} ──`.padEnd(iw) + B("│"), width, "...", true));
			const end = Math.min(this.offset + this.maxLines, this.lines.length);
			for (let i = this.offset; i < end; i++) {
				const s = this.lines[i];
				l.push(truncateToWidth(B("│") + s.padEnd(iw, " ").slice(0, iw) + B("│"), width, "...", true));
			}
			for (let i = end - this.offset; i < this.maxLines; i++) {
				l.push(truncateToWidth(B("│") + " ".repeat(iw) + B("│"), width, "...", true));
			}
		}

		l.push(truncateToWidth(B("└") + "─".repeat(iw) + B("┘"), width, "...", true));
		return l;
	}
}

// ---------------------------------------------------------------------------
// Helpers (detail panel content extraction)
// ---------------------------------------------------------------------------

function allText(c: any): string {
	if (typeof c === "string") return c.trim();
	if (!Array.isArray(c)) return "";
	return c
		.filter((b: any) => b && typeof b === "object" && (b.type === "text" || b.type === "input_text"))
		.map((b: any) => b.text ?? "")
		.join("\n")
		.trim();
}

function allToolCalls(c: any): any[] {
	if (!Array.isArray(c)) return [];
	return c.filter((b: any) => b && typeof b === "object" && (b.type === "tool_use" || b.type === "tool_call"));
}

function extractToolName(msg: any): string {
	return msg.toolName ?? msg.name ?? "";
}

// ---------------------------------------------------------------------------
// BrowseComponent — TreeSelectorComponent + DetailPanel
// ---------------------------------------------------------------------------

class BrowseComponent extends Container {
	private treeList: any;  // TreeList from built-in TreeSelectorComponent
	private detail: DetailPanel;
	private selector: TreeSelectorComponent; // kept for TreeList lifecycle
	private searchMode = false;

	constructor(
		tree: SessionTreeNode[],
		leafId: string | null,
		tui: TUI,
		theme: Theme,
		done: (res: { action: "navigate" | "cancel"; targetId?: string }) => void,
	) {
		super();

		const th = tui.terminal?.rows ?? 24;
		const detailH = 3 + Math.max(4, Math.floor(th * 0.25));
		const treeH = th - detailH;

		// Create TreeSelectorComponent only to get its internal TreeList.
		// We do NOT addChild(selector) — we use treeList directly.
		this.selector = new TreeSelectorComponent(tree, leafId, treeH,
			(id: string) => { this.detail.disableMouse(); done({ action: "navigate", targetId: id }); },
			() => { this.detail.disableMouse(); done({ action: "cancel" }); },
		);
		this.treeList = this.selector.getTreeList();

		// DetailPanel
		this.detail = new DetailPanel(tui);
		this.detail.setMaxLines(detailH - 3);
		this.addChild(this.detail);

		if (tree.length === 0) {
			setTimeout(() => done({ action: "cancel" }), 100);
		}
	}

	handleInput(data: string): void {
		// ── Search mode ──
		if (this.searchMode) {
			if (matchesKey(data, Key.escape)) {
				this.searchMode = false;
				this.treeList.handleInput(data); // clears search query
				return;
			}
			if (matchesKey(data, "tui.select.confirm")) {
				this.searchMode = false;
				// Don't forward Enter to treeList (would trigger onSelect → navigate)
				return;
			}
			// ↑/↓ navigates filtered results; printable chars build query
			this.treeList.handleInput(data);
			return;
		}

		// ── Space: toggle detail ──
		if (matchesKey(data, Key.space)) {
			this.detail.toggle();
			if (this.detail.expanded) {
				const sel = this.treeList.getSelectedNode?.();
				this.detail.setEntry(sel?.entry ?? null);
			}
			return;
		}

		// ── /: enter search mode (auto-collapse detail) ──
		if (data === '/') {
			this.searchMode = true;
			if (this.detail.expanded) this.detail.toggle();
			return;
		}

		if (this.detail.expanded) {
			// ── Reading: route scroll keys to detail ──
			if (/^\x1b\[</.test(data) ||
				matchesKey(data, Key.pageUp) || matchesKey(data, Key.pageDown) ||
				data === 'j' || data === 'k') {
				this.detail.handleInput(data);
				return;
			}
			// ↑/↓: collapse detail, then navigate tree
			if (matchesKey(data, Key.up) || matchesKey(data, Key.down)) {
				this.detail.toggle();
				// Fall through to tree navigation below
			} else {
				// Non-navigation key while reading: ignore
				return;
			}
		}

		// ── Tree navigation ──
		// Only forward keys that aren't plain printable chars (prevent implicit search)
		const isPlainChar = data.length === 1 && !/^\x1b/.test(data) &&
			data.charCodeAt(0) >= 32 && data.charCodeAt(0) <= 126;
		if (isPlainChar) return;

		const prev = this.treeList.getSelectedNode?.()?.entry?.id;
		this.treeList.handleInput(data);
		const curr = this.treeList.getSelectedNode?.()?.entry?.id;
		if (curr !== prev && this.detail.expanded) {
			this.detail.setEntry(this.treeList.getSelectedNode?.()?.entry ?? null);
		}
	}

	invalidate(): void {
		super.invalidate();
		this.treeList.invalidate?.();
	}

	dispose(): void {
		this.detail.disableMouse();
	}

	render(width: number): string[] {
		const treeLines = this.treeList.render(width);

		if (this.searchMode) {
			const query = this.treeList.getSearchQuery();
			const searchPrompt = `  /${query || ""}  ⏎ confirm  ⎋ cancel`;
			const searchLine = truncateToWidth(searchPrompt, width, "...", true);
			const detailLines = this.detail.render(width);
			return [...treeLines, searchLine, ...detailLines];
		}

		const detailLines = this.detail.render(width);
		return [...treeLines, ...detailLines];
	}
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
	const K = "__pi_ext_browse_session_tree_loaded";
	if ((globalThis as any)[K]) return;
	(globalThis as any)[K] = true;
	pi.on("session_shutdown", () => { delete (globalThis as any)[K]; });

	pi.registerCommand("browse", {
		description: "Open enhanced session tree browser with detail preview",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			if (!ctx.hasUI) return;
			const tree = ctx.sessionManager.getTree();
			if (tree.length === 0) return;

			const result = await ctx.ui.custom<{ action: "navigate" | "cancel"; targetId?: string }>(
				(tui, theme, _kb, done) => new BrowseComponent(tree, ctx.sessionManager.getLeafId(), tui, theme, done),
			);

			if (result?.action === "navigate" && result.targetId) {
				ctx.navigateTree(result.targetId);
			}
		},
	});
}
