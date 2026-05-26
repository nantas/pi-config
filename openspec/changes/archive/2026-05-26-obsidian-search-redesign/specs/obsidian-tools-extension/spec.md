# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-tools-extension`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 三 capability 清单已确认，用户指示继续

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Extension Lifecycle Management
The system SHALL manage extension initialization and deduplication through `session_start` / `session_shutdown` event handlers rather than a `globalThis` guard.

#### Scenario: Session start registration
- **WHEN** the `session_start` event fires
- **THEN** the extension SHALL register tools (`obsidian_search`, `obsidian_cli`) exactly once per session

#### Scenario: Session shutdown cleanup
- **WHEN** the `session_shutdown` event fires
- **THEN** the extension SHALL clean up any session-scoped state (config caches, preflight flags), but SHALL NOT unregister tools (the runtime handles this)

#### Scenario: Reload resilience
- **WHEN** the extension factory function is re-invoked (e.g., via `/reload` or settings change)
- **THEN** the tools SHALL be re-registered correctly without being blocked by a stale `globalThis` flag

### Requirement: Preflight Logic
The system SHALL perform a preflight check on the first `obsidian_search` invocation to determine whether the Obsidian CLI is available and whether CLI search works, and SHALL route all subsequent searches accordingly.

#### Scenario: CLI available but search broken
- **WHEN** `obsidian help` succeeds (exit code 0) but a probe `obsidian search query="common-term"` returns empty results on a known-populated vault
- **THEN** the preflight SHALL mark the session as "rg-primary" mode, and all subsequent searches SHALL use rg directly without attempting CLI search

#### Scenario: CLI not available
- **WHEN** `obsidian help` fails or the CLI binary is not found
- **THEN** the preflight SHALL mark the session as "rg-primary" mode

#### Scenario: Preflight cached per session
- **WHEN** the preflight has already run in the current session
- **THEN** subsequent `obsidian_search` calls SHALL use the cached preflight result without re-executing the probe

### Requirement: Search Init Command Registration
The system SHALL register a `search:init` command via the `obsidian_cli` tool that invokes the config file generator.

#### Scenario: search:init invocation
- **WHEN** `obsidian_cli` is called with command `search:init`
- **THEN** the system SHALL generate a default `search-config.yaml` at the vault root and return a success message with the file path

#### Scenario: search:init with overwrite
- **WHEN** `obsidian_cli` is called with command `search:init` and `flags: ["--overwrite"]`
- **THEN** the system SHALL overwrite any existing `search-config.yaml` with the default template

### Requirement: Tool Registration Order
The system SHALL register `obsidian_search` and `obsidian_cli` tools in a consistent order, with `obsidian_search` registered first since it is the primary tool.

#### Scenario: Tool availability
- **WHEN** the session is initialized
- **THEN** both `obsidian_search` and `obsidian_cli` SHALL appear in the agent's available tool list, each with their full parameter schemas and prompt guidelines

## REMOVED Requirements

### Requirement: globalThis Dedup Guard
**Reason**: The `globalThis[_key]` guard pattern violates Pi extension development guidelines. It prevents extensions from being re-initialized after reload, causing silent failures.
**Migration**: Replaced by `session_start` / `session_shutdown` event-based lifecycle management in index.ts.
