# Design

## Context

`pi-subagents` supports overriding builtin agent configurations via the `subagents.agentOverrides` section in settings files (`.pi/settings.json` for project scope, `~/.pi/agent/settings.json` for user scope).

The override mechanism is defined in `pi-subagents/agents.ts` — the `discoverAgents()` function reads settings, parses overrides, and calls `applyBuiltinOverrides()` to merge them into builtin agent configs. Overrides can set `model`, `thinking`, `systemPromptMode`, `inheritProjectContext`, `inheritSkills`, `disabled`, `systemPrompt`, `skills`, and `tools`.

The 8 builtin agents are defined in `pi-subagents/agents/*.md` with YAML frontmatter. Seven use `openai-codex/*` models — the root cause of dispatch failures in this environment.

## Goals / Non-Goals

**Goals:**
- Override model to `deepseek/deepseek-v4-flash` for all 7 affected builtin agents
- Override applied via `.pi/settings.json` (project scope)
- `delegate` and project-owned agents unaffected
- Dispatch calls succeed with overridden models

**Non-Goals:**
- Changing `thinking` level or other agent configs
- User-scope overrides (`~/.pi/agent/settings.json`)
- Modifying `pi-subagents` npm package

## Decisions

### D1: Project-scope override (`.pi/settings.json`)

The override is placed in the project's `.pi/settings.json` rather than `~/.pi/agent/settings.json` because:
- This is a pi-config repo configuration concern
- Project scope takes precedence over user scope
- The repo is the source of truth for pi-config managed settings

### D2: Override only `model`, preserve other defaults

Only the `model` field is overridden. `thinking` level, `systemPromptMode`, `inheritProjectContext`, and other agent configs are preserved from builtin defaults. This minimizes the override surface and avoids unintended behavioral changes.

### D3: Explicit per-agent overrides (not bulk disable)

Each agent gets an explicit override entry rather than using `disableBuiltins` or a catch-all. This makes it clear which agents are affected and allows future customization of individual agents without ambiguity.

## Affected Agents

| Agent | Original Model | Override | Reason |
|-------|---------------|----------|--------|
| `context-builder` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `oracle` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `planner` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `researcher` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `reviewer` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `scout` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `worker` | `openai-codex/gpt-5.3-codex` | `deepseek/deepseek-v4-flash` | No openai-codex key |
| `delegate` | (inherits parent) | — | No explicit model |
| `code-writer` | (inherits parent) | — | Project-owned, no explicit model |
| `dispatch-planner` | (inherits parent) | — | Project-owned, no explicit model |

## Risks / Migration

- **Risk**: `deepseek/deepseek-v4-flash` may have different capability profile than `gpt-5.5` for complex reasoning tasks. **Mitigation**: Monitor subagent output quality; can switch individual agents to `deepseek/deepseek-v4-pro` if needed.
- **Risk**: Future `pi-subagents` update may change agent names or add new agents with `openai-codex/*` models. **Mitigation**: New agents will still fail — a recurring check is needed.
- **Migration**: None — no existing overrides to migrate.
