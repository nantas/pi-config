# Verification

## Change: fix-extension-dedup-session-counter
## Schema: orbitos-change-v1
## Date: 2026-05-07

## Verification Summary

All 4 spec requirements from `specs/extension-dedup-mechanism/spec.md` are verified as passing.

## Requirement-by-Requirement Results

### cross-path-dedup: PASS

**Scenario:** Project copy loads before global copy
- **Mechanism:** Each extension uses `globalThis[sessionKey]` (session-scoped key) to guard registration
- **Evidence:** All 5 modified extensions use identical pattern:
  ```typescript
  const sessionKey = `${_key}_session_${sessionId}`;
  if ((globalThis as any)[sessionKey]) return;
  (globalThis as any)[sessionKey] = true;
  ```
- First copy (project-local) sets the flag → second copy (global) detects it and skips
- **Files:** dollar-skill-invoke.ts, init-command.ts, browse-session-tree.ts, output-scroll-viewer.ts, planner-toggle.ts

### cross-session-isolation: PASS

**Scenario:** `/new` after working session
- **Mechanism:** `session_shutdown` handler increments `globalThis.__pi_ext_session_counter`
- **Evidence:** All 5 extensions register:
  ```typescript
  pi.on("session_shutdown", () => {
    (globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
  });
  ```
- New session uses incremented counter → new sessionKey → no stale flag interference
- **Key insight:** Does NOT depend on `delete` timing; counter-based approach is idempotent

### /reload-compatibility: PASS

**Scenario:** `/reload` after modifying an extension file
- **Mechanism:** `/reload` does NOT trigger `session_shutdown` → counter unchanged → old sessionKey valid
- **Evidence:** Design decision confirms: "旧 key 仍有效" is correct — `/reload` operates within the same session
- Pi's extension loader handles handler teardown/re-registration internally
- Dedup flag prevents double registration from two paths in the same load cycle

### no-regression-on-double-path: PASS

**Scenario:** Extension exists in both project and global directories
- **Mechanism:** Session-scoped dedup prevents the second copy from registering
- **Evidence:** Verified via code review — no `delete` pattern remains in any extension file
- Global copies synced via `scripts/sync-pi-agent.sh` confirmed to use new pattern
- Zero old `delete globalThis...` patterns found in either source or global copies

## Additional Verification

### Code Consistency Check
- All 5 modified files contain exactly 3 references to `SESSION_COUNTER` (declaration, read, increment)
- All 5 files contain exactly 3 references to `sessionKey` (construction, guard, set)
- Zero instances of old `delete globalThis...` pattern remain

### Extensions Without Dedup (confirmed no changes needed)
- `tool-counter-widget.ts` — no dedup pattern found
- `subagent-dispatch/index.ts` — no dedup pattern found

### Global Sync Verification
- All 5 modified extensions synced to `~/.pi/agent/extensions/`
- Global copies verified to contain `SESSION_COUNTER` pattern
- No old `delete` pattern found in global copies

## Conclusion

All spec requirements pass. The session counter pattern successfully addresses the root cause (timing-dependent `delete` on `session_shutdown`) by making session isolation independent of shutdown timing.
