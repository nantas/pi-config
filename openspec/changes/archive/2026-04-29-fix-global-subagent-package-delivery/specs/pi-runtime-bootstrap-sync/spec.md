# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-runtime-bootstrap-sync`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户确认全局运行时仍由 `pi-config` 受管 sync 驱动，但 global settings 需要支持绝对 local-path package 注入，而不是继续保持逐字节复制

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

## MODIFIED Requirements

### Requirement: Bootstrap Sync Must Define Path Mapping
The system SHALL define the mapping from repository-managed source paths to runtime target paths, including `.pi/settings.json` to `~/.pi/agent/settings.json`, `.pi/extensions/` to `~/.pi/agent/extensions/`, `.pi/prompts/` to `~/.pi/agent/prompts/`, `.pi/themes/` to `~/.pi/agent/themes/`, and `.pi/agents/` to `~/.pi/agent/agents/`; the global settings target SHALL allow generated runtime values when required to activate a repository-managed local-path package.

#### Scenario: Runtime deployment target is documented after the packaging change
- **WHEN** a reader needs to deploy the managed Pi baseline
- **THEN** the runtime target for each managed source path remains explicit
- **AND** the reader can see that `~/.pi/agent/settings.json` may be generated from repository truth to inject runtime-only absolute package paths

### Requirement: Bootstrap Sync Must Enforce Managed Overwrite And Deletion Semantics
The system SHALL define managed overwrite semantics for runtime targets, SHALL keep directory targets copy-based, and SHALL allow `~/.pi/agent/settings.json` to be rendered from repository-managed settings plus sync-time runtime fields before overwrite.

#### Scenario: Managed runtime settings require a machine-specific absolute path
- **WHEN** the global runtime needs an absolute local-path package source derived from the current repository location
- **THEN** the sync workflow renders that runtime value into `~/.pi/agent/settings.json` before writing the target file
- **AND** subsequent syncs continue to overwrite the target with the latest rendered state

### Requirement: Bootstrap Sync Must Prepare Local Package Runtime Dependencies
The system SHALL ensure that any repository-managed local-path Pi package required by global settings has its runtime dependencies installed before the generated global settings are considered deployable.

#### Scenario: Managed sync prepares the global subagent package source
- **WHEN** the sync workflow is about to generate global settings that reference the repository-owned `subagent-dispatch` package
- **THEN** the workflow verifies or installs that package's runtime dependencies first
- **AND** the resulting global runtime does not point at a package source whose dependencies are absent

## REMOVED Requirements

## RENAMED Requirements
