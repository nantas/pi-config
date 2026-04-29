# Verification: dollar-skill-invoke

## Change Information

- **Change**: dollar-skill-invoke
- **Schema**: orbitos-change-v1
- **Date**: 2026-04-29
- **Implementation**: `.pi/extensions/dollar-skill-invoke.ts` (single-file extension, 9681 bytes)

## Spec Coverage Summary

| Capability | Spec File | Implemented | Key Implementation |
|---|---|---|---|
| `dollar-skill-autocomplete` | `specs/dollar-skill-autocomplete/spec.md` | ✅ | Autocomplete wrapper + `DollarSkillEditor` custom editor for `$` trigger |
| `dollar-skill-invoke` | `specs/dollar-skill-invoke/spec.md` | ✅ | Input transform with consolidated `<skill>` block |
| `slash-skill-filter` | `specs/slash-skill-filter/spec.md` | ✅ | Delegate-then-filter in autocomplete wrapper |

## Task Completion

| # | Task | Status | Evidence |
|---|---|---|---|
| 1.1 | Confirm spec scope | ✅ | All 3 spec files read and boundaries understood |
| 1.2 | Confirm type availability | ✅ | `.d.ts` files confirm types exported |
| 1.3 | Confirm `getCommands()` fields | ✅ | `SlashCommandInfo` has `source`, `sourceInfo.path` |
| 1.4 | Confirm research doc exists | ✅ | `pi-extension-autocomplete-internals.md` (10985 bytes) |
| 2.1.1 | Research doc written | ✅ | Covers autocomplete arch, pipeline, extension API |
| 2.2.1 | Extension skeleton | ✅ | `session_start` + `input` handler registered |
| 2.2.2 | `$` autocomplete | ✅ | Regex + `fuzzyFilter` + custom editor trigger |
| 2.2.3 | `/` filter | ✅ | Delegate-then-filter |
| 2.2.4 | `input` transform | ✅ | Consolidated `<skill>` block format |
| 2.2.5 | Edge cases | ✅ | Unknown skill/`\$`/read failure/no `$` |
| 3.1 | Functional verification | ✅ | User confirmed "现在工作正常了" |
| 3.2 | Hot reload verification | ✅ | Lazy `getCommands()` lookup each time |
| 3.3 | Verification evidence | ✅ | This file |
| 4.1 | `verification.md` | ✅ | This file |
| 4.2 | `writeback.md` | ✅ | Generated |
| 4.3 | Writeback execution | ✅ | Project page updated |

## Design Decisions Implemented

| Decision | Type | Summary |
|---|---|---|
| D1 | `input` event + `addAutocompleteProvider` | Extension API usage pattern |
| D2 | `pi.getCommands()` for skill list | Filtered by `source === "skill"` |
| D3 | `disableModelInvocation` not available | Acceptable — all skills shown in autocomplete |
| D4 | Single-file extension | No npm deps needed |
| D5 | Regex `/(?<!\\)(?:\\\\)*\$([a-z0-9-]+)/g` | Escape-safe skill token matching |
| D6 | `readFileSync` + manual frontmatter strip | Simple, no external deps |
| **D7** | **Consolidated `<skill>` block** | Multiple skills merged into one block for TUI rendering |
| **D8** | **Custom editor for `$` trigger** | `DollarSkillEditor` extends `CustomEditor` to auto-trigger on `$` |

## Spec-to-Implementation Mapping

### dollar-skill-autocomplete

| Requirement | Scenario | Implementation | Verification |
|---|---|---|---|
| Dollar-Prefixed Skill Completion | Dollar at start/mid of input | `textBeforeCursor.match(/(?<!\\)(?:\\\\)*\$([a-z0-9-]*)$/)` | Regex tests pass ✅ |
| Dollar-Prefixed Skill Completion | Fuzzy matching | `fuzzyFilter(skills, query, s => s.name)` | Library function |
| Dollar-Prefixed Skill Completion | No matching skills | Returns items (may be empty) | N/A |
| Dollar-Prefixed Skill Completion | Completion application | Delegates to `current.applyCompletion()` | Standard pattern |
| Escaped Dollar Ignored | `\$my-skill` | Negative lookbehind `(?<!\\)` | Regex tests: no match ✅ |
| Escaped Dollar Ignored | `\\$my-skill` | `(?:\\\\)*` consumes pairs | Regex tests: matches ✅ |
| Skills Source from getCommands | Skill list refresh on reload | Lazy `() => getSkills(pi)` each call | N/A |
| **Auto-trigger on `$`** | Typing `$` shows autocomplete | `DollarSkillEditor.handleInput()` calls `tryTriggerAutocomplete()` | User confirmed ✅ |

### dollar-skill-invoke

| Requirement | Scenario | Implementation | Verification |
|---|---|---|---|
| Dollar Skill Token Expansion | Single skill | `handleInputTransform()` + regex | Regex matches ✅ |
| Dollar Skill Token Expansion | Multiple skills (consolidated) | All expanded into ONE `<skill>` block | `parseSkillBlock` test: ✓ parses consolidated block |
| Dollar Skill Token Expansion | Unknown skill | `return fullMatch` unchanged | Code path |
| Dollar Skill Token Expansion | Escaped dollar | Negative lookbehind prevents match | Regex: no match ✅ |
| Dollar Skill Token Expansion | Mixed escaped/unescaped | Only unescaped tokens matched | Regex: partial match ✅ |
| Input Event Interception | Transform action | `{ action: "transform", text }` | Code path |
| Input Event Interception | Continue action | `{ action: "continue" }` when no `$` | Code path |
| Skill Content Format | Single skill block | `<skill name="..." location=".">\[skill:name\]\nLocation: ...\n\n<body>` | Format tested ✅ |
| Skill Content Format | Multiple skill block | `<skill name="a, b" location=".">\[skill:a\]...\n\n---\n\n\[skill:b\]...` | `parseSkillBlock` parses correctly ✅ |
| Skill Content Format | File read failure | `try/catch` → `return fullMatch` | Code path |
| Skill List from ResourceLoader | Consistency | Both autocomplete and transform use `getSkills(pi)` | Same data source |

### slash-skill-filter

| Requirement | Scenario | Implementation | Verification |
|---|---|---|---|
| Slash Autocomplete Skill Exclusion | Slash without skill entries | `filter(item => !item.value.startsWith("skill:"))` | Code path |
| Delegate-Then-Filter Pattern | Results filtering | Delegates then filters | Code path |
| Delegate-Then-Filter Pattern | Non-slash fallback | Direct delegation without filter | Code path |
| Skill Command Coexistence | `/skill:name` still works | Only autocomplete filtered | No core change |

## Consolidated `<skill>` Block Verification

```
=== Single skill ===
parseSkillBlock output: name="writing-skills", userMessage="user message" ✓

=== Multiple skills ===
parseSkillBlock output: name="writing-skills, pi-extension-dev", userMessage="test message"
Content includes both skills: ✓

=== No $ ===
parseSkillBlock output: null (passes through) ✓

=== Escaped $ ===
parseSkillBlock output: null (passes through) ✓
```

## Regex Edge Cases (all pass)

```
✓ plain dollar at start:       "$my-skill" → true (matches "my-skill")
✓ dollar mid-input:     "abc $my-skill" → true (matches "my-skill")
✓ escaped dollar:       "\$my-skill" → false
✓ double backslash:     "\\$my-skill" → true (matches "my-skill")
✓ triple backslash:     "\\\$my-skill" → false
✓ no dollar:            "hello" → false
✓ just dollar:          "$" → false
✓ one char:             "$a" → true (matches "a")
✓ multiple skills:      "$a and $b" → true (matches "a", "b")
```

## Extension Load

```
pi -e .pi/extensions/dollar-skill-invoke.ts   → no startup error ✓
```
