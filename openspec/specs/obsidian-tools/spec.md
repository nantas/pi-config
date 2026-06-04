# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-tools`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 探索阶段已确认——CLI 依赖无剩余价值，vault 解析改为纯文件系统方案。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Vault Resolution — File-system Only
The system SHALL resolve the active vault root path using only file-system traversal, without spawning the Obsidian CLI process. The `session_start` hook MUST NOT invoke any external subprocess for vault discovery.

#### Scenario: Pi starts inside an Obsidian vault
- **WHEN** a Pi session starts with `cwd` inside a directory tree containing `.obsidian/`
- **THEN** the `obsidian-tools` extension SHALL detect the vault via upward `.obsidian/` directory search
- **AND** the vault root path SHALL be cached for subsequent tool invocations
- **AND** NO Obsidian CLI process SHALL be spawned at any point during startup

#### Scenario: Pi starts outside any Obsidian vault
- **WHEN** a Pi session starts with `cwd` NOT inside any `.obsidian/` directory tree
- **THEN** the extension SHALL initialize without error
- **AND** no vault path SHALL be cached

### Requirement: Vault Path Returned Directly by Resolver
The system SHALL return the absolute vault root path directly from `resolveVault()`, eliminating the intermediate vault name → path reverse lookup step.

#### Scenario: Explicit vault path provided
- **WHEN** the `obsidian_search` tool is invoked with an explicit `vault` parameter containing a valid directory path
- **THEN** the vault root SHALL be set to the resolved absolute path of that directory

#### Scenario: Auto-detected vault from cwd
- **WHEN** the `obsidian_search` tool is invoked without an explicit `vault` parameter
- **AND** the `cwd` is inside an Obsidian vault
- **THEN** the vault root SHALL be resolved to the absolute path of the nearest ancestor directory containing `.obsidian/`

### Requirement: Vault Display Name Uses Basename
The system SHALL derive the display name for output from `path.basename()` of the resolved vault root, rather than from a preloaded name-to-path map.

#### Scenario: Search results display vault name
- **WHEN** search results are rendered in the tool output
- **THEN** the vault display name SHALL be the basename of the vault root directory (e.g., `my-wiki` for `/Users/projects/my-wiki`)
- **AND** the output format SHALL remain otherwise unchanged

### Requirement: Search Functionality Unchanged
The system SHALL preserve the existing `obsidian_search` tool behavior in all aspects except vault name resolution: query parsing, rg invocation, result ranking, snippet generation, scope resolution, and output formatting MUST remain identical to the pre-change behavior.

#### Scenario: Search executed after CLI removal
- **WHEN** any valid `obsidian_search` invocation is made
- **THEN** the search SHALL return results matching the same ranking, formatting, and metadata as before the change

## REMOVED Requirements

### Requirement: CLI-based Vault Preloading
**Reason**: The Obsidian CLI (`obsidian vaults verbose`) is no longer used. Vault discovery is purely file-system based (`isInsideVault`).

**Migration**: No user action required. The `session_start` hook no longer calls `preloadKnownVaults()`. Vault resolution continues to work via file-system traversal.

### Requirement: Known Vaults Map
**Reason**: The `knownVaults` Map (populated by CLI `obsidian vaults verbose`) is no longer needed. Vault names are now derived from directory basenames, and vault paths are resolved directly.

**Migration**: No user action required. The internal `knownVaults`, `_preloaded`, `_cliAvailable` state, and helper functions (`ensurePreloaded`, `matchPathToKnownVaults`, `parseVaultListTable`, `resolveExplicitVault`, `resolveVaultPath`) are removed.

### Requirement: CLI Runner Module
**Reason**: The entire `cli-runner.ts` module, including `runCli()`, `parseTextPathLines()`, `parseSearchLines()`, and all CLI output parsers, is no longer used by any remaining code.

**Migration**: The `cli-runner.ts` file SHALL be deleted. The `import { runCli }` statement in `vault-resolver.ts` SHALL be removed.
