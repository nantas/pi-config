import { runCli } from "./cli-exec";

const VALID_TOKEN = /^[a-z0-9:_-]+$/i;
const DANGEROUS_COMMANDS = new Set(["eval", "dev:cdp", "dev:debug", "restart"]);

interface ToolParams {
	command: string;
	vault: string;
	params?: Record<string, string>;
	flags?: string[];
	allowDangerous?: boolean;
	timeoutMs?: number;
}

interface ToolResult {
	content: { type: "text"; text: string }[];
	details: { ok: boolean; code?: number | null };
}

function validateToken(value: string, label: string): string | null {
	if (!VALID_TOKEN.test(value)) {
		return `Invalid ${label}. Use only letters, numbers, :, _, -.`;
	}
	return null;
}

function err(text: string, details?: { code?: number | null }): ToolResult {
	return { content: [{ type: "text", text }], details: { ok: false, ...details } };
}

export const rawToolDefinition = {
	name: "obsidian_cli",
	label: "Obsidian CLI",
	description:
		"Execute Obsidian CLI commands (create, move, rename, delete, append, read, property:set, etc.) for file operations that automatically maintain wikilink integrity.",
	parameters: {
		type: "object" as const,
		properties: {
			command: {
				type: "string",
				description:
					"Obsidian CLI command name (e.g., create, move, rename, delete, append, read, property:set, tags, tasks)",
			},
			vault: {
				type: "string",
				description: "Target vault name (e.g., my-wiki). Required.",
			},
			params: {
				type: "object",
				additionalProperties: { type: "string" },
				description: 'Key-value parameters (e.g., { file: "My Note", content: "..." })',
			},
			flags: {
				type: "array",
				items: { type: "string" },
				description: "Boolean flags (e.g., [\"verbose\"])",
			},
			allowDangerous: {
				type: "boolean",
				description:
					"Set to true to allow dangerous commands (eval, dev:cdp, dev:debug, restart)",
			},
			timeoutMs: {
				type: "number",
				description: "Timeout in milliseconds (default 30000)",
			},
		},
		required: ["command", "vault"],
	},
	promptSnippet:
		"Use obsidian_cli for Obsidian vault file operations (create/move/rename/delete/append/read). These commands maintain wikilink integrity automatically. The 'vault' parameter is required — use the vault name (e.g., my-wiki).",
	promptGuidelines: [
		"Prefer obsidian_cli over direct file writes when moving, renaming, or deleting notes to preserve wikilink references.",
		"Use the 'read' command to fetch note content. Use 'property:set' to update frontmatter fields.",
	],

	async execute(
		_toolCallId: string,
		params: ToolParams,
		signal: AbortSignal | undefined,
		_onUpdate: unknown,
		_ctx: unknown,
	): Promise<ToolResult> {
		const { command, vault, params: kv, flags, allowDangerous, timeoutMs } = params;

		// Validate command
		const cmdErr = validateToken(command, "command");
		if (cmdErr) return err(cmdErr);

		// Validate vault presence
		if (!vault || vault.trim() === "") {
			return err("Parameter 'vault' is required. Provide the vault name (e.g., 'my-wiki').");
		}

		// Validate params keys
		if (kv) {
			for (const key of Object.keys(kv)) {
				const e = validateToken(key, `param key '${key}'`);
				if (e) return err(e);
			}
		}

		// Validate flags
		if (flags) {
			for (const flag of flags) {
				const e = validateToken(flag, `flag '${flag}'`);
				if (e) return err(e);
			}
		}

		// Dangerous command check
		if (DANGEROUS_COMMANDS.has(command) && !allowDangerous) {
			return err(
				`Blocked dangerous command '${command}'. Re-run with allowDangerous=true if intentional.`,
			);
		}

		// Build args
		const args: string[] = [`vault=${vault}`, command];
		if (kv) {
			for (const [key, value] of Object.entries(kv)) {
				args.push(`${key}=${value}`);
			}
		}
		if (flags) {
			args.push(...flags);
		}

		const timeout = timeoutMs ?? 30000;
		const result = await runCli(args, timeout, signal);

		const cmdLine = `obsidian-cli ${args.join(" ")}`;
		if (result.ok) {
			return {
				content: [{ type: "text", text: `$ ${cmdLine}\n${result.stdout}` }],
				details: { ok: true },
			};
		} else {
			return {
				content: [
					{ type: "text", text: `$ ${cmdLine}\n${result.stdout}\n${result.stderr}` },
				],
				details: { ok: false, code: result.code },
			};
		}
	},
};
