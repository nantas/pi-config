# Specification: dollar-skill-invoke

## Purpose

Defines the behavior for expanding `$skill-name` tokens into `<skill>` blocks via `context` event message injection. The system intercepts the `context` event (fired before each LLM call) to inject skill content as independent `CustomMessage` entries appended after the user message, preserving the original user prompt text intact.
## Requirements
### Requirement: Dollar Skill Token Expansion
The system SHALL expand all unique unescaped known `$skill-name` tokens in a user message without duplicating any skill. The first known skill in interactive user input SHALL be expanded natively by Pi via `/skill:<name>` rewrite in the `input` event; any remaining distinct known `$skill-name` tokens (and all unique known `$skill-name` tokens for messages that bypassed `input` rewriting) SHALL be expanded in the `context` event as independent `CustomMessage` entries in order of first appearance.

When a user message begins with an already-expanded `<skill>` block recognized by `parseSkillBlock()`, the `context` event SHALL extract its skill name into the already-expanded set and SHALL scan only `skillBlock.userMessage` (never the `<skill>...</skill>` body itself).

#### Scenario: Single skill expansion
- **WHEN** the user submits `$my-skill explain this`
- **THEN** the `input` handler SHALL rewrite it to `/skill:my-skill explain this`, Pi SHALL expand `<skill name="my-skill" ...>` into the persisted user message, and the `context` handler SHALL return `undefined` without injecting a duplicate `CustomMessage`

#### Scenario: Multiple skill expansion
- **WHEN** the user submits `$skill-a and $skill-b`
- **THEN** the `input` handler SHALL rewrite it to `/skill:skill-a $skill-a and $skill-b` (expanding `skill-a` natively), and the `context` handler SHALL skip `skill-a` and inject one `CustomMessage` for `skill-b` immediately after the user message

#### Scenario: Duplicate same skill in one message
- **WHEN** the user submits `用 $skill-a 和再次 $skill-a` or `用 $skill-a、$skill-b 和 $skill-b`
- **THEN** each distinct known skill SHALL be expanded at most once (`skill-a` natively once, `skill-b` via `context` once)

#### Scenario: Skill body containing dollar tokens does not cascade
- **WHEN** an expanded `<skill name="skill-a">` body mentions `$skill-b`, while the user's own prompt does not contain `$skill-b`
- **THEN** the `context` handler SHALL scan only `skillBlock.userMessage` and SHALL NOT inject `skill-b`

#### Scenario: Unknown skill
- **WHEN** the user submits `$nonexistent-skill do something`
- **THEN** the token `$nonexistent-skill` SHALL be left unchanged in the user message, and no skill expansion or injection SHALL occur for this token

#### Scenario: Escaped dollar
- **WHEN** the user submits `\$my-skill is a variable`
- **THEN** the `\$` SHALL be treated as an escaped literal `$`, and no skill rewrite or injection SHALL occur

#### Scenario: Mixed escaped and unescaped
- **WHEN** the user submits `\$my-skill and $other-skill`
- **THEN** `\$my-skill` SHALL remain as literal text while `$other-skill` SHALL be rewritten to `/skill:other-skill \$my-skill and $other-skill` and expanded natively

### Requirement: Context Event Message Injection
The system SHALL use the `context` event to inject each remaining distinct matched `$skill-name` token (not already expanded in the user message's `<skill>` block) as one `CustomMessage` with `customType: "skill"`, `display: false`, and content containing the `<skill>` block. Injected messages SHALL be inserted immediately after the last user message in the `AgentMessage[]` array. When no additional skills need injection, the `context` handler SHALL return `undefined` so Pi preserves prompt cache prefixes without unnecessary context rewrites.

#### Scenario: Single skill injection
- **WHEN** a user message was not rewritten by `input` (e.g., expanded from a `/prompt-template` or sent with `source: "extension"`) and contains `$my-skill explain this`
- **THEN** the `context` handler SHALL parse `$my-skill` from the user message, read its `SKILL.md`, and insert one `CustomMessage` with `customType: "skill"` and content `<skill name="my-skill" location="...">...body...</skill>` immediately after the user message

#### Scenario: Single natively-expanded skill performs no context rewrite
- **WHEN** the last user message already contains `<skill name="my-skill" ...>...</skill>\n\nexplain this` and `userMessage` has no other known `$skill` tokens
- **THEN** the `context` handler SHALL return `undefined`

#### Scenario: Multiple skill injection
- **WHEN** the last user message contains `<skill name="skill-a" ...>...</skill>\n\n$skill-a, $skill-b, and $skill-c`
- **THEN** the `context` handler SHALL insert two `CustomMessage` entries (`skill-b` then `skill-c`) immediately after the user message

#### Scenario: Original prompt preserved
- **WHEN** a user submits a mid-sentence skill reference (`use $skill-a for X`) or a multi-skill prompt (`$skill-a and $skill-b`)
- **THEN** the original prompt text (including the `$skill` tokens) SHALL remain intact in `userMessage` after `/skill:<first>` expansion, while secondary skills are appended as `CustomMessage` entries

### Requirement: Repeat Injection Prevention
The system SHALL prevent injecting duplicate skill messages for the same user message across multiple `context` event firings within the same turn. After injection, subsequent `context` calls for the same turn SHALL NOT re-inject skill messages.

#### Scenario: Same turn re-injection prevented
- **WHEN** the `context` event fires after tool calls within the same turn, and skill messages were already injected in the first `context` call
- **THEN** the system SHALL detect that the user message is already followed by `CustomMessage` entries with `customType: "skill"` and SHALL skip injection

#### Scenario: New turn triggers fresh injection
- **WHEN** a new user message is submitted and the `context` event fires
- **THEN** the system SHALL detect that the new user message is the last user message and is NOT followed by skill messages, and SHALL perform injection

### Requirement: Skill Content Format
The system SHALL read the skill's `SKILL.md` file, strip the YAML frontmatter, and wrap the remaining body in a `<skill>` block whose format **exactly matches** the output of `_expandSkillCommand` used by `/skill:name`. The resulting block SHALL be set as the `content` field of a `CustomMessage` with `customType: "skill"` and `display: false`. Each skill SHALL produce one `CustomMessage`.

#### Scenario: Single skill block format
- **WHEN** a single skill `foo` at `/path/.pi/skills/foo/SKILL.md` is expanded
- **THEN** the injected `CustomMessage` SHALL have `customType: "skill"`, `display: false`, and content:
```
<skill name="foo" location="/path/.pi/skills/foo/SKILL.md">
References are relative to /path/.pi/skills/foo.

<body>
</skill>
```
- `baseDir` SHALL be computed as `path.dirname(filePath)` (the directory containing SKILL.md), matching how `_expandSkillCommand` derives it

#### Scenario: File read failure
- **WHEN** reading `SKILL.md` for a matched skill fails (e.g., file deleted)
- **THEN** the `$skill-name` token SHALL be left unchanged in the user message, and no `CustomMessage` SHALL be injected for this token

### Requirement: Skill Discovery with Stale Runtime Defense
The system SHALL discover skills via `pi.getCommands()` as the primary source, caching every non-empty command snapshot as `_lastKnownCommandSkills`, with an independent filesystem skill index (`_fileSystemSkillIndex`) as secondary fallback. When `pi.getCommands()` throws or returns empty, the system SHALL fall back to `_lastKnownCommandSkills` (if non-empty) or `_fileSystemSkillIndex`, triggering an on-demand filesystem scan if `_fileSystemSkillIndex` is `null`.

#### Scenario: Primary source works normally
- **WHEN** `pi.getCommands()` returns a non-empty skill list
- **THEN** the system SHALL update `_lastKnownCommandSkills` and return the `pi.getCommands()` skill list

#### Scenario: Primary source returns empty
- **WHEN** `pi.getCommands()` returns an empty skill list (e.g., due to race condition during ResourceLoader initialization)
- **THEN** the system SHALL fall back to `_lastKnownCommandSkills` if non-empty, or to the filesystem skill index (scanning on-demand if not yet built)

#### Scenario: Primary source throws error (stale runtime)
- **WHEN** `pi.getCommands()` throws an error (e.g., `ExtensionRuntime` stale after `/new` session replacement)
- **THEN** the system SHALL catch the error silently and fall back to `_lastKnownCommandSkills` or `_fileSystemSkillIndex` without propagating the exception

#### Scenario: Skill not found in primary source but exists on filesystem
- **WHEN** a `$skill-name` token matches via regex but `find()` against the primary skill list returns undefined
- **THEN** the system SHALL attempt a secondary `find()` against `_fileSystemSkillIndex` before declaring the skill unknown

#### Scenario: Filesystem index not yet built
- **WHEN** `_fileSystemSkillIndex` is `null`, `_lastKnownCommandSkills` is empty, and `pi.getCommands()` returns empty or throws
- **THEN** the system SHALL trigger an on-demand filesystem scan using the recorded `cwd` (or `process.cwd()`) to populate `_fileSystemSkillIndex` and use the result

#### Scenario: Both primary and filesystem sources fail
- **WHEN** `pi.getCommands()` throws AND neither `_lastKnownCommandSkills` nor `_fileSystemSkillIndex` has entries
- **THEN** `getSkills()` SHALL return an empty array without throwing (graceful degradation)

### Requirement: Filesystem Skill Index Build on Session Start
The system SHALL build the independent filesystem skill index during `session_start` (and on-demand if still `null` when needed). The index SHALL scan:
- `{cwd}/.agents/skills/`
- `{cwd}/.pi/skills/`
- `{homedir}/.agents/skills/`
- `{homedir}/.pi/agent/skills/`
- Package skill directories declared by Pi packages configured in `{cwd}/.pi/settings.json` and `{homedir}/.pi/agent/settings.json` (git, npm, and local path packages, reading `pi.skills` from `package.json` or falling back to `<package-root>/skills/`).

Skill names SHALL be extracted using Pi's `parseFrontmatter()` YAML parser (supporting arbitrary key order, quotes, BOM, and CRLF), falling back to the parent directory name when `name` is absent or invalid. All filesystem errors SHALL be caught and ignored without blocking execution.

#### Scenario: Index built successfully
- **WHEN** `session_start` fires with a valid `cwd`
- **THEN** `_fileSystemSkillIndex` SHALL be populated with all discovered standard and package skills before the first `input`/`context` event fires for that session

#### Scenario: Index build fails
- **WHEN** directory scanning encounters an error (e.g., permission denied)
- **THEN** the error SHALL be silently caught without throwing or inhibiting the primary `pi.getCommands()` path

#### Scenario: Package skills discovered in filesystem index
- **WHEN** `buildFileSystemSkillIndex(cwd)` runs with git or npm Pi packages configured in settings
- **THEN** skills declared under those packages' `pi.skills` (or `skills/`) directories SHALL be included in `_fileSystemSkillIndex`

#### Scenario: Frontmatter with non-first-line name or CRLF parsed accurately
- **WHEN** a `SKILL.md` file has YAML frontmatter where `description:` precedes `name:`, uses quoted values, or uses CRLF line endings
- **THEN** `parseFrontmatter()` SHALL extract the exact `name` string without falling back to the directory name

### Requirement: Improved Dedup Scanning
The system SHALL prevent duplicate skill injection by scanning up to 5 messages after the user message (instead of only 1). If ANY of these messages has `role: "custom"` and `customType: "skill"`, injection SHALL be skipped. The scan SHALL stop at the first `role: "assistant"` or `role: "toolResult"` message encountered.

#### Scenario: Skill message shifted by before_agent_start
- **WHEN** a `before_agent_start` handler injects a custom message between the user message and the skill injection messages
- **THEN** the dedup scan SHALL still find the skill injection message within the 5-message window and skip re-injection

#### Scenario: Normal dedup within same turn
- **WHEN** skill messages are injected at position `lastUserIdx + 1` (immediately after user message) in the first `context` call
- **THEN** subsequent `context` calls in the same turn SHALL detect the skill message at `lastUserIdx + 1` and skip injection

### Requirement: Context Handler Single Registration
The system SHALL register the `context` event handler **once** at extension load time (top level of the `export default function`), NOT inside `session_start` or any per-session lifecycle handler.

#### Scenario: No handler accumulation across sessions
- **WHEN** the user creates a new session (`/new`) or the session is replaced
- **THEN** only ONE `context` event handler SHALL be active for this extension (not accumulated copies from previous sessions)

#### Scenario: Handler works across sessions
- **WHEN** the `context` event fires in any session
- **THEN** the single `context` handler SHALL process the message array and inject skill messages if applicable

### Requirement: First Dollar Skill Native Rewrite via Input Event
The system SHALL intercept user input in the `input` event (registered once at extension load time) and rewrite the first unescaped known `$skill-name` token into Pi's native `/skill:<name>` command so that Pi's `_expandSkillCommand` performs expansion, session persistence, and collapsible TUI rendering identically to `/skill:<name>`.

The `input` handler SHALL skip rewriting (returning `{ action: "continue" }`) when:
- `event.source === "extension"`
- `event.text.trimStart().startsWith("/")` (preserving existing `/skill:`, `/prompt-template`, and slash commands)
- No unescaped known `$skill-name` token is present in `event.text`

When rewriting:
- If the input contains exactly one known `$skill-name` occurrence AND it appears at the start of the input followed by whitespace or end-of-string (`^\s*\$<name>(?=$|\s)`), the system SHALL strip the leading `$<name>` token and its immediately following whitespace, producing `/skill:<name>` (when no trailing text remains) or `/skill:<name> <remaining-text>`.
- Otherwise (when the first known skill appears mid-sentence, is immediately followed by non-whitespace punctuation, or when the input contains multiple known skill occurrences), the system SHALL preserve the original input text intact as the arguments: `/skill:<name> <original-text>`.

#### Scenario: Leading single skill with arguments
- **WHEN** the user submits `$notion 帮我读这个页面`
- **THEN** the `input` handler SHALL return `{ action: "transform", text: "/skill:notion 帮我读这个页面" }` so Pi expands `notion` natively and displays `帮我读这个页面` in the user bubble

#### Scenario: Leading single skill without arguments
- **WHEN** the user submits `$notion`
- **THEN** the `input` handler SHALL return `{ action: "transform", text: "/skill:notion" }` so Pi expands `notion` natively with no trailing user message

#### Scenario: Mid-sentence single skill
- **WHEN** the user submits `帮我用 $notion 读这个页面`
- **THEN** the `input` handler SHALL return `{ action: "transform", text: "/skill:notion 帮我用 $notion 读这个页面" }`, preserving `$notion` in the prompt text

#### Scenario: Multi-skill input starting with a skill
- **WHEN** the user submits `$notion 和 $ponytail 一起查`
- **THEN** the `input` handler SHALL return `{ action: "transform", text: "/skill:notion $notion 和 $ponytail 一起查" }`, preserving both tokens in the user text while delegating the first skill to Pi native expansion

#### Scenario: Existing slash command or extension input skipped
- **WHEN** the user submits `/skill:notion 和 $ponytail` or `/opsx-propose $notion`, OR an extension sends `$notion` with `source === "extension"`
- **THEN** the `input` handler SHALL return `{ action: "continue" }` without rewriting the text

#### Scenario: Unknown or escaped skill skipped in input
- **WHEN** the user submits `$unknown-xyz 帮我做` or `\$notion is a variable`
- **THEN** the `input` handler SHALL return `{ action: "continue" }` without modifying the text

### Requirement: Dollar Autocomplete Auto-Trigger Characters
The autocomplete provider wrapper SHALL expose `triggerCharacters` combining any existing `current.triggerCharacters` with `"$"` (deduplicated), enabling Pi 1.6.0's Editor to auto-trigger `$` skill autocomplete as soon as `$` is typed while retaining Tab completion and preserving upstream trigger characters.

#### Scenario: Trigger characters exposed and composed
- **WHEN** the autocomplete provider wraps a base provider whose `triggerCharacters` is `["@", "#"]` or `undefined`
- **THEN** the wrapped provider's `triggerCharacters` SHALL include `"$"` alongside any base trigger characters without duplicates

