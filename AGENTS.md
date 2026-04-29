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

## Working Rules

- Default language: Chinese for discussion, English for code and filenames unless the repo already uses Chinese.
- Keep changes small and targeted.
- Use OpenSpec files in `openspec/` as the primary project context when relevant.
- When `pi-config` work needs confirmation from Pi source code or official Pi docs, use `$cross-repo-research` against `repo://pi-mono` in-session and read local repository evidence; do not use web search for that Pi source/doc confirmation path.
- For any `pi-config` feature or configuration change closeout, explicitly assess whether repository `.pi/settings.json` must change; if required, update the repository file before verification is considered complete.
- After verification for a `pi-config` feature or configuration change, ask whether the repository-managed Pi settings should be synced to global Pi runtime; only sync to `~/.pi/agent/settings.json` after explicit confirmation, using the existing managed workflow rather than ad hoc runtime edits.
- OpenSpec writeback targets are resolved via `repo://` virtual paths through the global repo registry at `~/.config/orbitos/repo_registry.json`. Before executing writeback, resolve the target path via `repo-registry` skill (`resolve --repo-ref repo://<id>`), then edit the target file directly. Writeback content must be a concise summary (conclusion, status, deliverables, verification result), not a copy of full artifacts.

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
