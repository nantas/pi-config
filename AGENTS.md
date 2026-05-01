# AGENTS.md

## Goal

This repository stores `pi-config` workspace configuration and OpenSpec artifacts.

## Package Management

Pi package research and management follows a structured workflow defined in the `pkg-research` skill:

- **Skill-driven**: All package research, evaluation, and installation decisions must go through the workflow defined in `.pi/skills/pkg-research/SKILL.md`.
- **Security review first**: No package may be installed (project-level or global) before completing a security source review (Phase 1).
- **User-driven decisions**: All three outcomes (add to global / backlog / discard) are chosen by the user; the agent never auto-selects.
- **Global sync requires confirmation**: Updating `~/.pi/agent/` via `scripts/sync-pi-agent.sh` requires explicit user confirmation per the global-runtime-sync-confirmation rule.
- **Backlog persistence**: Non-global packages are recorded in `openspec/pkg-backlog.md` with structured entries for future reference.
- **Temp isolation**: Security review clones use `mktemp -d` and are unconditionally cleaned up after review.

## Agent Extension

When the task requires creating a new dispatch agent or modifying an existing agent's behavior (model, thinking level, tools, system prompt):

- **Scenarios**: Adding a new specialized subagent (e.g., config auditor, migration helper), overriding builtin agent settings via `subagents.agentOverrides`, or creating a project-level agent file for repo-specific delegation.
- **Reference**: See `docs/reference/pi-subagents-extend-agent.md` for the full frontmatter reference, creation workflows (TUI / manual / programmatic), and prompt assembly rules.
- **Convention**: Project agents go in `.pi/agents/{name}.md`. Overrides go in `.pi/settings.json` under `subagents.agentOverrides`.
- **Validation**: After creating, verify via `/agents` list and `/run {name}` before marking the task done.

## Working Rules

- Default language: Chinese for discussion, English for code and filenames unless the repo already uses Chinese.
- Keep changes small and targeted.
- Use OpenSpec files in `openspec/` as the primary project context when relevant.
- When `pi-config` work needs confirmation from Pi source code or official Pi docs, use `$cross-repo-research` against `repo://pi-mono` in-session and read local repository evidence; do not use web search for that Pi source/doc confirmation path.
- Feature and configuration change closeout follows the workflow defined in `docs/pi-change-closeout-governance.md`. When a change reaches verification phase, read that document and follow its required closeout sequence.
- OpenSpec writeback targets are resolved via `repo://` virtual paths through the global repo registry at `~/.config/orbitos/repo_registry.json`. Before executing writeback, resolve the target path via `repo-registry` skill (`resolve --repo-ref repo://<id>`), then edit the target file directly. Writeback content must be a concise summary (conclusion, status, deliverables, verification result), not a copy of full artifacts.

## Capability Manifest Governance

`.pi/capabilities.yaml` is the single source of truth for which `.pi/` resources are
globally synced and which are available for on-demand installation. All additions,
removals, or scope changes of the following resource types MUST be accompanied by a
corresponding update to `.pi/capabilities.yaml`:

- **Extensions** — Single-file `.ts` or directory with `package.json`
- **Skills** — Directories under `.pi/skills/` containing `SKILL.md`
- **Agents** — `.md` files under `.pi/agents/`
- **Packages** — Entries in `.pi/settings.json` `packages` array

### Workflow Guidance

| Action | Manifest Update Required |
|--------|--------------------------|
| Add new extension (global scope) | Append to `global.extensions` |
| Add new extension (optional scope) | Append to `catalog.extensions` |
| Remove an extension | Remove from `global.extensions` or `catalog.extensions` |
| Add package to global config | Append to `global.settings.packages` |
| Add package to backlog | Append to `catalog.packages` with `type: settings-entry` |
| Remove a package | Remove from `global.settings.packages` or `catalog.packages` |
| Add/remove an agent | Update `global.agents` |
| Add/remove a skill | Update `global.skills` or `catalog.skills` |

### Enforcement

- The `pkg-research` skill automatically writes to `capabilities.yaml` during Phase 3
  (Decision).
- The `pi-extension-dev` skill automatically writes to `capabilities.yaml` during Phase F
  (Deployment).
- Manual changes to `.pi/` resources without updating `capabilities.yaml` will cause
  sync drift and MUST be corrected before the next sync.

---

## Global Agent Guidance

Cross-session agent behavior guidance (tool call rules, agent workflow constraints) is managed through a version-controlled workflow:

1. **Update source**: Modify `.pi/agent/AGENTS.md` in the repository (not `~/.pi/agent/AGENTS.md` directly).
2. **Version control**: Commit changes to `.pi/agent/AGENTS.md` so they are tracked and reviewable.
3. **User confirms sync**: Before deploying to global, obtain explicit user confirmation.
4. **Sync to global**: Run `scripts/sync-pi-agent.sh` to copy `.pi/agent/AGENTS.md` → `~/.pi/agent/AGENTS.md`.

This ensures all global agent guidance changes are auditable, reversible, and follow the same workflow as other managed Pi configurations.

## Done Definition

- Relevant files are updated with minimal, coherent changes.
- Git status is clean except for intentional untracked files not part of the task.
- Any repo setup changes are reflected in tracked files when appropriate.
- Verification for `pi-config` feature or configuration changes records whether repository settings were updated and whether global Pi sync was run, declined, or deferred.

## Source of Truth

- Repository workflow rules: this file.
- Project artifacts: `openspec/`.
