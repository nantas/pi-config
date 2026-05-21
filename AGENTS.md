# AGENTS.md

## Goal

This repository stores `pi-config` workspace configuration and OpenSpec artifacts.

## Package Management

Pi package research and management follows a structured workflow defined in the `pkg-research` skill:

- **Skill-driven**: All package research, evaluation, and installation decisions must go through the workflow defined in `.pi/skills/pkg-research/SKILL.md`.
- **Security review first**: No package may be installed (project-level or global) before completing a security source review (Phase 1).
- **User-driven decisions**: All outcomes (A: add to repo → sub-decision global/catalog / B: backlog only / C: discard) are chosen by the user; the agent never auto-selects.
- **Global sync requires confirmation**: Updating `~/.pi/agent/` via `scripts/sync-pi-agent.sh` requires explicit user confirmation per the global-runtime-sync-confirmation rule.
- **Backlog persistence**: All decisions (A, B, optionally C) record entries in `openspec/pkg-backlog.md` with structured schema for future reference.
- **Clone lifecycle**: Security review clones are retained through Phase 2 (test reuse) and cleaned up in Phase 3 after decision execution (not immediately after Phase 1).

### Fork Development

When a package already in use needs modification (bug fix, feature addition, or upstream sync), use the `pkg-fork-dev` skill:

- **Scope**: `.pi/skills/pkg-fork-dev/SKILL.md` covers the complete fork lifecycle — Fork & Setup → Modification Planning → Implementation → Local Testing → Commit & Ship → Maintenance.
- **Registry**: All forks are registered in `forks/manifest.yaml` (canonical metadata) and `repo-registry` (machine-specific clone paths via `repo://<name>`).
- **Source switch**: Forking changes the package source in `.pi/settings.json` (npm→git or upstream→fork). The original source is preserved in `manifest.yaml` as `upstream_source`.
- **Local testing**: Use `pi install -l file:<path>` during Phase D, then restore to `git:` URL after shipping.
- **Boundary**: `pkg-fork-dev` complements — does not replace — `pkg-research` (new package evaluation) and `pi-extension-dev` (brand-new extension authoring).

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
- When configuring custom providers, adding models, or setting `enabledModels`, refer to `docs/reference/pi-provider-model.md`.
- When capability changes require README updates, follow `docs/reference/readme-governance.md`.
- OpenSpec writeback targets are resolved via `repo://` virtual paths through the global repo registry at `~/.config/orbitos/repo_registry.json`. Before executing writeback, resolve the target path via `repo-registry` skill (`resolve --repo-ref repo://<id>`), then edit the target file directly. Writeback content must be a concise summary (conclusion, status, deliverables, verification result), not a copy of full artifacts.

## Capability Manifest Governance

`.pi/capabilities.yaml` is the single source of truth for which `.pi/` resources are
globally synced and which are available for on-demand installation. All additions,
removals, or scope changes of the following resource types MUST be accompanied by a
corresponding update to `.pi/capabilities.yaml`:

- **Extensions** — Single-file `.ts` or directory with `package.json`
- **Skills** — Directories under `.pi/skills/` containing `SKILL.md`
- **Agents** — `.md` files under `.pi/agents/`
- **Prompts** — `.md` files under `.pi/prompts/`
- **Packages** — Entries in `global.settings.packages` in `.pi/capabilities.yaml`
- **Settings** — All keys under `global.settings` in `.pi/capabilities.yaml` are authoritative for `~/.pi/agent/settings.json`; keys not listed are preserved from the target file

### Workflow Guidance

| Action | Manifest Update Required |
|--------|--------------------------|
| Add new extension (global scope) | Append to `global.extensions` |
| Add new extension (optional scope) | Append to `catalog.extensions` |
| Remove an extension | Remove from `global.extensions` or `catalog.extensions` |
| Add package to global config | Append to `global.settings.packages` |
| Add settings key to global config | Add key-value to `global.settings` |
| Remove a settings key from global | Remove key from `global.settings` |
| Add package to backlog (pure record) | Only write to `openspec/pkg-backlog.md` (no manifest update) |
| Remove a package | Remove from `global.settings.packages` or `catalog.packages` |
| Add/remove an agent | Update `global.agents` |
| Add/remove a skill | Update `global.skills` or `catalog.skills` |
| Add/remove a prompt | Append to / Remove from `global.prompts` |

### Precedence Rule

Global (`~/.pi/agent/`) resources take precedence over project (`.pi/`) resources for the following types:

- **Prompts**: When a prompt template exists in both `~/.pi/agent/prompts/` and `.pi/prompts/`, the runtime loads the global version; the project version is silently shadowed.
- **Skills**: When a skill exists in both `~/.pi/agent/skills/` and `.pi/skills/`, the global version is loaded; pi-core emits collision diagnostics.

To modify global resources, edit the source files in the pi-config repository (under `.pi/`) and run `scripts/sync-pi-agent.sh` to propagate changes. Modifications to project-local copies under `.pi/` that have a global counterpart will be silently ignored.

### Enforcement

- The `pkg-research` skill automatically writes to `capabilities.yaml` only during Option A
  (Phase 3 sub-decision global/catalog). Options B and C do NOT modify manifest.
- The `pi-extension-dev` skill automatically writes to `capabilities.yaml` during Phase F
  (Deployment).
- Manual changes to `.pi/` resources without updating `capabilities.yaml` will cause
  sync drift and MUST be corrected before the next sync.

---

## Global Agent Guidance

Cross-session agent behavior guidance (tool call rules, agent workflow constraints) is managed through a version-controlled workflow:

1. **Update source**: Modify `.pi/agent/AGENTS.md` (or files in `.pi/agent/AGENTS.d/`) in the repository (not `~/.pi/agent/` directly).
2. **Version control**: Commit changes to `.pi/agent/AGENTS.md` and `AGENTS.d/` so they are tracked and reviewable.
3. **User confirms sync**: Before deploying to global, obtain explicit user confirmation.
4. **Sync to global**: Run `scripts/sync-pi-agent.sh` to sync `.pi/agent/AGENTS.md` + `AGENTS.d/` → `~/.pi/agent/`.

### On-demand Loading

`AGENTS.md` 包含核心规则和高频工具规则（Edit Tool、Bash Tool、Error Recovery）。低频或篇幅较长的指南拆分到 `AGENTS.d/*.md` 中，这些文件**不会自动注入**到 system prompt，agent 在收到含链接的 AGENTS.md 后，根据当前任务按需调用 `read` 工具加载相应文件。这避免了低频规则稀释核心指引的注意力。

这种设计确保了所有全局 agent 指导变更可审计、可回退，且遵循与其他 Pi 配置管理相同的工作流。

## Done Definition

- Relevant files are updated with minimal, coherent changes.
- Git status is clean except for intentional untracked files not part of the task.
- Any repo setup changes are reflected in tracked files when appropriate.
- Verification for `pi-config` feature or configuration changes records whether repository settings were updated and whether global Pi sync was run, declined, or deferred.

## Source of Truth

- Repository workflow rules: this file.
- Project artifacts: `openspec/`.
