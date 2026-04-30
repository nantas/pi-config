---
name: pi-extension-dev
description: |
  Guide the LLM through the complete lifecycle of developing a Pi extension
  within the pi-config repository. Covers requirements clarification, design
  decisions (events, Tool vs Command, file organization), OpenSpec-governed
  change creation, implementation, verification, deployment sync via
  scripts/sync-pi-agent.sh, and archival. Reference-type skill — points to
  existing docs rather than duplicating API details.

  Use when: creating a new Pi extension, adding functionality to an existing
  extension, or troubleshooting extension development.
  Do NOT use for: general pi-config configuration, skill development, or
  non-extension coding tasks.
---

# pi-extension-dev

A meta-skill for developing Pi extensions in the `pi-config` repository.

## Workflow Overview

This skill structures extension development into six sequential phases:

| Phase | Name | Exit Criteria |
|-------|------|---------------|
| A | Requirements Clarification | Clear understanding of what, triggers, and API surfaces |
| B | Design Decisions | Event selection, Tool vs Command, file organization confirmed |
| C | OpenSpec Change | proposal/specs/design/tasks created and user-reviewed |
| D | Implementation | Extension code written to `.pi/extensions/` |
| E | Verification | `pi -e` test + openspec-verify-change passing |
| F | Deployment + Archive | `./scripts/sync-pi-agent.sh` + openspec-archive-change done |

---

## Phase A: Requirements Clarification

**Goal:** Establish a clear understanding of the extension's purpose, trigger conditions, and required API surfaces before making design decisions.

### Step 1 — Load prerequisite knowledge

Read the following files in order. Report any missing references and ask the user for guidance before proceeding.

1. `docs/plans/pi-customization-reference.md` Section 3 (Extension System) — baseline knowledge of:
   - Extension structure and the minimal boilerplate
   - Available ExtensionAPI capabilities (`pi.on`, `pi.registerTool`, etc.)
   - Discovery paths and auto-reload behavior
   - Key lifecycle events

2. `repo://pi-mono/packages/coding-agent/docs/extensions.md` — on-demand detailed reference for:
   - Specific event signatures and payload types
   - Tool registration with TypeBox schemas
   - Advanced patterns (async factory, MCP usage)
   - Only read sections needed for the task at hand

### Step 2 — Clarify requirements

Ask the user (or infer from their description) the following:

- **What** does the extension do? (core functionality)
- **When** should it activate? (event-driven, tool-callable, command, ephemeral)
- **Which** ExtensionAPI surfaces are needed? (events, tools, commands, shortcuts, flags)
- **Any** npm dependencies required beyond `@mariozechner/pi-coding-agent` and `@sinclair/typebox`?

If the user has already provided clear requirements, proceed directly to Phase B.

---

## Phase B: Design Decisions

**Goal:** Make three key design decisions with user confirmation before creating any artifacts.

### B1 — Event Selection

Pi provides 20+ lifecycle events. Use this guidance to select the right one:

| If the extension needs to… | Use event | See extensions.md section |
|---|---|---|
| Intercept/modify tool calls | `tool_call` | Tool events |
| Modify LLM context/system prompt | `before_agent_start`, `context` | Session lifecycle |
| React to session lifecycle | `session_start`, `session_shutdown` | Session lifecycle |
| Contribute resources (skills/themes) | `resources_discover` | Resource discovery |
| Intercept user input | `input` | Input events |
| Inspect/modify provider requests | `before_provider_request`, `after_provider_response` | Provider events |
| Run on every LLM call | `before_agent_start` with prompt injection | Session hooks |
| React to model switches | `model_select` | Session lifecycle |
| Branch sessions | `session_before_fork`, `session_fork` | Session lifecycle |

> **Action:** Propose the event(s) to the user and confirm before proceeding.

### ⚠️ Editor Constraint — `ctx.ui.setEditorComponent()`

If your extension needs `ctx.ui.setEditorComponent()`, note that **this is an exclusive-replace API**:

- The last extension to call `setEditorComponent()` wins — all previous custom editors are silently replaced.
- There is no composition/decorator API for editor customization.
- If two extensions both call `setEditorComponent()` in their `session_start` handlers, the one that loads later (usually from `packages` array in `.pi/settings.json`) overwrites the earlier one.

**Preferred alternative**: Use `ctx.ui.addAutocompleteProvider()` when you only need to customize autocomplete behavior. The `addAutocompleteProvider` chain is compositional — multiple extensions can safely stack wrappers.

See [docs/reference/pi-extension-editor-conflict.md](../../docs/reference/pi-extension-editor-conflict.md) for detailed explanation, diagnostic traces, compatibility strategies, and code patterns.

### B2 — Tool vs Command vs Shortcut vs Flag

Use this decision matrix:

| Mechanism | Invoked by | Best for | Example |
|---|---|---|---|
| **Tool** (`registerTool`) | LLM autonomously | LLM needs to call it mid-conversation | `search_docs`, `analyze_code` |
| **Command** (`registerCommand`) | User types `/name` | User-initiated actions | `/hello`, `/summarize` |
| **Shortcut** (`registerShortcut`) | Keyboard shortcut | Power-user efficiency | `Cmd+Shift+F` |
| **Flag** (`registerFlag`) | CLI `--flag` | Startup configuration | `--verbose` |

> **Action:** Propose the mechanism(s) and confirm with the user.

### B3 — File Organization

Decision tree for organizing the extension code:

```
Does the extension need npm dependencies beyond pi-agent + typebox?
├── Yes → Use subdirectory pattern:
│         .pi/extensions/<name>/
│         ├── package.json     (npm dependencies)
│         ├── node_modules/     (installed)
│         └── index.ts          (default export)
│         Action: create dir, `npm init`, add deps, write index.ts
└── No  → Use single-file pattern:
          .pi/extensions/<name>.ts
          Action: create single TypeScript file with default export
```

> **Action:** Propose the file organization and confirm with the user.

---

## Phase C: OpenSpec Change Integration

**Goal:** Govern extension development through the standard OpenSpec change workflow.

### Step 1 — Create the change

Invoke the **openspec-new-change** skill to create a new change:

```
Skill: openspec-new-change
Input: A clear description of the extension to build
```

- The change name should be kebab-case derived from the extension name (e.g., `my-cool-extension`)
- This creates proposal/specs/design/tasks artifacts in `openspec/changes/<name>/`

### Step 2 — Fill artifacts

Work through each artifact in order, presenting to the user for review:

1. **proposal.md** — What the extension does, its capabilities, impact on existing files
2. **specs/<name>/spec.md** — Detailed requirements with scenarios (WHEN/THEN format)
3. **design.md** — Architecture decisions (confirm or refine the decisions from Phase B)
4. **tasks.md** — Implementation tasks decomposed into actionable items

> **Important:** Do not write any implementation code until the user has reviewed and approved all artifacts.

### Step 3 — User review

Present the completed artifacts to the user for confirmation. Only proceed to Phase D after explicit approval.

---

## Phase D: Implementation Guidance

**Goal:** Write extension code following the patterns established in the design and tasks.

### Step 1 — Write the extension

Based on the file organization decision from Phase B:

**Single-file pattern** (`.pi/extensions/<name>.ts`):
```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Register events, tools, commands here
  // Refer to docs/plans/pi-customization-reference.md Section 3 for the minimal template
}
```

**Subdirectory pattern** (`.pi/extensions/<name>/index.ts`):
- Create `.pi/extensions/<name>/package.json` with dependencies
- Run `npm install` inside the extension directory
- Write `index.ts` with the default export function

> **Dedup Requirement:** If this extension will be deployed globally (via `scripts/sync-pi-agent.sh`),
> it MUST include a `globalThis` self-dedup marker AND a `session_shutdown` handler
> at the entry of its `export default function`.
>
> The dedup prevents duplicate registration when the same extension is loaded from both
> project-local (`.pi/extensions/`) and global (`~/.pi/agent/extensions/`) paths.
> The `session_shutdown` handler is REQUIRED to clear the flag when the session ends,
> so that session replacements (`/new`, `/reload`, `/resume`) can re-register handlers.
> Without the `session_shutdown` handler, the `globalThis` flag persists across sessions
> and the extension silently stops working after any session replacement.
>
> For detailed explanation, see [docs/reference/pi-extension-session-shutdown-dedup.md](../../docs/reference/pi-extension-session-shutdown-dedup.md).
>
> ```typescript
> export default function (pi: ExtensionAPI) {
>   const _key = "__pi_ext_<name>_loaded";  // unique per extension
>   if ((globalThis as any)[_key]) return;
>   (globalThis as any)[_key] = true;
>
>   // REQUIRED: clear flag on session end so session replacements work
>   pi.on("session_shutdown", () => {
>     delete (globalThis as any)[_key];
>   });
>
>   // ... rest of extension
> }
> ```
>
> Violating this requirement causes the extension to silently stop working after
> `/new`, `/reload`, or `/resume`.

### Step 2 — Follow tasks.md

Implement each task from the change's `tasks.md` in order. Keep changes minimal and focused.

### Step 3 — No settings.json changes

Pi auto-discovers extensions in `.pi/extensions/`. **Do not** add an `extensions` entry to `.pi/settings.json`. The extension will be automatically loaded on next pi restart or `/reload`.

---

## Phase E: Verification Guidance

**Goal:** Validate the extension works correctly and the OpenSpec change is complete.

### Step 1 — Functional test

Run the extension with pi's ephemeral loader:

```bash
pi -e .pi/extensions/<name>.ts
```

Verify:
- No startup errors
- The extension registers its events/tools/commands as expected
- Core functionality works

### Step 2 — Hot reload test

Inside a running pi session, test hot-reload:

```
/reload
```

Verify the extension reloads without errors.

### Step 3 — OpenSpec verification

Run the OpenSpec verification skill against the change:

```
Skill: openspec-verify-change
Input: <change-name>
```

This validates that all change artifacts are implemented and complete. Address any issues found.

---

## Phase F: Deployment + Archive

**Goal:** Make the extension available globally and finalize the change.

### Step 1 — Deploy to global runtime

Run the managed sync script to copy extensions to `~/.pi/agent/`:

```bash
./scripts/sync-pi-agent.sh
```

> **Note:** This copies `.pi/extensions/`, `.pi/settings.json`, `.pi/prompts/`, `.pi/themes/`, and `.pi/agents/` to `~/.pi/agent/` in a single operation. Do **not** manually edit `~/.pi/agent/settings.json`.

### Step 2 — Ask for confirmation

Ask the user to confirm that the global sync is acceptable before proceeding.

### Step 3 — Archive the change

Run the OpenSpec archive skill:

```
Skill: openspec-archive-change
Input: <change-name>
```

This finalizes the change and updates the project progress page.

---

## Appendix: Quick Reference

### ExtensionAPI Methods

| Method | Purpose | Source Location |
|---|---|---|
| `pi.on(event, handler)` | Subscribe to lifecycle events | extensions.md → "Key Events" |
| `pi.registerTool(config)` | Register LLM-callable tool | extensions.md → "Tool Registration" |
| `pi.registerCommand(name, config)` | Register `/command` | extensions.md → "Commands" |
| `pi.registerShortcut(keys, config)` | Register keyboard shortcut | extensions.md → "Shortcuts" |
| `pi.registerFlag(name, config)` | Register `--flag` | extensions.md → "Flags" |
| `pi.registerProvider(name, config)` | Register/override LLM provider | extensions.md → "Providers" |
| `pi.appendEntry(data)` | Persist state across restarts | extensions.md → "Persistence" |
| `pi.events` | Shared EventBus for inter-extension comms | extensions.md → "EventBus" |

### Key Lifecycle Events

| Event | When It Fires | Source |
|---|---|---|
| `resources_discover` | Startup, resource discovery | reference.md Section 3 |
| `session_start` | Session begins | reference.md Section 3 |
| `session_shutdown` | Session ends | reference.md Section 3 |
| `session_before_compact` | Before compaction | reference.md Section 3 |
| `session_compact` | During compaction | reference.md Section 3 |
| `input` | User sends input | extensions.md → Events |
| `before_agent_start` | Before agent starts | extensions.md → Events |
| `context` | Before LLM call | extensions.md → Events |
| `before_provider_request` | Before provider API call | extensions.md → Events |
| `after_provider_response` | After provider response | extensions.md → Events |
| `tool_call` | Tool is invoked | extensions.md → Events |
| `tool_result` | Tool returns result | extensions.md → Events |
| `user_bash` | `!` / `!!` command | extensions.md → Events |
| `model_select` | Model switches | extensions.md → Events |
| `session_before_fork` | Before session fork | extensions.md → Events |
| `session_fork` | Session branches | extensions.md → Events |

### Key File Paths

| Path | Purpose |
|---|---|
| `.pi/extensions/<name>.ts` | Single-file extension |
| `.pi/extensions/<name>/index.ts` | Subdirectory extension entry |
| `.pi/extensions/<name>/package.json` | Extension npm dependencies |
| `scripts/sync-pi-agent.sh` | Deploy to `~/.pi/agent/` |
| `docs/plans/pi-customization-reference.md` | Extension system reference (Section 3) |
| `repo://pi-mono/packages/coding-agent/docs/extensions.md` | Full ExtensionAPI reference |

### Constraints

- **No manual `~/.pi/agent/settings.json` editing** — all sync goes through `scripts/sync-pi-agent.sh`
- **No `.pi/settings.json` changes for extension discovery** — auto-discovered from `.pi/extensions/`
- **All paths repo-relative** — works from pi-config repository root
- **OpenSpec workflow required** — no ad hoc extension development outside the change workflow
