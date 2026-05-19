---
name: lsp-code-intelligence
description: |
  Use LSP tools (symbols, definition, references, hover, rename, diagnostics)
  for code understanding and safe modification. MUST use instead of grep+read
  for finding definitions, callers, symbols, types, and cross-file refactoring.

  Use when: reading or modifying source code, exploring unfamiliar files,
  finding where a symbol is defined or used, checking impact before editing,
  renaming symbols, or verifying code health after changes.
  Do NOT use for: searching comments, strings, or docs (use grep); git
  operations; architectural exploration (use gitnexus_query).
---

# LSP Code Intelligence

## Core Rule

**When the `lsp` tool is available, always use it instead of `grep` + `read` + manual scanning for code understanding tasks.**

This skill applies to all languages with an active LSP server (Python via pyright, TypeScript/JavaScript via typescript-language-server, and others configured in the project).

---

## Trigger Conditions

### MUST use LSP when:

| Scenario | Trigger |
|----------|---------|
| Exploring an unfamiliar source file | Need to know what symbols exist |
| "Where is X defined?" | Finding a function/class/interface definition |
| "Who calls X?" | Finding all references to a symbol |
| "What type is this?" | Checking a variable/function type signature |
| BEFORE modifying a shared function | Checking callers and impact |
| Renaming a symbol across files | Coordinated multi-file rename |
| AFTER editing code | Verifying no new errors introduced |

### Do NOT use LSP for:

- Searching comments, log strings, or documentation text → use `grep`
- Git operations (blame, log, diff) → use `bash` / `git`
- Architectural exploration (execution flows, module structure) → use `gitnexus_query`
- The diagnostics hook has already auto-run on your edited files → don't re-run `diagnostics`

---

## Workflow: 4 Phases

### Phase 1: Explore — Understand Unfamiliar Code

**Goal:** Build a structural map of a file or symbol without reading the entire file.

```
Step 1 — List symbols in the file
  lsp symbols(file="src/services/auth.ts")
  → Returns: function names, classes, interfaces with line numbers
  → This replaces: read + manual scanning

Step 2 — Jump to a symbol's definition
  lsp definition(file="src/services/auth.ts", query="validateToken")
  → Returns: exact file + line where validateToken is defined
  → This replaces: grep "validateToken" + read + manually filter imports

Step 3 — Trace all usages
  lsp references(file="src/services/auth.ts", query="validateToken")
  → Returns: every call site with file + line
  → This replaces: grep "validateToken" + manually exclude imports/comments

Step 4 (optional) — Check type signature
  lsp hover(file="src/services/auth.ts", query="validateToken")
  → Returns: parameter types, return type, JSDoc if present
  → This replaces: manually tracing type declaration chain
```

**Exit criteria:** You know what the file contains, where key symbols are defined, and who calls them.

---

### Phase 2: Verify — Pre-Modification Safety Check

**Goal:** Before changing a function signature, shared constant, or widely-used class, confirm the blast radius.

```
Step 1 — Find all callers
  lsp references(file="src/lib/db.ts", query="getVideos")
  → Returns: every file and line that calls getVideos

Step 2 — Check current health
  lsp diagnostics(file="src/lib/db.ts")
  → Returns: existing errors in the file (none = clean baseline)
```

**Decision gate:**
- If 0 callers → safe to modify signature freely
- If 1-5 callers → update them manually, then `lsp diagnostics` on each
- If 6+ callers → consider backward-compatible change first; if signature must change, use `lsp rename` or update callers systematically

**Exit criteria:** You know every file affected by the planned change.

---

### Phase 3: Modify — Safe Refactoring

**Goal:** Rename symbols or restructure code without breaking references.

```
lsp rename(
  file="src/lib/db.ts",
  query="getVideos",
  newName="fetchVideos"
)
→ LSP updates all references across the codebase atomically
→ This replaces: find + sed across multiple files
```

**When to use rename vs manual edit:**
| Use `lsp rename` | Edit manually |
|------------------|---------------|
| Renaming a function/method/class/variable | Changing logic inside a function |
| Moving to new name, same semantics | Changing function signature (params, return type) |
| Cross-file rename | Single-file local change |

---

### Phase 4: Diagnose — Post-Edit Verification

**Goal:** Confirm your edits did not introduce errors.

```
# Single file
lsp diagnostics(file="src/lib/db.ts")

# Multiple files (batch)
lsp workspace-diagnostics(files=["src/lib/db.ts", "src/services/auth.ts"])
```

**Important — Hook awareness:**
- The LSP hook may already auto-run diagnostics on `agent_end` or `edit_write` mode
- If you just made edits and the hook just ran, do NOT re-run `diagnostics`
- Only run `diagnostics` explicitly when you need diagnostics on a file you did NOT edit (e.g., checking affected callers from Phase 2)

**Filter by severity:**
```
lsp diagnostics(file="src/lib/db.ts", severity="error")
→ Returns only errors, ignoring warnings/hints
```

---

## Decision Table (Quick Reference)

| Goal | LSP Action | Forbidden |
|------|-----------|-----------|
| Find where a symbol is defined | `definition` | ❌ grep + read + manual scan |
| Find all callers/usages | `references` | ❌ grep name + manually filter imports/comments |
| List symbols in a file | `symbols` | ❌ read full file + manual scan |
| Check variable/function type | `hover` | ❌ trace type declaration chain manually |
| Pre-modification impact check | `references` + `diagnostics` | ❌ guess from memory / grep |
| Cross-file rename | `rename` | ❌ sed file-by-file |
| Post-edit error check | `diagnostics` / `workspace-diagnostics` | ❌ wait for `npm run lint` |

---

## Anti-Patterns

### ❌ Anti-Pattern 1: grep + read + 人眼扫描

```
# BAD: 3 tool calls, 2 full file reads, manual filtering
grep(pattern="export function validate")
→ reads entire file
→ manually scan for the right validate function
→ reads definition file
→ manually scan for implementation

# GOOD: 1 tool call, exact result
lsp definition(file="src/auth.ts", query="validate")
```

### ❌ Anti-Pattern 2: grep 搜函数名 + 人工筛

```
# BAD: returns imports, comments, string literals — agent must filter
grep(pattern="getVideos")
→ 15 matches: 3 imports, 2 comments, 8 actual calls, 2 string mentions

# GOOD: returns only actual call sites
lsp references(file="src/db.ts", query="getVideos")
```

### ❌ Anti-Pattern 3: read 全文 + 人眼扫描

```
# BAD: reads 500-line file to understand structure
read(path="src/services/payment.ts")
→ reads entire file, agent scans for function/class declarations

# GOOD: structured symbol list with line numbers
lsp symbols(file="src/services/payment.ts")
→ returns: PaymentService (class, L45), processPayment (method, L72), ...
```

### ❌ Anti-Pattern 4: 逐文件 sed

```
# BAD: 4 separate sed commands, risk of partial rename
sed -i '' 's/getVideos/fetchVideos/g' src/db.ts
sed -i '' 's/getVideos/fetchVideos/g' src/api.ts
sed -i '' 's/getVideos/fetchVideos/g' src/components.ts
→ risky: could rename unrelated getVideos in strings/comments

# GOOD: one atomic rename across all files
lsp rename(file="src/db.ts", query="getVideos", newName="fetchVideos")
```

### ❌ Anti-Pattern 5: 等 lint

```
# BAD: edit file, then run npm lint (slow, scans entire project)
npm run lint
→ runs on all files, slow

# GOOD: instant diagnostics on just the changed files
lsp diagnostics(file="src/db.ts")
```

---

## Tool Integration

### LSP vs GitNexus

| Task | Use | Reason |
|------|-----|--------|
| "Where is `validateUser` defined?" | `lsp definition` | Exact symbol lookup |
| "Who calls `validateUser`?" | `lsp references` | Precise caller list |
| "How does auth work end-to-end?" | `gitnexus_query` | Execution flow tracing |
| "What breaks if I change `validateUser`?" | `lsp references` + `gitnexus_impact` | LSP for direct callers, GitNexus for transitive impact |
| "List all symbols in `auth.ts`" | `lsp symbols` | Structural outline |
| "What modules use auth?" | `gitnexus_query` | Module-level dependency |

**Rule:** LSP for point queries (definition, callers, symbols, types). GitNexus for flow queries (execution paths, architectural impact, module structure).

### LSP vs Subagents

- LSP calls are **lightweight** — do NOT delegate to subagents
- Single `lsp definition` / `references` / `symbols` / `diagnostics` are always direct calls
- Only delegate when you need 3+ LSP calls combined with grep/read/bash in a multi-step investigation

---

## Hook Awareness

The LSP extension has a diagnostics hook that auto-runs after agent responses:

| Hook Mode | Behavior |
|-----------|----------|
| `agent_end` (default) | Diagnostics run after every agent response on edited files |
| `edit_write` | Diagnostics run after every `edit`/`write` tool call |
| `disabled` | No auto-diagnostics |

**Rules to avoid redundant work:**
1. When you just edited files, the hook will auto-run diagnostics — do NOT manually call `lsp diagnostics` on those same files
2. Use `lsp diagnostics` only for files you did NOT edit (e.g., checking affected callers from Phase 2)
3. Use `lsp workspace-diagnostics` for batch checks on non-edited files you want to verify

---

## Environment Check

Ensure LSP servers are available (one-time setup):

```bash
which pyright-langserver && echo "Python LSP OK"
which typescript-language-server && echo "TypeScript LSP OK"
```

---

## Checklist

Before claiming code work is complete, verify:

```
- [ ] Used lsp symbols to explore unfamiliar files (not read + scan)
- [ ] Used lsp definition to find symbol locations (not grep + scan)
- [ ] Used lsp references to check callers before modifying shared code
- [ ] Used lsp rename for cross-file renames (not sed)
- [ ] Did NOT manually call diagnostics on files the hook already checked
- [ ] Used lsp diagnostics on affected caller files (if not auto-checked by hook)
- [ ] LSP diagnostics show 0 new errors on all changed and affected files
```
