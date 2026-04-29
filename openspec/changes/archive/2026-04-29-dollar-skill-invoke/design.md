# Design

## Context

Pi's TUI input pipeline consists of three stages before user text reaches the LLM:
1. **Extension command check** — if text starts with `/`, try to execute as extension command
2. **`input` event** — extensions can intercept and transform text
3. **Skill command expansion** — `/skill:name` is replaced with `<skill>` block content

This extension inserts itself at stage 2 (`input` event) to transform `$skill-name` tokens, and at the autocomplete layer (`addAutocompleteProvider`) to filter `/` results and provide `$` completions.

Key source files studied during research:
- `repo://pi-mono/packages/tui/src/autocomplete.ts` — `CombinedAutocompleteProvider`, `AutocompleteProvider`, `SlashCommand` types
- `repo://pi-mono/packages/coding-agent/src/core/agent-session.ts` — `prompt()`, `_expandSkillCommand()`, `input` event emission order
- `repo://pi-mono/packages/coding-agent/src/core/skills.ts` — skill loading and `Skill` type
- `repo://pi-mono/packages/coding-agent/src/core/extensions/runner.ts` — `emitInput()` chain
- `repo://pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts` — `createBaseAutocompleteProvider()`, `addAutocompleteProvider` binding

Detailed technical notes recorded in `docs/reference/pi-extension-autocomplete-internals.md`.

## Goals / Non-Goals

**Goals:**
- `$skill-name` autocomplete via `addAutocompleteProvider` wrapper
- `$skill-name` expansion via `input` event transform
- `/` autocomplete excludes skill entries (filter `skill:xxx`)
- `\$` literal escape support
- Multiple `$skill-name` in a single input all expanded
- `disableModelInvocation` skills included in autocomplete

**Non-Goals:**
- Modifying pi-mono source code
- Adding `$` support for builtin/extension/template commands
- Changing `/skill:name` behavior
- Grid/list UI for autocomplete (reuse built-in `AutocompleteItem` format)

## Decisions

### D1: Extension API usage — `input` event + `addAutocompleteProvider`

Extracted trade-off grid:

| Mechanism | What it does | Why selected |
|-----------|-------------|--------------|
| `pi.on("input", handler)` | Intercept user submission, transform text | Only hook available between user Submit and LLM pipeline; fires BEFORE `_expandSkillCommand` |
| `ctx.ui.addAutocompleteProvider(factory)` | Wrap existing autocomplete with custom logic | Only extension API for autocomplete customization; well-documented pattern (see `github-issue-autocomplete.ts`) |

### D2: Skill list source — `pi.getCommands()`

Extracted trade-off grid:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Direct `resourceLoader.getSkills()` | Direct access to `Skill[]` with `filePath` | Not exposed via ExtensionAPI (`resourceLoader` is internal to `AgentSession`) | ❌ Not available |
| `pi.getCommands()` | Exposed in ExtensionAPI; returns `SlashCommandInfo[]` with `source` field and `sourceInfo.path` | `name` is `skill:name` format (needs slicing); `description` is available | ✅ Selected |

Skills are obtained via:
```typescript
const skills = pi.getCommands()
  .filter(c => c.source === "skill")
  .map(c => ({
    name: c.name.slice(6),           // strip "skill:" prefix
    description: c.description,
    filePath: c.sourceInfo.path,      // SKILL.md path for reading content
    disableModelInvocation: ...       // not available via getCommands — see D3
  }));
```

### D3: disableModelInvocation not in SlashCommandInfo

`SlashCommandInfo` does not include `disableModelInvocation` flag. The `pi.getCommands()` source in `agent-session.ts:_bindExtensionCore` only maps `name`, `description`, `source`, `sourceInfo`.

**Impact**: Autocomplete cannot distinguish between normal skills and `disableModelInvocation` skills via `getCommands()` alone. However, since the requirement is to include these skills in autocomplete anyway (需求 #5), this is acceptable — all skills appear regardless of `disableModelInvocation` status.

### D4: File organization — single-file extension

Extracted trade-off grid:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Subdirectory with `package.json` | Supports external npm deps | Overkill; no external deps needed | ❌ |
| Single `.ts` file | Simple, auto-discovered, hot-reloadable | Cannot add npm deps | ✅ |

No npm dependencies beyond `@mariozechner/pi-coding-agent` and `@mariozechner/pi-tui` (both already bundled).

### D5: Escaped dollar regex

```
/(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/g
```

This regex matches `$` preceded by zero or an even number of backslashes, and preceded by no single backslash. The odd number of backslashes before `$` indicates the `$` is escaped.

Regex decomposition:
- `(?<!\\)` — negative lookbehind: preceding char is NOT a single `\`
- `(?:\\\\)*` — zero or more pairs of `\\` (escaped backslashes)
- `\$` — literal `$`
- `([a-z0-9-]+)` — capture group for skill name

### D6: Skill content reading

Skill content is read from `SKILL.md` using `readFileSync` (synchronous, simple). The YAML frontmatter is stripped using the same `parseFrontmatter` / manual YAML delimiter approach.

### D7: Consolidated `<skill>` block for multiple skills

Extracted trade-off grid:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Multiple separate `<skill>` blocks | Simple per-skill logic | TUI `parseSkillBlock()` only parses the FIRST block; subsequent blocks render as raw text | ❌ Causes raw text in TUI |
| Single consolidated `<skill>` block | One block parsed by TUI; all skills visible in one `[skill]` component; LLM sees all content | Name field becomes comma-separated list; content uses `[skill:name]` prefix internally | ✅ Selected |

Implementation:
```typescript
const skillNames = expanded.map(s => s.name).join(", ");
const consolidatedContent = expanded
  .map(s => `[skill:${s.name}]\nLocation: ${s.filePath}\n\n${s.body}`)
  .join("\n\n---\n\n");
const finalText =
  `<skill name="${skillNames}" location=".">\n` +
  `${consolidatedContent}\n</skill>\n\n` +
  transformed.trimStart();
```

### D8: Custom editor for `$` autocomplete trigger

The built-in TUI editor's `insertCharacter()` method only auto-triggers autocomplete for `/`, `@`, and `#`. It does NOT trigger for `$`. To make `$` autocomplete appear without requiring Tab, we replace the editor with a custom subclass.

**Mechanism**: `DollarSkillEditor extends CustomEditor` overrides `handleInput()` to call the private `tryTriggerAutocomplete()` after inserting `$` at a token boundary.

**Registration**: `ctx.ui.setEditorComponent()` is called AFTER `ctx.ui.addAutocompleteProvider()`, so the full autocomplete chain is built first and then copied onto the new editor by the interactive mode framework.

## Risks / Migration

- **Risk**: `pi.getCommands()` returns `sourceInfo.path` which may be undefined. **Mitigation**: Guard with existence check; skip skill expansion if `filePath` is not available.
- **Risk**: `SlashCommandInfo.sourceInfo` structure is internal and may change in future Pi versions. **Mitigation**: This extension targets the current Pi version; if the API changes, the extension will need updates — same risk as any Pi extension.
- **Risk**: Skill file may be deleted or unreadable between autocomplete and submit. **Mitigation**: `readFileSync` wrapped in try/catch; if read fails, token is left unchanged.
- **Migration**: None — this is a new extension, no existing users or configurations to migrate.
