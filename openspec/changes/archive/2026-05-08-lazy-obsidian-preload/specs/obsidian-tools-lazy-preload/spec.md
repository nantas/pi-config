# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-tools-lazy-preload`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 用户要求同时实现条件触发（仅 vault 内 preload）和 lazy-load（非 vault 环境首次工具调用时加载）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: conditional-preload-on-session-start
The system SHALL only invoke `preloadKnownVaults()` during `session_start` when the current working directory is detected to be inside an Obsidian vault (i.e., a `.obsidian/` directory exists in the directory tree).

#### Scenario: session starts inside an Obsidian vault
- **WHEN** pi session starts and the current working directory contains or is under a `.obsidian/` directory
- **THEN** `preloadKnownVaults()` SHALL execute, populating `knownVaults` and setting `_cliAvailable`
- **AND** the Obsidian CLI MAY be invoked as before

#### Scenario: session starts outside an Obsidian vault
- **WHEN** pi session starts and the current working directory is NOT inside an Obsidian vault
- **THEN** `preloadKnownVaults()` SHALL NOT execute during `session_start`
- **AND** no Obsidian CLI process SHALL be spawned
- **AND** no Obsidian application window SHALL be opened

### Requirement: lazy-preload-on-first-tool-call
The system SHALL lazily invoke `preloadKnownVaults()` on the first call to `obsidian_search` or `obsidian_cli` when the preload has not yet been executed (i.e., `_preloaded` is `false`).

#### Scenario: first tool call triggers lazy preload
- **WHEN** a user invokes `obsidian_search` or `obsidian_cli` for the first time in a session
- **AND** `_preloaded` is `false` (preload was skipped at session_start)
- **THEN** `preloadKnownVaults()` SHALL execute before processing the tool request
- **AND** the tool SHALL proceed normally after preload completes

#### Scenario: subsequent tool calls skip preload
- **WHEN** a user invokes `obsidian_search` or `obsidian_cli` after the first call
- **AND** `_preloaded` is `true`
- **THEN** preload SHALL NOT execute again
- **AND** the tool SHALL proceed normally using cached vault data

### Requirement: graceful-degradation-without-preload
The system SHALL remain functional when `preloadKnownVaults()` fails or is skipped, using `.obsidian/` directory detection as a fallback for vault resolution.

#### Scenario: preload fails but tool is called with explicit vault
- **WHEN** `preloadKnownVaults()` fails (CLI unavailable, timeout, etc.)
- **AND** a tool is called with an explicit `vault` parameter
- **THEN** the tool SHALL accept the vault parameter and proceed

#### Scenario: preload fails and tool is called without vault in a vault directory
- **WHEN** `preloadKnownVaults()` fails
- **AND** a tool is called without `vault` parameter
- **AND** the current working directory is inside an Obsidian vault
- **THEN** `resolveVault()` SHALL detect the vault via `.obsidian/` directory walk-up
- **AND** the tool SHALL proceed using the detected vault name

#### Scenario: preload fails and tool is called without vault outside any vault
- **WHEN** `preloadKnownVaults()` fails
- **AND** a tool is called without `vault` parameter
- **AND** the current working directory is NOT inside any Obsidian vault
- **THEN** the tool SHALL return a descriptive error requiring an explicit vault parameter
