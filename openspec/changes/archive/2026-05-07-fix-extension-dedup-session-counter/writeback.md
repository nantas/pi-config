# Writeback

## Change: fix-extension-dedup-session-counter

## Summary

Fixed extension dedup mechanism across 5 extension files in pi-config repository. Changed from boolean flag + `delete` on `session_shutdown` to session counter + session-scoped key, eliminating `/new` handler registration failures caused by timing-dependent flag cleanup.

## Status: COMPLETE

All 4 spec requirements verified passing. Global sync completed.

## Deliverables

### Modified Files (5 extensions)
- `.pi/extensions/dollar-skill-invoke.ts` — session counter pattern
- `.pi/extensions/init-command.ts` — session counter pattern
- `.pi/extensions/browse-session-tree.ts` — session counter pattern
- `.pi/extensions/output-scroll-viewer.ts` — session counter pattern
- `.pi/extensions/planner-toggle.ts` — session counter pattern

### Unchanged Files (confirmed no dedup)
- `.pi/extensions/tool-counter-widget.ts` — no dedup pattern
- `.pi/extensions/subagent-dispatch/index.ts` — no dedup pattern

### Pattern Applied
```typescript
const _key = "__pi_ext_<name>_loaded";
const SESSION_COUNTER = "__pi_ext_session_counter";
const sessionId = (globalThis as any)[SESSION_COUNTER] ?? 0;
const sessionKey = `${_key}_session_${sessionId}`;
if ((globalThis as any)[sessionKey]) return;
(globalThis as any)[sessionKey] = true;
pi.on("session_shutdown", () => {
  (globalThis as any)[SESSION_COUNTER] = ((globalThis as any)[SESSION_COUNTER] ?? 0) + 1;
});
```

## Verification Results

| Requirement | Status |
|-------------|--------|
| cross-path-dedup | PASS |
| cross-session-isolation | PASS |
| /reload-compatibility | PASS |
| no-regression-on-double-path | PASS |

## Global Sync

- Synced via `scripts/sync-pi-agent.sh`
- All global copies at `~/.pi/agent/extensions/` verified
