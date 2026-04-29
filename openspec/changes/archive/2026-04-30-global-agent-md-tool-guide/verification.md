# Verification: global-agent-md-tool-guide

## Summary

| Item | Status |
|------|--------|
| Deliverable 1: `.pi/agent/AGENTS.md` | ✅ Created, 29 lines, tool call guidance content |
| Deliverable 2: `scripts/sync-pi-agent.sh` update | ✅ Added `sync_agents_md` function with cp/rm logic |
| Deliverable 3: `AGENTS.md` — `## Global Agent Guidance` section | ✅ Added with 4-step workflow |
| Prerequisites: `~/.pi/agent/` exists | ✅ Target directory available |
| Bash syntax: sync script | ✅ `bash -n` passes |

---

## Spec Coverage Verification

### Requirement: Project-Managed AGENTS.md

| Scenario | Status | Evidence |
|---|---|---|
| Tool call guidance content | ✅ | `.pi/agent/AGENTS.md` contains Edit/batch limit, Bash/sed preference, Error recovery protocol sections |
| File located at correct path | ✅ | `.pi/agent/AGENTS.md` exists in repository |

### Requirement: Sync Script Update

| Scenario | Status | Evidence |
|---|---|---|
| AGENTS.md synced on execution | ✅ | `sync_agents_md()`: `cp "${source_path}" "${target_path}"` when source exists |
| AGENTS.md removed on source deletion | ✅ | `sync_agents_md()`: `rm -f "${target_path}"` when source does not exist |
| Other files preserved | ✅ | Uses `cp` (single file), not `sync_dir`; does not affect other files in `~/.pi/agent/` |

### Requirement: Root AGENTS.md Workflow Rule

| Scenario | Status | Evidence |
|---|---|---|
| Workflow rule for updating global guidance | ✅ | `AGENTS.md` `## Global Agent Guidance` defines 4-step workflow: update source → version control → user confirms → sync |
| User confirmation required | ✅ | Step 3: "obtain explicit user confirmation" documented |

---

## File Verification

| File | Path | Status |
|---|---|---|
| Agent guidance | `.pi/agent/AGENTS.md` | ✅ 29 lines, covers edit/bash/error rules |
| Sync script | `scripts/sync-pi-agent.sh` | ✅ Bash syntax valid, `sync_agents_md` function added, output updated |
| Root AGENTS.md | `AGENTS.md` | ✅ `## Global Agent Guidance` section added |

---

## Conclusion

All 4 spec requirements have full implementation coverage. Files are valid and correctly structured. Global sync requires user confirmation per documented workflow.
