# Specification Delta

## Capability 对齐（已确认）

- Capability: `dollar-skill-invoke`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 已验证 `pi.getCommands()` 作为唯一数据源存在竞态风险，需要增加文件系统 fallback 作为防御层。能力范围已与用户对齐。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Skill Discovery with Filesystem Fallback
The system SHALL discover skills via `pi.getCommands()` as the primary source. The system SHALL also maintain an independent filesystem skill index as a fallback, built by scanning known skill directories (`.agents/skills/`, `.pi/skills/`, `~/.agents/skills/`, `~/.pi/agent/skills/`) for `SKILL.md` files. When `pi.getCommands()` returns no skills or an incomplete list, the system SHALL fall back to the filesystem index. The fallback SHALL be transparent — no user-visible behavior change when the primary source works correctly.

#### Scenario: Primary source works normally
- **WHEN** `pi.getCommands()` returns a non-empty skill list
- **THEN** the system SHALL use `pi.getCommands()` as the sole skill source, and the filesystem index SHALL NOT be consulted

#### Scenario: Primary source returns empty
- **WHEN** `pi.getCommands()` returns an empty skill list (e.g., due to race condition during ResourceLoader initialization)
- **THEN** the system SHALL use the cached filesystem index built during `session_start`

#### Scenario: Skill not found in primary source but exists on filesystem
- **WHEN** a `$skill-name` token matches via regex but `find()` against `pi.getCommands()` results returns undefined
- **THEN** the system SHALL attempt a secondary `find()` against the cached filesystem index before declaring the skill unknown

#### Scenario: Filesystem index not yet built
- **WHEN** the filesystem index is `null` (e.g., `session_start` not yet fired or failed) and `pi.getCommands()` returns empty
- **THEN** the system SHALL trigger an on-demand filesystem scan to build the index and use the result

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
