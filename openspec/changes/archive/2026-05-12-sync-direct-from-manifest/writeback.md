# Writeback

## Change Summary

**Change**: sync-direct-from-manifest
**Schema**: orbitos-change-v1
**Status**: Implementation complete, all verification checks pass.

## What Changed

The `sync-pi-agent.sh` settings generation mode was rewritten from a whitelist+exclude_keys intersection filter (reading `.pi/settings.json`) to a direct generation+merge model (reading only `capabilities.yaml` + target file).

### Key Changes:
1. `render_settings_file` rewritten in Python3 + PyYAML (replacing Node.js hand-rolled YAML parser)
2. `global.settings` in capabilities.yaml expanded with `defaultThinkingLevel`, `defaultProvider`, `defaultModel`, `subagents`
3. `global.settings.exclude_keys` removed from capabilities.yaml
4. `.pi/settings.json` cleaned to only contain local dev packages (`npm:lsp-pi`)
5. `pi-runtime-bootstrap-sync` spec Requirement 3 replaced with new direct-generation requirement
6. AGENTS.md Capability Manifest Governance updated to reflect direct-generation model

## Writeback Targets

### Target 1: `repo://pi-config/openspec/specs/pi-runtime-bootstrap-sync/spec.md`
- **Action**: Updated (Requirement 3 replaced, Requirement 2 reference updated)
- **Evidence**: Spec file edited in-place during implementation

### Target 2: `repo://pi-config/.pi/capabilities.yaml`
- **Action**: Updated (new fields added, exclude_keys removed)
- **Evidence**: YAML file edited in-place during implementation

### Target 3: `repo://pi-config/scripts/sync-pi-agent.sh`
- **Action**: Rewritten (`render_settings_file` function)
- **Evidence**: Script file edited in-place during implementation

### Target 4: `repo://pi-config/.pi/agent/AGENTS.md`
- **Action**: Updated (governance table and descriptions)
- **Evidence**: AGENTS.md edited in-place during implementation

All targets are already updated in-place — no additional writeback action required.
