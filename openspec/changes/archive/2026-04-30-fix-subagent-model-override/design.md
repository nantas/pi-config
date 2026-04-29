# Design

## Context

`pi-subagents` supports overriding builtin agent configurations via the `subagents.agentOverrides` section in settings files (`.pi/settings.json` for project scope, `~/.pi/agent/settings.json` for user scope).

The override mechanism is defined in `pi-subagents/agents.ts` — the `discoverAgents()` function reads settings, parses overrides, and calls `applyBuiltinOverrides()` to merge them into builtin agent configs. Overrides can set `model`, `thinking`, `systemPromptMode`, `inheritProjectContext`, `inheritSkills`, `disabled`, `systemPrompt`, `skills`, and `tools`.

The 8 builtin agents are defined in `pi-subagents/agents/*.md` with YAML frontmatter. Seven use `openai-codex/*` models — the root cause of dispatch failures in this environment.

## Goals / Non-Goals

**Goals:**
- Override model for all 7 affected builtin agents from `openai-codex/*` to an available provider
- Override applied via `.pi/settings.json` (project scope)
- Per-agent model customization: agents MAY use different model strings based on role and reasoning requirements
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

### D4: Per-agent model customization (not uniform override)

Each agent's override model MAY be set independently based on its role and reasoning requirements. Agents prioritizing speed or simple extraction (e.g., `scout`, `context-builder`, `researcher`, `reviewer`, `worker`) use a lighter model (`deepseek/deepseek-v4-flash`), while agents handling complex planning/decision work (e.g., `oracle`, `planner`) use a stronger model (`deepseek/deepseek-v4-pro`). This follows the principle that override values should be tuned per agent rather than applied uniformly.

## Affected Agents

| Agent | Original Model | Override | Reason |
|-------|---------------|----------|--------|
| `context-builder` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | Speed-oriented, light extraction |
| `oracle` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-pro` | Complex reasoning & decision consistency |
| `planner` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-pro` | Complex planning & orchestration |
| `researcher` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | Web search & synthesis |
| `reviewer` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | Code review, validation |
| `scout` | `openai-codex/gpt-5.5` | `deepseek/deepseek-v4-flash` | Fast codebase recon |
| `worker` | `openai-codex/gpt-5.3-codex` | `deepseek/deepseek-v4-flash` | Implementation tasks |
| `delegate` | (inherits parent) | — | No explicit model |
| `code-writer` | (inherits parent) | — | Project-owned, no explicit model |
| `dispatch-planner` | (inherits parent) | — | Project-owned, no explicit model |

## Risks / Migration

- **Risk**: `deepseek` models may have different capability profiles than `openai-codex` for certain reasoning tasks. **Mitigation**: Monitor subagent output quality; individual agent model strings are independently customizable and can be adjusted per agent.
- **Risk**: Future `pi-subagents` update may change agent names or add new agents with `openai-codex/*` models. **Mitigation**: New agents will still fail — a recurring check is needed.
- **Migration**: None — no existing overrides to migrate.
