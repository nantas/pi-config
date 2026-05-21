# Writeback

## Change: agent-guidance-restructure
## Status: implementation-verified

---

## Summary

Successfully restructured agent guidance by:
1. Creating `serena-code-intelligence` skill (replacing `lsp-code-intelligence`)
2. Consolidating reference docs from `AGENTS.d/` to `docs/reference/`
3. Simplifying global `AGENTS.md` from ~200+ to 86 lines
4. Removing 6 unnecessary `AGENTS.d/` files

## Writeback Targets

### Target: `.pi/agent/AGENTS.md`
- **Action**: Simplified (86 lines, all spec requirements met)
- **Status**: ✅ Done in-repo. Global sync via `scripts/sync-pi-agent.sh` deferred to closeout.

### Target: `.pi/agent/AGENTS.d/lsp-guide.md`
- **Action**: Deleted
- **Status**: ✅ Done

### Target: `.pi/agent/AGENTS.d/output-quality.md`
- **Action**: Deleted
- **Status**: ✅ Done

### Target: `.pi/agent/AGENTS.d/tool-ask-user.md`
- **Action**: Deleted
- **Status**: ✅ Done

### Target: `.pi/agent/AGENTS.d/tool-mcp.md`
- **Action**: Deleted
- **Status**: ✅ Done

### Target: `.pi/agent/AGENTS.d/pi-provider-model.md`
- **Action**: Moved to `docs/reference/pi-provider-model.md`
- **Status**: ✅ Done

### Target: `.pi/agent/AGENTS.d/readme-governance.md`
- **Action**: Moved to `docs/reference/readme-governance.md`
- **Status**: ✅ Done

### Target: `docs/reference/pi-provider-model.md`
- **Action**: Created (full content from AGENTS.d source)
- **Status**: ✅ Done

### Target: `docs/reference/readme-governance.md`
- **Action**: Created (full content from AGENTS.d source)
- **Status**: ✅ Done

### Target: `.pi/skills/lsp-code-intelligence/`
- **Action**: Deleted
- **Status**: ✅ Done

### Target: `.pi/skills/serena-code-intelligence/SKILL.md`
- **Action**: Created (419 lines, comprehensive serena usage guide)
- **Status**: ✅ Done

### Target: `AGENTS.md` (project root)
- **Action**: Updated with docs/reference/ links
- **Status**: ✅ Done

### Target: `.pi/capabilities.yaml`
- **Action**: Replaced `lsp-code-intelligence` with `serena-code-intelligence` in `global.skills`
- **Status**: ✅ Done

---

## Post-Archive Actions

After archiving this change:

1. **Global sync**: Run `scripts/sync-pi-agent.sh` to propagate the simplified `AGENTS.md` and removed `AGENTS.d/` files to `~/.pi/agent/`
2. **Verify global state**: Confirm `~/.pi/agent/AGENTS.md` is 86 lines and `~/.pi/agent/AGENTS.d/` only contains `subagent-usage.md`
3. **Skill availability**: Confirm `serena-code-intelligence` appears in Pi's skill list for new sessions
