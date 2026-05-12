# Design

## Context

Pi's input pipeline stages:
1. Extension command check (`/xxx`)
2. **`input` event** — `$skill-name` expansion happens here (via `handleInputTransform`)
3. Skill command expansion (`/skill:name` → `<skill>` block)
4. Prompt template expansion
5. Message sent to LLM

The `dollar-skill-invoke` extension (`.pi/extensions/dollar-skill-invoke.ts`) registers an `input` event handler that transforms `$skill-name` tokens. The current `handleInputTransform()` function uses a global regex `/(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/g` which matches ALL unescaped `$skill-name` tokens in the input, expands them all, and consolidates them into a single `<skill>` block with a custom format.

Pi's native `_expandSkillCommand` (used by `/skill:name`) only expands one skill and produces a different `<skill>` block format:
- `location` attribute = actual `SKILL.md` path (not `"."`)
- Includes `References are relative to <baseDir>.` line
- No `[skill:name]` or `Location:` internal markers

Reference: `repo://pi-mono/packages/coding-agent/src/core/agent-session.ts` lines 1147-1173 (`_expandSkillCommand`), `openspec/specs/dollar-skill-invoke/spec.md` (current baseline spec), and `openspec/changes/dollar-skill-invoke-trim/specs/dollar-skill-invoke/spec.md` (this change's spec delta).

## Goals / Non-Goals

**Goals:**
- `$skill-name` expansion only processes the FIRST matching token; subsequent tokens remain literal
- Output `<skill>` block format exactly matches `/skill:name` format (location, References line, no internal markers)
- `$` autocomplete (Tab completion) remains unchanged
- `/` skill filter remains unchanged
- `\$` escape support remains unchanged

**Non-Goals:**
- Modifying any autocomplete behavior
- Changing `/skill:name` behavior
- Changing extension registration / dedup mechanism

## Decisions

### D1: First-only expansion — remove `/g` flag from regex

The simplest change to achieve first-only expansion:

| Before | After |
|--------|-------|
| `const DOLLAR_SKILL_REGEX = /(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/g;` | `const DOLLAR_SKILL_REGEX = /(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/;` |

Without the `g` flag, `String.prototype.replace(regex, callbackFn)` only processes the first match. All subsequent `$skill-name` tokens in the text are left as-is.

**Alternative considered**: Use `text.match(regex)` + manual splice. Rejected because removing `/g` is simpler and more maintainable.

**Cascading effect**: With only one match, the `expanded: ExpandedSkill[]` array will always contain at most one item. This eliminates the need for the consolidation loop (`expanded.map(...).join("\n\n---\n\n")`).

### D2: Output format alignment — match `_expandSkillCommand` exactly

Replace the current `<skill>` block construction:

```typescript
// Current (to be removed):
const skillNames = expanded.map((s) => s.name).join(", ");
const consolidatedContent = expanded
  .map(
    (s) =>
      `[skill:${s.name}]` +
      `\nLocation: ${s.filePath}` +
      `\n\n${s.body}`,
  )
  .join("\n\n---\n\n");
const finalText =
  `<skill name="${skillNames}" location=".">\n` +
  `${consolidatedContent}\n</skill>\n\n` +
  transformed.trimStart();
```

With:

```typescript
// New format (matching /skill:name exactly):
const skill = expanded[0];
const baseDir = path.dirname(skill.filePath);
const skillBlock =
  `<skill name="${skill.name}" location="${skill.filePath}">\n` +
  `References are relative to ${baseDir}.\n\n` +
  `${skill.body}\n</skill>`;
const finalText = `${skillBlock}\n\n${transformed.trimStart()}`;
```

Key alignment points:
| Property | Current | After |
|----------|---------|-------|
| `location` attribute | `"."` | Actual `skill.filePath` (e.g., `/path/.pi/skills/foo/SKILL.md`) |
| `References are relative to` | Missing | Included, with `baseDir = path.dirname(filePath)` |
| `[skill:name]` marker | Included | Removed |
| `Location:` line | Included | Removed |
| Multi-skill consolidation | Comma-separated `name`, `---` separator | Removed (single skill only) |

### D3: Remove consolidated block infrastructure

The `ExpandedSkill` interface can remain (it's still used for the single skill), but the multi-skill consolidation logic (the `consolidatedContent` variable, the `---` separator, the comma-joined `skillNames`) is removed.

### D4: No changes to autocomplete or slash-filter

The autocomplete provider (`createAutocompleteProvider`) and the slash-command filter (`skill:` filter logic) remain untouched. They are registered in the `session_start` handler which is separate from the `input` handler.

### D5: File organization — unchanged (single-file)

The extension remains a single `.ts` file at `.pi/extensions/dollar-skill-invoke.ts`. No new files or dependencies.

## Risks / Migration

- **Risk**: `path.dirname(filePath)` may return `.` if `filePath` is just a filename. **Mitigation**: `filePath` from `pi.getCommands().sourceInfo.path` is always an absolute path, so `dirname` always returns a meaningful directory path.
- **Risk**: Multi-skill consolidation removal could surprise existing users who rely on this behavior. **Mitigation**: This is explicitly a user-requested change; the new behavior is communicated upfront.
- **Risk**: The `DOLLAR_SKILL_REGEX` without `/g` flag will stop at the first match even if it's escaped (`\$foo` doesn't match, but `$bar` after it would — actually the negative lookbehind handles this correctly). **Mitigation**: The regex itself is unchanged; only the `/g` flag is removed. All escape semantics remain identical.
- **Migration**: No migration needed — this is a behavioral change on the same extension file, applied via `/reload` or pi restart.
