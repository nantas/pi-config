# Specification Delta

## Capability 对齐（已确认）

- Capability: `extension-globalthis-dedup-session-shutdown`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户已确认根因（globalThis 标志位跨 session 持久存在导致 session 替换后 extension 失效），并要求仅通过 extension 层面修复（不修改 pi-mono 源码）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Extension Self-Dedup Must Clear on Session Shutdown

Any Pi extension that uses a `globalThis` flag for self-deduplication (to prevent double registration when loaded from both project-local `.pi/extensions/` and global `~/.pi/agent/extensions/` paths) SHALL also register a `session_shutdown` handler that clears that flag.

This ensures that when pi performs session replacement operations (`/new`, `/reload`, `/resume`), and the extension modules are subsequently re-loaded via jiti with `moduleCache: false`, the dedup flag is unset, allowing the extension factory function to re-register all handlers, shortcuts, commands, and autocomplete providers on the new session.

#### Scenario: Session replacement via `/new`

- **WHEN** the user executes `/new` to start a new session
- **THEN** pi emits `session_shutdown` on the old session's ExtensionRunner
- **AND** the extension's `session_shutdown` handler clears its `globalThis` dedup flag
- **AND** pi creates a new session and calls `loadExtensions`, which re-executes the extension module
- **AND** the extension factory function finds the dedup flag is unset
- **AND** the extension factory proceeds to register all handlers, shortcuts, commands, and autocomplete providers
- **AND** the new session's `session_start` event triggers extension initialization
- **AND** all extension functionality (keyboard shortcuts, autocomplete, commands) works in the new session

#### Scenario: Session replacement via `/reload`

- **WHEN** the user executes `/reload` to reload extensions, skills, prompts, and themes
- **THEN** pi emits `session_shutdown` on the current ExtensionRunner
- **AND** the extension's `session_shutdown` handler clears its `globalThis` dedup flag
- **AND** pi reloads the resource loader, which calls `loadExtensions` to re-execute extension modules
- **AND** the extension factory function finds the dedup flag is unset
- **AND** the extension factory proceeds to register all handlers, shortcuts, commands, and autocomplete providers
- **AND** the `session_start` event (reason: `reload`) triggers extension initialization
- **AND** all extension functionality works after reload

#### Scenario: Dual-path loading within a single load cycle

- **WHEN** an extension file exists at both `.pi/extensions/<name>.ts` (project-local) and `~/.pi/agent/extensions/<name>.ts` (global)
- **AND** pi's `loadExtensions` encounters both paths in the same load cycle
- **THEN** the first path loaded finds the dedup flag unset, executes the factory, and sets the flag
- **AND** the second path loaded finds the dedup flag set, and returns early from the factory
- **AND** only one copy of the extension's handlers, shortcuts, commands, and autocomplete providers is registered
- **AND** no "shortcut conflict" warnings or duplicate behavior occurs

#### Scenario: Graceful handling of session_shutdown absence

- **WHEN** a third-party extension uses `globalThis` dedup but does NOT register a `session_shutdown` handler
- **THEN** the extension's functionality will NOT survive session replacement
- **AND** pi does NOT crash or report errors (the extension simply becomes inactive after session replacement)

### Requirement: pi-extension-dev Skill Must Document session_shutdown Requirement

The `pi-extension-dev` skill (`.pi/skills/pi-extension-dev/SKILL.md`) SHALL document that any extension using `globalThis` self-deduplication MUST also register a `session_shutdown` handler to clear the flag. The skill MUST include a complete code example showing both the dedup guard and the `session_shutdown` cleanup.

## ADDED Requirements

### Requirement: Reference Documentation for globalThis Dedup Pattern

A reference document `docs/reference/pi-extension-session-shutdown-dedup.md` SHALL exist, documenting:

- The `globalThis` self-deduplication pattern and why it is needed (prevent double registration from dual-path loading)
- The mechanism by which `globalThis` flags persist across session replacements
- The `session_shutdown` cleanup pattern as the required companion
- The session replacement lifecycle with timing diagram showing when `session_shutdown` fires relative to `loadExtensions`
- Complete code example for the pattern
- Known limitations and edge cases
