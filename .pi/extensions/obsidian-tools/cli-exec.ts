import { spawn } from "child_process";

export interface CliResult {
	ok: boolean;
	stdout: string;
	stderr: string;
	code: number | null;
}

const BINARY = "obsidian-cli";

/**
 * Spawn an obsidian-cli command and return structured result.
 * Handles timeout and AbortSignal cancellation.
 */
export function runCli(
	args: string[],
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<CliResult> {
	return new Promise((resolve) => {
		const child = spawn(BINARY, args, {
			stdio: ["ignore", "pipe", "pipe"],
			signal,
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (d: Buffer) => {
			stdout += d.toString();
		});
		child.stderr.on("data", (d: Buffer) => {
			stderr += d.toString();
		});

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			resolve({
				ok: false,
				stdout,
				stderr: `Command timed out after ${timeoutMs}ms`,
				code: null,
			});
		}, timeoutMs);

		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ ok: code === 0, stdout, stderr, code });
		});

		child.on("error", (err: NodeJS.ErrnoException) => {
			clearTimeout(timer);
			if (signal?.aborted) {
				resolve({
					ok: false,
					stdout,
					stderr: "Command cancelled by abort signal.",
					code: null,
				});
			} else if (err.code === "ENOENT") {
				resolve({
					ok: false,
					stdout: "",
					stderr:
						"Obsidian CLI not found. Ensure Obsidian is installed and obsidian-cli is in PATH.",
					code: null,
				});
			} else {
				resolve({ ok: false, stdout, stderr: err.message, code: null });
			}
		});
	});
}
