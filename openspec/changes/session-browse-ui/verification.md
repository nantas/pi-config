# Verification

## Change: session-browse-ui
## Schema: orbitos-change-v1

### Verification Approach

Code-level verification via TypeScript compilation and structural review.
Full end-to-end verification requires a running Pi instance with indexed sessions.

### Checklist

#### 4.1 Extension Loading

- [x] `browser.ts` compiles without new type errors
- [x] `resumer.ts` compiles without new type errors
- [x] `index.ts` modified with command/shortcut registrations; no new type errors introduced
- [x] `/sb` command registered with description "Search and browse historical Pi sessions."
- [x] `/sr` command registered with description "List recent sessions and resume a previous conversation."
- [ ] No startup errors when loaded via `pi -e .pi/extensions/session-browse/` (requires runtime)

#### 4.2 Hot Reload

- [x] Global dedup key `__pi_ext_session_browse_loaded` prevents double registration
- [x] `session_shutdown` handler clears the dedup key
- [ ] `/reload` produces no duplicate registration warnings (requires runtime)

#### 4.3 /sb Command End-to-End

- [x] `handleSbInput("")` → shows "Usage: /sb <query>" notification
- [x] `handleSbInput("query")` with no results → shows "No matching entries found"
- [x] `handleSbInput("query")` with results → `ctx.ui.select()` with formatted numbered list
- [x] User selects a result → `showTurnPreview()` calls `buildTurnFromEntryId()` + `formatTurn()`
- [x] Turn displayed via `ctx.ui.editor()` (Esc to close)
- [x] Post-turn options: [r] Read raw entry / [b] Back to results / [q] Quit via `ctx.ui.select()`
- [x] "Read raw entry" → `showRawEntry()` reads JSONL/HTML, formats, displays via `ctx.ui.editor()`
- [x] "Back to results" → returns to search result list
- [x] "Quit" / Escape → exits command
- [x] Auto-index via `ensureIndexed()` on first use
- [x] Results capped at 30 with overflow notification
- [ ] Full flow tested with live Pi session data (requires runtime)

#### 4.4 /sr Command End-to-End

- [x] `handleSrInput("")` → lists recent sessions via `ctx.ui.select()`
- [x] Sessions formatted as `[N] project | timestamp | first_user_message[:60]`
- [x] User selects a session → validates JSONL (rejects HTML)
- [x] Calls `switchSession(sessionPath)` via type assertion (runtime version supports it)
- [x] `handleSrInput("path/to/session.jsonl")` → direct path mode
- [x] Path validation: existsSync check, HTML rejection
- [x] Error handling: try/catch with user-friendly messages
- [x] Empty index → "No sessions indexed yet" notification
- [ ] Full flow tested with live Pi session data (requires runtime)

#### 4.5 Keyboard Shortcuts

- [x] `Cmd+Shift+F` (mapped to `super+shift+f` in pi-tui) registered with `setEditorText("/sb ")`
- [x] `Cmd+Shift+R` (mapped to `super+shift+r` in pi-tui) registered with `setEditorText("/sr")`
- [x] Type assertion used for `KeyId` to bridge installed types vs runtime version gap
- [ ] Shortcuts tested in interactive mode (requires runtime)

### Spec Coverage Matrix

| Spec Requirement | Implementation | Status |
|---|---|---|
| sb-command-registration | `pi.registerCommand("sb", ...)` in index.ts | ✅ |
| sb-search-results | `handleSbInput()` → `search()` → `ctx.ui.select()` | ✅ |
| sb-search-no-query | Empty args check → notify usage | ✅ |
| sb-result-selection | `promptLoop()` → `ctx.ui.select()` | ✅ |
| sb-read-entry-from-expand | `showRawEntry()` via `ctx.ui.editor()` | ✅ |
| sb-back-to-results | Back option in post-turn `ctx.ui.select()` | ✅ |
| sb-keyboard-shortcut | `registerShortcut("Cmd+Shift+F" as any)` | ✅ |
| sb-error-handling | `ensureIndexed()`, try/catch, friendly messages | ✅ |
| sb-index-not-ready | `ensureIndexed()` auto-triggers `updateIndex()` | ✅ |
| sr-command-registration | `pi.registerCommand("sr", ...)` in index.ts | ✅ |
| sr-list-recent-sessions | `handleSrInput()` → `listRecent()` → `ctx.ui.select()` | ✅ |
| sr-no-indexed-sessions | Empty list → friendly notification | ✅ |
| sr-resume-by-selection | `resumeBySelection()` → `ctx.ui.select()` → `switchSession` | ✅ |
| sr-resume-jsonl-only | HTML rejection in `resumeByPath()` | ✅ |
| sr-keyboard-shortcut | `registerShortcut("Cmd+Shift+R" as any)` | ✅ |
| sr-error-handling | try/catch with user-friendly messages | ✅ |

### Files Changed

| File | Action | Lines |
|---|---|---|
| `.pi/extensions/session-browse/browser.ts` | NEW | ~200 |
| `.pi/extensions/session-browse/resumer.ts` | NEW | ~130 |
| `.pi/extensions/session-browse/index.ts` | MODIFIED | +30 (imports + registrations) |

### Known Limitations

1. **Type version gap**: `switchSession()` and `super+shift+f` KeyId are in the Pi runtime (v0.74.0) but not in the installed type declarations (v0.50.9). Type assertions (`as any`, `as unknown as CommandContextWithSwitch`) bridge this gap.
2. **Runtime E2E**: Full end-to-end testing requires a running Pi instance with indexed sessions. Code-level verification confirms all paths are structurally correct.
