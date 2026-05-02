# Writeback: prompts-manifest-governance

## Summary

Migrated prompts sync from full-directory-copy to manifest-driven approach, with corresponding governance rules in AGENTS.md.

## Targets Written

### `.pi/capabilities.yaml`

**Change**: Added `global.prompts` segment listing 10 opsx-* prompt templates.

```yaml
  prompts:
    - opsx-apply
    - opsx-archive
    - opsx-bulk-archive
    - opsx-continue
    - opsx-explore
    - opsx-ff
    - opsx-new
    - opsx-propose
    - opsx-sync
    - opsx-verify
```

**Verification**: `extractItems("global", "prompts")` returns all 10 entries.

### `scripts/sync-pi-agent.sh`

**Changes**:
1. Added `const globalPrompts = extractItems("global", "prompts");` in `sync_from_manifest()` node script
2. Added SYNC PROMPTS block (copies whitelisted prompts, WARNING on missing)
3. Added STALE PROMPT CLEANUP block (removes unlisted `.md` files)
4. Removed prompts handling from `sync_prompts_and_themes()` — only themes remain
5. Updated summary footer: `prompts/` moved from "Unchanged" to "Managed by manifest"
6. Updated section comments to reflect new structure

**Verification**: `bash -n scripts/sync-pi-agent.sh` — syntax OK.

### `AGENTS.md`

**Changes**:
1. Added "Prompts" to resource types list in Capability Manifest Governance
2. Added "Add/remove a prompt" row to Workflow Guidance table
3. Added Precedence Rule subsection (global shadows project for prompts/skills)

**Verification**: Content review confirms all three additions are present and correctly formatted.

## Status

- **Verification**: ✅ All 16 tasks complete
- **Sync required**: The change modifies project files only within this repo. Running `scripts/sync-pi-agent.sh` will deploy changes to `~/.pi/agent/` globally.
