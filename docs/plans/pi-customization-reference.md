# Pi Agent Customization Reference

> Research document for pi-config repository planning.
> Source: pi-mono monorepo (packages/coding-agent), pi-vs-claude-code (disler), pi-mcp-adapter (nicobailon)
> Date: 2026-04-28

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Skill System](#2-skill-system)
3. [Extension System](#3-extension-system)
4. [MCP Integration via pi-mcp-adapter](#4-mcp-integration-via-pi-mcp-adapter)
5. [Session Start Hooks](#5-session-start-hooks)
6. [Package Management](#6-package-management)
7. [justfile Pattern](#7-justfile-pattern)
8. [Settings Configuration](#8-settings-configuration)
9. [OpenCode Cross-Compatibility](#9-opencode-cross-compatibility)
10. [Ecosystem Components (pi-vs-claude-code)](#10-ecosystem-components-pi-vs-claude-code)
11. [Decision Matrix](#11-decision-matrix)

---

## 1. Architecture Overview

### pi-mono Monorepo Structure

| Package | npm Name | Role |
|---------|----------|------|
| `packages/ai` | `@mariozechner/pi-ai` | Unified LLM API: providers, streaming, token/cost tracking, cross-provider handoff, 324+ models, 20+ providers |
| `packages/agent` | `@mariozechner/pi-agent-core` | Stateful agent loop with tool execution and event streaming |
| `packages/coding-agent` | `@mariozechner/pi-coding-agent` | **The pi CLI.** Terminal coding harness with interactive, print, JSON, RPC, SDK modes. Contains extensions system, skills system, session management, tools, compaction |
| `packages/tui` | `@mariozechner/pi-tui` | Terminal UI framework: Text, Container, Markdown, editor, autocomplete, themes, 51 color tokens |
| `packages/web-ui` | `@mariozechner/pi-web-ui` | Browser-based chat UI (React, artifacts sandbox) |
| `packages/mom` | `@mariozechner/pi-mom` | Slack bot that delegates to pi coding agent |

### Philosophy

- **Minimal system prompt (~200 tokens)** — trusts frontier models to code without hand-holding
- **Opt-in extensions** — no bloat, only what you need
- **No native MCP** — CLI tools with READMEs (Skills) are the preferred alternative. MCP available via extensions (`pi-mcp-adapter`)
- **Four built-in tools** — `read`, `write`, `edit`, `bash` + optional `grep`, `find`, `ls` via `--tools` flag

---

## 2. Skill System

> Source: `packages/coding-agent/src/core/skills.ts`, `packages/coding-agent/docs/skills.md`

### Standard

Skills follow the [Agent Skills standard](https://agentskills.io/specification): `SKILL.md` files with YAML frontmatter inside named subdirectories.

```
my-skill/
  SKILL.md           # Required: YAML frontmatter + instructions
  scripts/           # Helper scripts (freeform)
  references/        # Reference docs loaded on-demand
```

SKILL.md frontmatter:

```yaml
---
name: my-skill
description: What this skill does and when to use it
---

<instructions>
How the LLM should handle this skill.
</instructions>
```

### Discovery Paths

Skills are discovered from multiple locations in a prioritized order:

| Path | Scope | Source Tag | Precedence |
|------|-------|------------|------------|
| `.pi/skills/` | project | `"settings"` / `"auto"` | 0 (highest) - settings, 1 - auto |
| `.pi/settings.json` -> `skills` array | project | `"settings"` | 0 |
| `.agents/skills/` (walking up to git root) | project | `"auto"` | 1 |
| `~/.pi/agent/skills/` | user | `"settings"` / `"auto"` | 2 - settings, 3 - auto |
| `~/.agents/skills/` | user | `"auto"` | 3 |
| Package-contributed skills (`pi` manifest in `package.json`) | package | `"package"` | 4 (lowest) |
| CLI `--skill <path>` | ephemeral | - | ad-hoc |

**Priority resolution:** Resources get sorted by `resourcePrecedenceRank()`. Lower rank = higher precedence. Within same rank, first-write-wins by canonicalized path.

### Key Discovery Behaviors

- `.agents/skills/` uses **"agents" discovery mode**: only `SKILL.md` inside subdirectories, no root-level `.md` files
- `.pi/skills/` uses **"pi" discovery mode**: `SKILL.md` inside subdirectories **plus** root-level `.md` files as flat skills
- `collectAncestorAgentsSkillDirs()` walks from `cwd` up to git repo root, collecting `.agents/skills` at each level
- If not in a git repo, walks up to filesystem root
- `~/.agents/skills` is handled separately as user-scoped (excluded from upward walk)

### How They Load

- At startup, pi scans skill locations, extracts `name` + `description` from YAML frontmatter
- Skills are listed in system prompt as XML `<available_skills>` blocks
- The LLM uses the `read` tool to load a skill's `SKILL.md` when a task matches
- `disableModelInvocation: true` hides from system prompt (only usable via `/skill:name`)

### Skill Commands

- Skills can be invoked as `/skill:name` if `enableSkillCommands` is `true` (default)
- `/reload` hot-reloads skills from auto-discovered locations

---

## 3. Extension System

> Source: `packages/coding-agent/src/core/extensions/loader.ts`, `runner.ts`, `types.ts`, `docs/extensions.md`

### Overview

Extensions are TypeScript modules loaded via [jiti](https://github.com/unjs/jiti) — no compilation needed. They export a default factory function receiving `ExtensionAPI`.

### Minimal Extension

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Dangerous!", "Allow rm -rf?");
      if (!ok) return { block: true, reason: "Blocked by user" };
    }
  });

  pi.registerTool({
    name: "greet",
    description: "Greet someone by name",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });

  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || "world"}!`, "info");
    },
  });
}
```

### Discovery Paths

| Location | Scope |
|----------|-------|
| `~/.pi/agent/extensions/*.ts` | Global |
| `~/.pi/agent/extensions/*/index.ts` | Global (subdirectory) |
| `.pi/extensions/*.ts` | Project-local |
| `.pi/extensions/*/index.ts` | Project-local (subdirectory) |
| `settings.json` -> `extensions` array | Config-defined |
| `settings.json` -> `packages` array | Package-contributed |
| CLI `-e` / `--extension` flag | Ephemeral |

### Extension Capabilities

| API | Purpose |
|-----|---------|
| `pi.on(event, handler)` | Subscribe to 20+ lifecycle events |
| `pi.registerTool(config)` | Register LLM-callable tool (TypeBox schema) |
| `pi.registerCommand(name, config)` | Register `/command` |
| `pi.registerShortcut(keys, config)` | Register keyboard shortcut |
| `pi.registerFlag(name, config)` | Register `--flag` |
| `pi.registerProvider(name, config)` | Register/override LLM provider |
| `pi.appendEntry(data)` | Persist state that survives restarts |
| `pi.events` | Shared EventBus for inter-extension communication |

### Key Events

| Event | Description |
|-------|-------------|
| `resources_discover` | Contribute skills/themes/prompts |
| `session_start` / `session_shutdown` | Session lifecycle |
| `session_before_compact` / `session_compact` | Compaction hooks |
| `input` | Intercept/transform user input |
| `before_agent_start` | Modify system prompt, inject messages |
| `context` | Modify messages before LLM call |
| `before_provider_request` | Inspect/replace provider payload |
| `after_provider_response` | Inspect response headers |
| `tool_call` | Block or mutate tool arguments |
| `tool_result` | Modify tool results |
| `user_bash` | Intercept `!` / `!!` commands |
| `model_select` | React to model switches |
| `session_before_fork` / `session_fork` | Branching lifecycle |

### Extension Locations: Auto-Discovery vs Explicit

| Method | Identified by | Auto-reload |
|--------|--------------|-------------|
| Auto-discovered (`extensions/` dirs) | File path | Yes (`/reload`) |
| settings.json `extensions` array | File path | Yes |
| settings.json `packages` array | Package identity | Yes |
| CLI `-e` / `--extension` flag | File path | No (session-only) |

### async Factory Functions

Extensions can export async factories. Pi awaits the returned Promise before continuing startup, so async initialization completes before `session_start`, before `resources_discover`, and before provider registrations are flushed.

---

## 4. MCP Integration via pi-mcp-adapter

> Source: `npm:pi-mcp-adapter` (nicobailon), v2.3.4

### Installation

```bash
pi install npm:pi-mcp-adapter
```

### How It Works

- Single `mcp` proxy tool (~200 tokens) instead of hundreds of tool definitions per server
- Servers are **lazy by default** — connect on first tool call, not at startup
- Tool metadata cached to disk (`~/.pi/agent/mcp-cache.json`) — search/list/describe work without live connections
- Idle servers disconnect after 10 minutes (configurable), reconnect automatically on next use
- npx-based servers resolve to direct binary paths (skips ~143 MB npm parent process)

### MCP Tool Usage

| Mode | Example |
|------|---------|
| Status | `mcp({ })` |
| List server | `mcp({ server: "name" })` |
| Search tools | `mcp({ search: "screenshot navigate" })` |
| Describe tool | `mcp({ describe: "tool_name" })` |
| Call tool | `mcp({ tool: "...", args: '{"key": "value"}' })` |
| Connect server | `mcp({ connect: "server-name" })` |
| UI messages | `mcp({ action: "ui-messages" })` |

Search includes both MCP tools and Pi tools (from extensions). Pi tools appear first with `[pi tool]` prefix. Tool names are fuzzy-matched on hyphens and underscores.

### Config File Loading Order

Precedence (highest wins):

1. `~/.config/mcp/mcp.json` — user-global shared MCP config
2. `~/.pi/agent/mcp.json` — Pi global override
3. `.mcp.json` — project-local shared MCP config
4. `.pi/mcp.json` — Pi project override

### Server Lifecycle Modes

| Mode | Startup | Reconnect | Idle Timeout |
|------|---------|-----------|--------------|
| `lazy` (default) | Don't connect | On next tool call | 10 min |
| `eager` | Connect at startup | No auto-reconnect | None (configurable) |
| `keep-alive` | Connect at startup | Auto-reconnect via health checks | None |

### Direct Tools

By default, all MCP tools are accessed through the single `mcp` proxy tool. Specific tools can be promoted to first-class Pi tools via `directTools` config:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"],
      "directTools": true
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "directTools": ["search_repositories", "get_file_contents"]
    }
  }
}
```

Each direct tool costs ~150-300 tokens in the system prompt (name + description + schema). Good for targeted sets of 5-20 tools.

### Compatibility Imports

`/mcp setup` can import server configs from other tools:

| Host | Import Key |
|------|-----------|
| Cursor | `cursor` |
| Claude Code | `claude-code` |
| Claude Desktop | `claude-desktop` |
| VS Code | `vscode` |
| Windsurf | `windsurf` |
| Codex / OpenCode | `codex` |

### Commands

| Command | Purpose |
|---------|---------|
| `/mcp` | Interactive panel |
| `/mcp setup` | Guided setup, imports, scaffolding |
| `/mcp tools` | List all tools |
| `/mcp reconnect` | Reconnect all servers |
| `/mcp reconnect <server>` | Connect/reconnect single server |
| `/mcp-auth <server>` | OAuth setup |

### Project Config Suggestion

Use `.mcp.json` for project-local shared MCP config (opencode compatible). Use `.pi/mcp.json` only for Pi-specific overrides.

---

## 5. Session Start Hooks

### Why This Exists

Claude Code has native `SessionStart` and `SessionEnd` shell hooks. Pi has no such native feature. However, pi's extension system provides the `session_start` event, which can be used to execute arbitrary shell scripts.

### Implementation Pattern (Extension)

```typescript
// extensions/session-hooks.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const hooks = [
      join(ctx.cwd, ".pi/hooks/on-session-start.sh"),
      join(ctx.cwd, ".agents/hooks/on-session-start.sh"),
      join(os.homedir(), ".pi/agent/hooks/on-session-start.sh"),
    ];
    for (const hook of hooks) {
      if (existsSync(hook)) {
        const output = execSync(`bash "${hook}"`, {
          encoding: "utf-8",
          cwd: ctx.cwd,
          timeout: 10_000,
        });
        if (output.trim()) {
          ctx.ui.notify(`Hook: ${hook}\n${output.trim()}`, "info");
        }
      }
    }
  });
}
```

### Requirements

- Always loaded first via justfile or `-e` flag (must be before any extension that depends on hook side effects)
- Can be placed in any auto-discovered extension directory
- Shell scripts execute synchronously (pi startup waits for completion)
- `ctx.cwd` provides the working directory at session launch time
- `process.cwd()` is also available but returns the process working directory (typically same at startup)

### Script Locations (Convention)

```
.pi/hooks/on-session-start.sh     # project-local
.agents/hooks/on-session-start.sh # shared with opencode
~/.pi/agent/hooks/on-session-start.sh  # user-global
```

---

## 6. Package Management

> Source: `packages/coding-agent/docs/packages.md`

### Package Sources

| Source | Syntax | Install Location | Updates |
|--------|--------|-----------------|---------|
| npm | `npm:@scope/pkg@1.2.3` | `~/.pi/npm/node_modules/` (global) or `.pi/npm/node_modules/` (project) | `pi update`, pinned skipped |
| git | `git:github.com/user/repo@v1` | `~/.pi/agent/git/<host>/<path>` (global) or `.pi/git/` (project) | `pi update`, pinned skipped |
| local | `/absolute/path` or `./relative` | Used in-place | N/A |

### Package Manifest (`package.json` optional `pi` field)

```json
{
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

Paths are relative to package root, support glob patterns and `!exclusions`.

### Convention Directories (fallback when no `pi` manifest)

```
extensions/   → .ts and .js files
skills/       → SKILL.md subdirectories (recursive) + top-level .md files
prompts/      → .md files
themes/       → .json files
```

### Commands

| Command | Purpose |
|---------|---------|
| `pi install npm:...` | Install npm package |
| `pi install git:...` | Install git package |
| `pi install ./local/path` | Add local package |
| `pi remove <name>` | Remove package |
| `pi list` | List installed packages |
| `pi update` | Update non-pinned packages |
| `pi -e npm:@foo/bar` | Ephemeral extension (no install) |

### Auto-Install Behavior

- When a project's `.pi/settings.json` references packages, pi auto-installs missing packages on startup
- `@version` pinning skips updates
- Project scope wins over user scope for same package identity

---

## 7. justfile Pattern

> Source: disler/pi-vs-claude-code

### Purpose

A `justfile` is a command runner similar to `make` but simpler. The pattern from `pi-vs-cc` uses it as an **extension composition system** — named recipes that stack extensions with desired configurations.

### Basic Patterns

#### Simple alias (no extensions)

```makefile
pi:
    pi
```

Usage: `just pi`

#### Single extension

```makefile
min:
    pi -e extensions/minimal.ts
```

Usage: `just min`

#### Stacked extensions

```makefile
full:
    pi -e extensions/session-hooks.ts -e extensions/subagent-widget.ts -e extensions/session-replay.ts
```

Usage: `just full`

#### Dynamic extension composition (macOS only)

```makefile
open +exts:
    #!/usr/bin/env bash
    args=""
    for ext in {{exts}}; do
        args="$args -e extensions/$ext.ts"
    done
    cmd="cd '{{justfile_directory()}}' && pi$args"
    escaped="${cmd//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    osascript -e "tell application \"Terminal\" to do script \"$escaped\""
```

Usage: `just open minimal theme-cycler` (opens new Terminal window)

### Key justfile Features

| Feature | Mechanism |
|---------|-----------|
| Dotenv loading | `set dotenv-load := true` auto-loads `.env` |
| Recipe listing | `just --list` shows all recipes with comments |
| Recipe groups | `# g1` comments create visual groups in list output |
| Shell scripts | `#!/usr/bin/env bash` multi-line recipes |
| Argument passing | `+exts` splat argument for dynamic composition |

### Path Resolution

- Extension paths in justfile are relative to the **justfile's directory** (use `{{justfile_directory()}}` for robustness)
- When extensions are in `.pi/extensions/`, paths would be `.pi/extensions/name.ts`
- When using relative paths, ensure the `pi` command is invoked from the correct working directory

### Comparison: justfile vs settings.json

| Aspect | justfile | settings.json |
|--------|---------|---------------|
| Activation | Must run `just <recipe>` | Automatic on `pi` startup |
| Dynamic switching | Different recipe per session | Fixed until config changes |
| Team sharing | Commit justfile | Commit .pi/settings.json |
| Learning curve | First-time `just` setup | Zero extra tools needed |
| Environment vars | `dotenv-load` built-in | Manual sourcing needed |

---

## 8. Settings Configuration

> Source: `packages/coding-agent/src/core/settings-manager.ts`

### File Locations

- **Global:** `~/.pi/agent/settings.json`
- **Project:** `.pi/settings.json`

Project settings deep-merge on top of global settings (project wins).

### Relevant Keys

```json
{
  "packages": [
    "npm:pi-mcp-adapter@2.3.4",
    "git:github.com/user/pi-config@main"
  ],
  "extensions": [
    "/path/to/local/extension.ts",
    "/path/to/extension/dir"
  ],
  "skills": [
    "/path/to/skill/dir"
  ],
  "prompts": [
    "/path/to/prompts"
  ],
  "themes": [
    "/path/to/themes"
  ],
  "enableSkillCommands": true,
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

### Package Source with Filters

```json
{
  "packages": [
    {
      "source": "npm:@foo/bar@1.0.0",
      "extensions": ["*.ts"],
      "skills": ["!test-*"]
    }
  ]
}
```

### Resource Precedence (High to Low)

1. Project + settings-defined
2. Project + auto-discovered
3. User + settings-defined
4. User + auto-discovered
5. Package-contributed

---

## 9. OpenCode Cross-Compatibility

### Shared Resources

| Resource | OpenCode Location | Pi Location | Status |
|----------|------------------|-------------|--------|
| Skills | `.agents/skills/` | `.agents/skills/` | **Already compatible** |
| Skills (global) | `~/.agents/skills/` | `~/.agents/skills/` | **Already compatible** |
| Agent instructions | `AGENTS.md` | `AGENTS.md` | **Already compatible** |
| MCP config | `.mcp.json` | `.mcp.json` via `pi-mcp-adapter` | **Compatible** (same file) |
| Project settings | `.opencode/` | `.pi/` | Not shared (different format) |
| Commands | `.opencode/commands/*.md` | `.pi/extensions/` or justfile | Different mechanism |
| Hooks | `.opencode/hooks/` | `.pi/hooks/` via session hook extension | Compatible (extension needed) |

### Key Compatibility Wins

- **`.agents/skills/` and `~/.agents/skills/`**: Both opencode and pi natively discover these. Place your skills here and both agents can use them.
- **`AGENTS.md`**: Both agents read this from the project root. Shared conventions and instructions.
- **`.mcp.json`**: The `pi-mcp-adapter` reads standard `.mcp.json` files. OpenCode reads the same file. Single source of truth for MCP servers.
- **`~/.agents/skills/`**: User-global skills directory — share skills across all projects and both agents.

### What Pi Does Differently

- **Commands**: pi uses TypeScript extensions with `pi.registerCommand()`, not Markdown command files. The `pi-vs-cc/cross-agent.ts` extension can bridge `.opencode/commands/` if needed.
- **Extension system**: pi uses in-process TypeScript (jiti), not shell hooks. More powerful but agent-specific.
- **Packages**: pi has `pi install`, opencode has plugin marketplaces. Different distribution models.
- **Multiple model providers**: opencode is opencode-proprietary; pi supports 20+ providers.

---

## 10. Ecosystem Components (pi-vs-claude-code)

> Source: github.com/disler/pi-vs-claude-code

### Available Extensions

| Extension | Description | Type |
|-----------|-------------|------|
| `pure-focus.ts` | Removes footer and status line | UI |
| `minimal.ts` | Compact footer with model name + context meter | UI |
| `cross-agent.ts` | Scans `.claude/`, `.gemini/`, `.codex/` dirs for commands/skills/agents | Integration |
| `purpose-gate.ts` | Prompts session intent on startup with persistent widget | Workflow |
| `tool-counter.ts` | Rich footer: model, context, token/cost stats | UI |
| `tool-counter-widget.ts` | Live-updating per-tool call count widget | UI |
| `subagent-widget.ts` | `/sub <task>` spawns background pi subagents with live progress widgets | Orchestration |
| `tilldone.ts` | Task discipline system with persistent task list | Workflow |
| `agent-team.ts` | Dispatcher orchestrator: primary agent delegates to named specialists | Orchestration |
| `system-select.ts` | `/system` to switch between agent personas from `.pi/agents/` | Workflow |
| `damage-control.ts` | Real-time safety auditing for dangerous bash patterns | Safety |
| `agent-chain.ts` | Sequential pipeline orchestrator (output → next input) | Orchestration |
| `pi-pi.ts` | Meta-agent that builds PI agents using parallel research experts | Meta |
| `session-replay.ts` | Scrollable timeline overlay of session history | Debug |
| `theme-cycler.ts` | Keyboard shortcuts + `/theme` for theme switching | UI |

### Companion Docs

| Doc | Content |
|-----|---------|
| `COMPARISON.md` | Claude Code vs Pi Agent: 12 categories, design philosophy, hooks, tools, SDK |
| `PI_VS_OPEN_CODE.md` | Pi Agent vs OpenCode architectural comparison |
| `THEME.md` | Color token reference: `success`, `accent`, `warning`, `dim`, `muted` mappings |
| `TOOLS.md` | Function signatures for built-in tools available inside extensions |
| `RESERVED_KEYS.md` | Reserved, overridable, and safe keybinding categories |

### Project Structure (from pi-vs-cc)

```
pi-vs-cc/
├── extensions/          # .ts extension files
├── specs/               # Feature specifications
├── .pi/
│   ├── agents/          # Agent definitions (.md with frontmatter)
│   │   ├── pi-pi/       # Expert agents for pi-pi meta-agent
│   │   ├── teams.yaml   # Team definitions for agent-team
│   │   ├── agent-chain.yaml  # Pipeline definitions for agent-chain
│   │   └── *.md         # Individual agent personas
│   ├── skills/
│   ├── themes/
│   ├── damage-control-rules.yaml
│   └── settings.json
├── justfile
├── CLAUDE.md
├── THEME.md
└── TOOLS.md
```

---

## 11. Decision Matrix

### Customization Options: Scope and Impact

| Approach | Requires Pi Source Changes | Team Sharing | Dynamic Per Session | Auto-Reload |
|----------|---------------------------|--------------|---------------------|-------------|
| `.pi/extensions/` | No | Commit to repo | Fixed | Yes (`/reload`) |
| `.pi/settings.json` | No | Commit to repo | Fixed | Yes |
| justfile | No | Commit justfile | Yes (`just <recipe>`) | N/A |
| `pi install npm:...` | No | settings.json | Fixed | Yes |
| `pi install git:...` | No | settings.json | Fixed | Yes (on reload) |
| `.agents/skills/` | No (built-in) | Commit to repo | Fixed | Yes |
| `~/.agents/skills/` | No (built-in) | Manual sync | Fixed | Yes |
| `~/.pi/agent/settings.json` | No | N/A (personal) | Fixed | Yes |

### Extension Loading vs justfile

```
                        Strategy Decision Tree

  Do you want different extension sets per session?
  ├── Yes → justfile (different recipe per session)
  │         Example: just min, just full, just team
  │
  └── No → settings.json + auto-discovered extensions
            Same set every session, `/reload` to update

  Do you need to share extensions with the team?
  ├── Yes → `.pi/settings.json` with `packages` array
  │         + git source in package manifest
  │
  └── No → `~/.pi/agent/extensions/` or `~/.pi/agent/settings.json`

  Do you need a minimal context overhead session?
  ├── Yes → justfile with minimal extension set
  │
  └── No → Full set via settings.json (auto-loaded)
```

### Resource Location Rules

```
  Which directory for shared skills?
  ├── Agent-agnostic (used by opencode + pi) → `.agents/skills/`
  ├── Pi-only extension code                 → `.pi/extensions/`
  ├── Pi-only skills                         → `.pi/skills/`
  └── User-global skills (all projects)      → `~/.agents/skills/`

  Which MCP config file?
  ├── Shared with opencode/other tools       → `.mcp.json`
  ├── Pi-specific overrides                  → `.pi/mcp.json`
  └── User-global servers (all projects)     → `~/.config/mcp/mcp.json`
```

---

## Reference

- pi-mono: https://github.com/badlogic/pi-mono
- pi-vs-claude-code: https://github.com/disler/pi-vs-claude-code
- pi-mcp-adapter: https://github.com/nicobailon/pi-mcp-adapter
- Agent Skills standard: https://agentskills.io/specification
- pi docs: https://opencode.ai (also `packages/coding-agent/docs/` in repo)
