# AGENTS.md

## Goal

This repository stores `pi-config` workspace configuration and OpenSpec artifacts.

## Working Rules

- Default language: Chinese for discussion, English for code and filenames unless the repo already uses Chinese.
- Keep changes small and targeted.
- Use OpenSpec files in `openspec/` as the primary project context when relevant.
- For any `pi-config` feature or configuration change closeout, explicitly assess whether repository `.pi/settings.json` must change; if required, update the repository file before verification is considered complete.
- After verification for a `pi-config` feature or configuration change, ask whether the repository-managed Pi settings should be synced to global Pi runtime; only sync to `~/.pi/agent/settings.json` after explicit confirmation, using the existing managed workflow rather than ad hoc runtime edits.

## Done Definition

- Relevant files are updated with minimal, coherent changes.
- Git status is clean except for intentional untracked files not part of the task.
- Any repo setup changes are reflected in tracked files when appropriate.
- Verification for `pi-config` feature or configuration changes records whether repository settings were updated and whether global Pi sync was run, declined, or deferred.

## Source of Truth

- Repository workflow rules: this file.
- Project artifacts: `openspec/`.
