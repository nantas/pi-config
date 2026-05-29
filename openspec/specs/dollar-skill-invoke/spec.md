# Specification: dollar-skill-invoke

## Purpose

Defines the behavior for expanding `$skill-name` tokens into `<skill>` blocks via `context` event message injection. The system intercepts the `context` event (fired before each LLM call) to inject skill content as independent `CustomMessage` entries appended after the user message, preserving the original user prompt text intact.
## Requirements
### Requirement: Dollar Skill Token Expansion
The system SHALL, on each LLM call, scan the last user message in the message array for unescaped `$skill-name` tokens. For each matched token, the system SHALL read the skill's `SKILL.md` content and inject a `CustomMessage` containing a `<skill>` block after the user message. **All** unescaped `$skill-name` tokens in the same input SHALL be expanded. The original user message text SHALL be preserved unchanged.

#### Scenario: Single skill expansion
- **WHEN** the user submits `$my-skill explain this`
- **THEN** the system SHALL read `SKILL.md` for skill `my-skill`, strip the YAML frontmatter, wrap the body in a `<skill>` block using the format matching `/skill:name`, and inject it as a `CustomMessage` after the user message. The user message SHALL retain `$my-skill` as-is.

#### Scenario: Multiple skill expansion
- **WHEN** the user submits `$skill-a and $skill-b`
- **THEN** the system SHALL expand **both** `$skill-a` and `$skill-b` into separate `<skill>` blocks, injected as two `CustomMessage` entries in the order they appear in the text. The user message SHALL retain `$skill-a and $skill-b` as-is.

#### Scenario: Unknown skill
- **WHEN** the user submits `$nonexistent-skill do something`
- **THEN** the token `$nonexistent-skill` SHALL be left unchanged in the user message, and no skill message SHALL be injected for this token

#### Scenario: Escaped dollar
- **WHEN** the user submits `\$my-skill is a variable`
- **THEN** the `\$` SHALL be treated as an escaped literal `$`, the text `$my-skill is a variable` SHALL NOT trigger skill expansion, and no skill message SHALL be injected

#### Scenario: Mixed escaped and unescaped
- **WHEN** the user submits `\$my-skill and $other-skill`
- **THEN** `\$my-skill` SHALL remain as literal text while `$other-skill` SHALL trigger a skill message injection

### Requirement: Context Event Message Injection
The system SHALL use the `context` event to inject skill content as `CustomMessage` entries into the LLM message array. Each matched `$skill-name` token SHALL produce one `CustomMessage` with `customType: "skill"`, `display: false`, and content containing the `<skill>` block. Injected messages SHALL be inserted immediately after the user message in the `AgentMessage[]` array.

#### Scenario: Single skill injection
- **WHEN** a user submits `$my-skill explain this` and the `context` event fires
- **THEN** the system SHALL parse `$my-skill` from the user message, read its `SKILL.md`, and insert one `CustomMessage` with `customType: "skill"` and content `<skill name="my-skill" location="...">...body...</skill>` immediately after the user message

#### Scenario: Multiple skill injection
- **WHEN** a user submits `$skill-a and $skill-b` and the `context` event fires
- **THEN** the system SHALL parse both `$skill-a` and `$skill-b`, and insert two `CustomMessage` entries—one per skill—in the order they appear in the text, immediately after the user message

#### Scenario: Original prompt preserved
- **WHEN** a user submits `$skill-a help me with X`
- **THEN** the original user message text SHALL remain unchanged (including the `$skill-a` token), and skill content SHALL be appended as additional messages, not prepended or inlined

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
The system SHALL discover skills via `pi.getCommands()` as the primary source, with an independent filesystem skill index as fallback. When `pi.getCommands()` throws an error (including but not limited to stale runtime state after `/new`), the system SHALL catch the error and fall back to `_fileSystemSkillIndex` without propagating the exception. The fallback SHALL be transparent — no user-visible behavior change when the primary source works correctly.

#### Scenario: Primary source works normally
- **WHEN** `pi.getCommands()` returns a non-empty skill list
- **THEN** the system SHALL use `pi.getCommands()` as the sole skill source, and the filesystem index SHALL NOT be consulted

#### Scenario: Primary source returns empty
- **WHEN** `pi.getCommands()` returns an empty skill list (e.g., due to race condition during ResourceLoader initialization)
- **THEN** the system SHALL use the cached filesystem index built during `session_start`

#### Scenario: Primary source throws error (stale runtime)
- **WHEN** `pi.getCommands()` throws an error (e.g., `ExtensionRuntime` stale after `/new` session replacement)
- **THEN** the system SHALL catch the error, log it silently, and fall back to `_fileSystemSkillIndex`. The `handleContextInjection` function SHALL NOT throw, and skill injection SHALL proceed using the filesystem index

#### Scenario: Skill not found in primary source but exists on filesystem
- **WHEN** a `$skill-name` token matches via regex but `find()` against `pi.getCommands()` results returns undefined
- **THEN** the system SHALL attempt a secondary `find()` against the cached filesystem index before declaring the skill unknown

#### Scenario: Filesystem index not yet built
- **WHEN** the filesystem index is `null` (e.g., `session_start` not yet fired or failed) and `pi.getCommands()` returns empty
- **THEN** the system SHALL trigger an on-demand filesystem scan to build the index and use the result

#### Scenario: Both primary and filesystem sources fail
- **WHEN** `pi.getCommands()` throws AND `_fileSystemSkillIndex` is null or empty
- **THEN** `getSkills()` SHALL return an empty array, and `handleContextInjection` SHALL proceed with no skill matches (graceful degradation)

### Requirement: Filesystem Skill Index Build on Session Start
The system SHALL build the independent filesystem skill index during `session_start`. The index SHALL be built by recursively scanning the following directories for `SKILL.md` files:
- `{cwd}/.agents/skills/`
- `{cwd}/.pi/skills/`
- `{homedir}/.agents/skills/`
- `{homedir}/.pi/agent/skills/`

The scan SHALL be non-blocking (errors are caught and silently ignored). Skill names SHALL be derived from YAML frontmatter `name` field, falling back to the parent directory name.

#### Scenario: Index built successfully
- **WHEN** `session_start` fires with a valid `cwd`
- **THEN** `_fileSystemSkillIndex` SHALL be populated with all discovered skills before the first `context` event fires for that session

#### Scenario: Index build fails
- **WHEN** directory scanning encounters an error (e.g., permission denied)
- **THEN** the error SHALL be silently caught, and `_fileSystemSkillIndex` SHALL remain `null` (empty index does NOT inhibit the primary `pi.getCommands()` path)

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

