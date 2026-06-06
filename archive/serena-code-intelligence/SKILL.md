---
name: serena-code-intelligence
description: |
  Use Serena MCP tools for semantic code understanding and safe modification.
  Serena provides LSP-powered navigation (symbols, definitions, references, implementations),
  symbol-level editing (rename, replace, insert), diagnostics, and project memory.
  MUST use Serena instead of grep+read for finding definitions, callers, symbols,
  types, and cross-file refactoring when LSP is available.

  Use when: reading or modifying source code, exploring unfamiliar files,
  finding where a symbol is defined or used, checking impact before editing,
  renaming symbols, verifying code health after changes, or persisting project knowledge.
  Do NOT use for: searching comments/strings/docs (use grep); git operations;
  architectural exploration (use gitnexus_query).
---

# Serena Code Intelligence

## Core Rule

**When Serena tools are available, always prefer them over `grep` + `read` + manual scanning for code understanding and editing tasks.**

Serena provides LSP-backed semantic tools that understand code structure, types, and cross-file relationships. This yields more precise results with fewer tool calls and less token consumption than text-based approaches.

---

## Tool Overview

### Navigation & Exploration (6 tools)

| Tool | Purpose |
|------|---------|
| `serena_get_symbols_overview` | List all symbols (classes, functions, methods, etc.) in a file with kinds and line numbers |
| `serena_find_symbol` | Search for symbols by name path pattern across the codebase; supports substring matching and depth control |
| `serena_find_declaration` | Find the declaration of a symbol from a usage pattern (e.g., `obj.method()` → method definition) |
| `serena_find_referencing_symbols` | Find all symbols that reference a given symbol (callers, importers, implementors) |
| `serena_find_implementations` | Find all concrete implementations of an interface/abstract class |
| `serena_search_for_pattern` | Regex search across project files with context lines; for cases where symbol lookup is insufficient |

### Editing (5 tools)

| Tool | Purpose |
|------|---------|
| `serena_replace_symbol_body` | Replace the entire body of a symbol (function, method, class) — only use if you know the body |
| `serena_replace_content` | Regex-based find-and-replace within a file — primary editing tool for targeted changes |
| `serena_rename_symbol` | Rename a symbol across the entire codebase via LSP |
| `serena_insert_after_symbol` | Insert code after a symbol definition (e.g., add a new method after an existing one) |
| `serena_insert_before_symbol` | Insert code before a symbol definition (e.g., add an import or new class) |

### Diagnostics (1 tool)

| Tool | Purpose |
|------|---------|
| `serena_get_diagnostics_for_file` | Get LSP diagnostics (errors, warnings) for a file, grouped by symbol and severity |

### Memory (5 tools)

| Tool | Purpose |
|------|---------|
| `serena_read_memory` | Read a named memory relevant to the current task |
| `serena_write_memory` | Write project knowledge for future sessions |
| `serena_list_memories` | List available memories, optionally filtered by topic |
| `serena_edit_memory` | Replace content in an existing memory |
| `serena_rename_memory` | Move/rename a memory |

### Project Management (2 tools)

| Tool | Purpose |
|------|---------|
| `serena_onboarding` | One-time project setup — read and follow its instructions before first use |
| `serena_initial_instructions` | Read the Serena Instructions Manual — call once per session if not already loaded |

---

## Decision Table: Serena vs Other Tools

### When to use Serena vs Pi built-in tools

| Task | Use Serena | Use Other Tool |
|------|-----------|----------------|
| "What symbols are in this file?" | `serena_get_symbols_overview` | ❌ `read` full file + manual scan |
| "Where is X defined?" | `serena_find_symbol` / `serena_find_declaration` | ❌ `grep` + `read` + filter |
| "Who calls X?" | `serena_find_referencing_symbols` | ❌ `grep` name + filter imports/comments |
| "What implements this interface?" | `serena_find_implementations` | ❌ `grep` "implements IFoo" |
| "Rename X across the codebase" | `serena_rename_symbol` | ❌ `sed` file-by-file |
| "Replace a few lines in a method" | `serena_replace_content` (regex) | `edit` tool for simple literal swaps |
| "Replace entire method body" | `serena_replace_symbol_body` | `edit` tool if body is short |
| "Add new class/function to file" | `serena_insert_after_symbol` / `serena_insert_before_symbol` | `write` to append |
| "Check for errors after editing" | `serena_get_diagnostics_for_file` | ❌ wait for `npm run lint` |
| "Search comments/strings/docs" | — | `grep` |
| "Read a config/data file" | — | `read` |
| "Explore execution flows/architecture" | — | `gitnexus_query` |
| "Find callers + transitive impact" | `serena_find_referencing_symbols` for direct + `gitnexus_impact` for transitive | — |

### When to use Serena editing tools vs Pi `edit` tool

| Scenario | Use Serena | Use Pi `edit` |
|----------|-----------|---------------|
| Renaming a symbol across files | `serena_rename_symbol` | ❌ |
| Replacing lines matching a pattern | `serena_replace_content` (regex) | `edit` (literal, ≤200 chars) |
| Replacing an entire method body | `serena_replace_symbol_body` | — |
| Simple 1-2 line literal swap | — | `edit` (faster for small literal changes) |
| Bulk `[ ]` → `[x]` checkbox changes | — | `bash` + `sed` |

---

## Project Initialization Workflow

For **first-time** project setup with Serena:

```
Step 1 — Read the Instructions Manual
  serena_initial_instructions()
  → Returns: usage guidelines, editing modes, context description
  → Only needs to be called once per session

Step 2 — Check existing memories
  serena_list_memories()
  → If project-relevant memories exist, read them with serena_read_memory
  → Memories contain architectural decisions, conventions, and patterns

Step 3 — Onboarding (if no memories exist for this project)
  serena_onboarding()
  → Returns: step-by-step instructions for creating initial project knowledge
  → Follow the instructions to build foundational memories

Step 4 — Write memories as you learn
  serena_write_memory(memory_name="topic/name", content="...")
  → Use "/" in names to organize by topic (e.g., "auth/flow", "db/schema")
  → Memories persist across sessions and help future agents
```

---

## Code Exploration Workflow

### Understanding an unfamiliar file

```
Step 1 — Get structural overview
  serena_get_symbols_overview(relative_path="src/services/auth.ts", depth=1)
  → Returns: classes, methods, functions with kinds and line numbers
  → Replaces: read full file + manual scanning

Step 2 — Read specific symbol bodies (only what you need)
  serena_find_symbol(name_path_pattern="AuthService", include_body=true, depth=1)
  → Returns: the class definition + method signatures
  → Read individual method bodies only if needed for the task

Step 3 — Trace callers/usages
  serena_find_referencing_symbols(name_path="AuthService/validateToken", relative_path="src/services/auth.ts")
  → Returns: every call site with file, line, and code snippet
  → Replaces: grep + manual filtering
```

### Finding symbol definitions from usage

```
serena_find_declaration(
  relative_path="src/api.ts",
  regex="authService\.(validateToken)\(token\)"
)
→ Returns: the definition of validateToken with file and line
```

### Finding interface implementations

```
serena_find_implementations(name_path="IAuthProvider", relative_path="src/types.ts")
→ Returns: all classes implementing IAuthProvider
```

---

## Code Editing Workflow

### Principle: Minimal, precise changes

1. **Understand before editing** — use exploration tools to understand the symbol and its callers
2. **Choose the right tool** — see Decision Table above
3. **Edit with surgical precision** — replace only what needs to change
4. **Verify after editing** — run diagnostics on affected files

### Renaming a symbol across the codebase

```
serena_rename_symbol(
  name_path="oldName",
  relative_path="src/path/to/file.ts",
  new_name="newName"
)
→ LSP updates all references across the codebase atomically
→ Safer than find + sed: only renames the actual symbol, not strings/comments
```

### Replacing content within a symbol (primary editing method)

```
# Use regex with wildcards to avoid quoting large blocks
serena_replace_content(
  relative_path="src/services/auth.ts",
  needle="oldLogic.*?endOfOldBlock",
  repl="newLogic();",
  mode="regex"
)

# For simple literal replacements
serena_replace_content(
  relative_path="src/config.ts",
  needle="const MAX_RETRIES = 3",
  repl="const MAX_RETRIES = 5",
  mode="literal"
)
```

**Tips for `replace_content`:**
- Use `mode="regex"` with `.*?` wildcards to match large blocks without quoting them
- The tool validates uniqueness — if the pattern matches multiple locations and `allow_multiple_occurrences=false`, it returns an error so you can refine
- Always try to use wildcards to avoid specifying exact content

### Replacing an entire symbol body

```
# Only use if you have previously retrieved the body with include_body=true
serena_replace_symbol_body(
  name_path="AuthService/validateToken",
  relative_path="src/services/auth.ts",
  body="async validateToken(token: string): Promise<boolean> {\n  ...\n}"
)
```

### Inserting new symbols

```
# Add a new method after an existing one
serena_insert_after_symbol(
  name_path="AuthService/validateToken",
  relative_path="src/services/auth.ts",
  body="\n  async refreshToken(token: string): Promise<string> {\n    ...\n  }"
)

# Add an import or new class before the first symbol
serena_insert_before_symbol(
  name_path="AuthService",
  relative_path="src/services/auth.ts",
  body="import { NewType } from './types';\n\n"
)
```

### Safe deletion (checks for references first)

```
serena_safe_delete_symbol(
  name_path_pattern="deprecatedHelper",
  relative_path="src/utils.ts"
)
→ If references exist, returns them — do NOT delete until references are removed
→ If no references, deletes the symbol safely
```

---

## Diagnostics Workflow

### When to check diagnostics

| Scenario | Action |
|----------|--------|
| After editing code | `serena_get_diagnostics_for_file` on changed files |
| Before claiming task complete | Check all changed files for errors |
| After renaming/refactoring | Check the renamed symbol's file + caller files |
| Investigating a bug | Check the file for existing errors first |

### Usage

```
# Check a single file (errors and warnings)
serena_get_diagnostics_for_file(relative_path="src/services/auth.ts")

# Focus on errors only
serena_get_diagnostics_for_file(relative_path="src/services/auth.ts", min_severity=2)
# Severity: 1=Error, 2=Warning, 3=Info, 4=Hint

# Check specific lines
serena_get_diagnostics_for_file(relative_path="src/services/auth.ts", start_line=40, end_line=60)
```

---

## Memory System

### When to read/write memories

| Action | When |
|--------|------|
| `serena_list_memories` | Session start, to discover available project knowledge |
| `serena_read_memory` | When a memory name seems relevant to the current task |
| `serena_write_memory` | After learning something worth persisting (architecture decisions, patterns, gotchas) |
| `serena_edit_memory` | When existing memory needs updating (not rewriting entirely) |

### Memory naming conventions

- Use `/` to organize: `auth/flow`, `db/schema`, `config/conventions`
- Use `global/` prefix only when explicitly instructed for cross-project memories
- Reference other memories with `mem:` prefix in content

---

## Language Server Configuration

Serena's project configuration is in `.serena/project.yml` (relative to project root):

```yaml
# Example configuration
languages:
  - typescript
  - python

ignored_paths:
  - node_modules
  - dist
  - .git
  - "**/*.generated.ts"

additional_workspace_folders:
  - ../shared-lib
```

### Common adjustments

| Need | Action |
|------|--------|
| Add language support | Add to `languages` list |
| Ignore generated files | Add glob to `ignored_paths` |
| Include external source | Add path to `additional_workspace_folders` |
| Check current config | `serena_initial_instructions()` shows active project and languages |

---

## Anti-Patterns

### ❌ grep + read + manual scan

```
# BAD: 3 tool calls, full file reads, manual filtering
grep(pattern="export function validate")
→ read entire file
→ manually scan for the right function
→ read definition file

# GOOD: 1 precise tool call
serena_find_symbol(name_path_pattern="validate", include_body=true)
```

### ❌ grep for callers + manual filter

```
# BAD: returns imports, comments, strings — must filter manually
grep(pattern="getVideos")
→ 15 matches: 3 imports, 2 comments, 8 actual calls, 2 strings

# GOOD: returns only actual references
serena_find_referencing_symbols(name_path="getVideos", relative_path="src/db.ts")
```

### ❌ File-by-file sed for renames

```
# BAD: 4 separate commands, risk of partial rename or false matches
sed -i '' 's/getVideos/fetchVideos/g' src/db.ts
sed -i '' 's/getVideos/fetchVideos/g' src/api.ts
→ could rename in strings/comments unintentionally

# GOOD: one atomic LSP rename
serena_rename_symbol(name_path="getVideos", relative_path="src/db.ts", new_name="fetchVideos")
```

### ❌ Reading entire files when only structure is needed

```
# BAD: reads 500-line file to find function signatures
read(path="src/services/payment.ts")

# GOOD: structured symbol list
serena_get_symbols_overview(relative_path="src/services/payment.ts", depth=1)
```

---

## Serena vs GitNexus

| Task | Use Serena | Use GitNexus |
|------|-----------|--------------|
| "Where is `validateUser` defined?" | `serena_find_symbol` | — |
| "Who calls `validateUser`?" | `serena_find_referencing_symbols` | — |
| "What breaks if I change `validateUser`?" | Direct refs: Serena | Transitive impact: `gitnexus_impact` |
| "How does auth work end-to-end?" | — | `gitnexus_query` |
| "List all symbols in `auth.ts`" | `serena_get_symbols_overview` | — |
| "What modules use auth?" | — | `gitnexus_query` |
| "Trace full execution flow" | — | `gitnexus_query` |
| "Analyze PR changes" | — | `gitnexus_detect_changes` |

**Rule:** Serena for point queries (definition, callers, symbols, types, edits). GitNexus for flow queries (execution paths, architectural impact, module structure, PR analysis).

---

## Checklist

Before claiming code work is complete, verify:

```
- [ ] Used serena_get_symbols_overview to explore unfamiliar files (not read + scan)
- [ ] Used serena_find_symbol / serena_find_declaration to find definitions (not grep + scan)
- [ ] Used serena_find_referencing_symbols to check callers before modifying shared code
- [ ] Used serena_rename_symbol for cross-file renames (not sed)
- [ ] Used serena_get_diagnostics_for_file on all changed files
- [ ] Diagnostics show 0 new errors on changed and affected files
- [ ] Written relevant memories for knowledge gained during this session
```
