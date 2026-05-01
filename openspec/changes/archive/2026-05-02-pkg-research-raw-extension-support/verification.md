# Verification: pkg-research-raw-extension-support

## Change Summary

Support raw extension (non-package `.ts` file) sources in the `pkg-research` skill, with updated decision model aligned to global/catalog capability manifest.

## Capabilities Implemented

| Capability | Type | Status |
|---|---|---|
| `pkg-security-review` | Modified (clone lifecycle) | ✅ |
| `pkg-install-research` | Modified (source type branch + raw extension flow) | ✅ |
| `pkg-raw-extension-research` | New (Phase 2 raw extension branch) | ✅ |
| `pkg-decision-backlog` | Modified (three-option semantics + backlog schema) | ✅ |

## Files Modified

| File | Change |
|---|---|
| `.pi/skills/pkg-research/SKILL.md` | Phase 1: clone retention; Phase 2: source type detection + raw extension branch; Phase 3: new decision model; Phase 4: trigger clarifications; Constraints updated |
| `openspec/pkg-backlog.md` | Schema header extended with 4 new optional fields (Source Type, Source Repo, Install Method, Has Dependencies) |
| `AGENTS.md` | Package Management section: option semantics, clone lifecycle; Workflow Guidance: backlog row; Enforcement: manifest update rule |

## Verification Checklist

### Regression: Package Source Flow (Steps 1-6)
- [x] Existing Package Source Branch structure preserved under sub-heading
- [x] All 6 steps intact: install, structure analysis, dependency analysis, smoke test, conflict check, summary
- [x] Phase 1 Step 5 no longer cleans up unconditionally; clone retained for Phase 2

### Raw Extension Branch (Steps R1-R4)
- [x] Step R1 - lists extensions from `extensions/*.ts`
- [x] Step R2 - checks `extensions/<name>/package.json` per extension, runs `npm install` if found
- [x] Step R3 - outputs `pi -e` ephemeral test commands with clone path
- [x] Step R4 - waits for user test feedback, handles success/failure/mixed
- [x] Explicit note: Phase 2 raw extension branch does NOT modify `.pi/`

### Decision Model (Phase 3)
- [x] Three-option prompt updated: A (add to repo + sub-decision A1/A2), B (backlog only), C (discard)
- [x] Option A sub-decision: A1 (Global) → `global.*` + Phase 4; A2 (Catalog) → `catalog.*` + no sync
- [x] Option B: pure backlog record; no install, no manifest; packages roll back settings.json
- [x] Option C: optional rejection note; clone cleanup; packages roll back
- [x] Backlog entry format includes all new fields in Phase 3 prompt
- [x] Clone cleanup (`rm -rf "$TMPDIR"`) at end of each option's execution steps

### Backlog Schema (openspec/pkg-backlog.md)
- [x] Schema header updated with 4 new fields: Source Type, Source Repo, Install Method, Has Dependencies
- [x] Backward compatibility note added: new fields are optional, existing entries unchanged
- [x] Decision values expanded: global / catalog / backlog / discarded

### Phase 4 Trigger
- [x] Explicit: Phase 4 runs ONLY after Option A1 (Global)
- [x] Extension sync verification step added (`ls ~/.pi/agent/extensions/<name>.ts`)

### AGENTS.md Governance
- [x] User-driven outcomes updated to reflect new sub-decision model
- [x] Clone lifecycle description updated (retained through Phase 3, not immediate cleanup)
- [x] "Add package to backlog" row updated: pure record, no manifest update
- [x] pkg-research enforcement rule updated: manifest write only during Option A

## Conclusion

All requirements from the four spec files (pkg-security-review, pkg-install-research, pkg-raw-extension-research, pkg-decision-backlog) are implemented. The existing package source flow is fully preserved as a regression-safe sub-branch, while the new raw extension branch and updated decision model are added alongside.

**Verification Result:** ✅ All 22 tasks complete.
