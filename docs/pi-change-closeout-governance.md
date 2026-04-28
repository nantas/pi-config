# Pi Change Closeout Governance

This document defines the closeout governance rule for `pi-config` feature and configuration changes.

## Purpose

- Keep repository-managed Pi configuration aligned with completed implementation changes.
- Make global Pi deployment an explicit, auditable closeout step instead of an implicit follow-up.
- Preserve the existing Phase 1 managed sync contract without redefining runtime semantics.

## Applies To

This rule applies to `pi-config` feature or configuration changes that affect repository-managed Pi runtime behavior.

The mandatory closeout review covers whether implementation changed the intent of any managed Pi source surface:

- `.pi/settings.json`
- `.pi/extensions/`
- `.pi/agents/`
- `.pi/prompts/`
- `.pi/themes/`

## Required Closeout Sequence

1. Complete implementation.
2. Explicitly assess whether repository `.pi/settings.json` must change.
3. If required, update repository `.pi/settings.json` before verification passes.
4. Generate verification evidence and record one repository settings outcome:
   - `repo-settings-updated`
   - `repo-settings-unchanged`
5. Ask the user whether to sync repository-managed Pi settings to the global Pi runtime.
6. If the user confirms, deploy through the existing Phase 1 managed sync workflow to `~/.pi/agent/settings.json`.
7. Record one global sync outcome:
   - `global-sync-confirmed-and-run`
   - `global-sync-declined`
   - `global-sync-deferred-blocked`

## Deployment Rule

- Repository `.pi/settings.json` remains the managed source of truth for the settings covered by the Phase 1 sync contract.
- Global deployment target remains `~/.pi/agent/settings.json`.
- Deployment must use the existing managed sync workflow such as `scripts/sync-pi-agent.sh`.
- This workflow remains copy-based and overwrite-based; this document does not introduce merge semantics.

## Out Of Scope

This governance rule does not change the deployment status of shared-layer config:

- `.mcp.json`
- `.agents/skills/`
- other shared cross-agent resources outside the Phase 1 managed `.pi/` path set

Changes to those surfaces may have their own verification and governance steps, but they are not part of the “sync repository-managed Pi settings to global Pi runtime” confirmation defined here.
