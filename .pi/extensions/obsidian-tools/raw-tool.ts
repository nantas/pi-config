import { Type } from "typebox";
import { runCli } from "./cli-runner";
import { resolveVault } from "./vault-resolver";

// ── Constants ───────────────────────────────────────────────────

const COMMAND_REGEX = /^[a-z0-9:_-]+$/i;
const DANGEROUS_COMMANDS = new Set(["eval", "dev:cdp", "dev:debug", "restart"]);

// ── Parameter Schema ────────────────────────────────────────────

const cliParams = Type.Object({
  command: Type.String({
    description:
      "Obsidian CLI command name (e.g., read, create, search, tasks, tags, property:set).",
    pattern: "^[a-z0-9:_-]+$",
    minLength: 1,
  }),
  vault: Type.Optional(
    Type.String({
      description:
        "Target vault name or path. Omit for auto-detection from current directory.",
    }),
  ),
  params: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description:
        "Key=value parameters for the command (e.g., { file: 'My Note', mode: 'append' }).",
    }),
  ),
  flags: Type.Optional(
    Type.Array(Type.String(), {
      description: "Boolean flags (e.g., ['--json', '--verbose']).",
    }),
  ),
  allowDangerous: Type.Optional(
    Type.Boolean({
      default: false,
      description:
        "Allow dangerous commands (eval, dev:cdp, dev:debug, restart). " +
        "Only set to true when you fully understand the risk.",
    }),
  ),
  timeoutMs: Type.Optional(
    Type.Integer({
      default: 30_000,
      minimum: 1_000,
      maximum: 120_000,
      description: "Timeout in milliseconds. Default 30s, max 120s.",
    }),
  ),
});

interface CliParams {
  command: string;
  vault?: string;
  params?: Record<string, string>;
  flags?: string[];
  allowDangerous?: boolean;
  timeoutMs?: number;
}

// ── Prompt Helpers ──────────────────────────────────────────────

const promptSnippet =
  "Execute arbitrary Obsidian CLI commands. " +
  "Use for operations like reading notes, creating documents, setting properties, " +
  "managing tasks, or other non-search operations.";

const promptGuidelines = [
  "Use obsidian_search for retrieval — obsidian_cli is for non-search operations (create, read, property:set, tasks).",
  "Specify vault explicitly when working outside an Obsidian vault directory.",
  "Use allowDangerous=true sparingly — only for eval, dev:cdp, dev:debug, and restart commands.",
  "Check command output for errors — if the command fails, the stderr contains the error details.",
  "For file operations, always use forward slashes (/) in paths, even on Windows.",
];

// ── Tool Definition ─────────────────────────────────────────────

export const cliToolDefinition = {
  name: "obsidian_cli",
  label: "Obsidian CLI",
  description: "Execute arbitrary Obsidian CLI commands (read, create, property:set, tasks, etc.).",
  promptSnippet,
  promptGuidelines,
  parameters: cliParams,
  execute: cliToolExecute,
};

// ── Execute ─────────────────────────────────────────────────────

async function cliToolExecute(
  _toolCallId: string,
  params: CliParams,
  signal: AbortSignal | undefined,
  _onUpdate: any,
  _ctx: any,
): Promise<{ content: { type: "text"; text: string }[]; details: Record<string, unknown> }> {
  // 5.2: Input validation
  const validationError = validateInput(params);
  if (validationError) {
    return {
      content: [{ type: "text", text: validationError }],
      details: { ok: false, error: validationError },
    };
  }

  // 5.3: Dangerous command blocking
  const command = params.command.toLowerCase();
  if (DANGEROUS_COMMANDS.has(command) && !params.allowDangerous) {
    const blockMessage = `Blocked dangerous command '${params.command}'. Re-run with allowDangerous=true if intentional.`;
    return {
      content: [{ type: "text", text: blockMessage }],
      details: { ok: false, error: blockMessage, blocked_command: params.command },
    };
  }

  // 5.5: Vault resolution
  let vault: string;
  try {
    vault = resolveVault(params.vault);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: msg }], details: { ok: false, error: msg } };
  }

  // 5.4: Command construction and execution
  const cliArgs: (string | [string, string])[] = [command];

  if (params.params) {
    for (const [key, value] of Object.entries(params.params)) {
      cliArgs.push([key, value]);
    }
  }

  if (params.flags) {
    for (const flag of params.flags) {
      cliArgs.push(flag);
    }
  }

  const timeoutMs = params.timeoutMs ?? 30_000;
  const result = await runCli(vault, cliArgs, signal, timeoutMs);

  const commandLine = `obsidian vault="${vault}" ${command}${
    params.params
      ? " " +
        Object.entries(params.params)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")
      : ""
  }${params.flags ? " " + params.flags.join(" ") : ""}`;

  if (result.code === 0) {
    return {
      content: [{ type: "text", text: result.stdout || "(command completed with no output)" }],
      details: {
        ok: true,
        code: result.code,
        command_line: commandLine,
        vault,
        command,
      },
    };
  }

  return {
    content: [
      {
        type: "text",
        text: result.stderr || result.stdout || `Command exited with code ${result.code}`,
      },
    ],
    details: {
      ok: false,
      code: result.code,
      command_line: commandLine,
      vault,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
    },
  };
}

// ── Input Validation ────────────────────────────────────────────

function validateInput(params: CliParams): string | null {
  if (!COMMAND_REGEX.test(params.command)) {
    return "Invalid command. Use only letters, numbers, :, _, -.";
  }

  if (params.flags) {
    for (let i = 0; i < params.flags.length; i++) {
      const flag = params.flags[i];
      if (!COMMAND_REGEX.test(flag.replace(/^--?/, ""))) {
        return `Invalid flag: "${flag}". Flags contain disallowed characters.`;
      }
    }
  }

  if (params.params) {
    for (const key of Object.keys(params.params)) {
      if (!COMMAND_REGEX.test(key)) {
        return `Invalid parameter key: "${key}". Use only letters, numbers, :, _, -.`;
      }
    }
  }

  return null;
}
