# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 全局交付；无 pin；带 fusionHarness 配置字段；能力表更新本 change 完成，全局 sync 延后

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Global Package Delivery Via Capability Manifest
The system SHALL deliver fusion-harness as a global Pi package by listing `git:github.com/nantas/fusion-harness` (unpinned) in `.pi/capabilities.yaml` `global.settings.packages`, so that after an operator later runs the managed global sync, `~/.pi/agent/settings.json` includes that package and any repository session under the same global agent home can load the extension without a project-local package entry.

#### Scenario: Capability table declares global package source
- **WHEN** the capability table apply for global delivery is complete
- **THEN** `.pi/capabilities.yaml` `global.settings.packages` SHALL include `git:github.com/nantas/fusion-harness`
- **AND** the entry SHALL NOT include a version pin fragment

#### Scenario: Global sync is intentionally deferred
- **WHEN** this change’s apply tasks finish
- **THEN** absence of fusion-harness in `~/.pi/agent/settings.json` SHALL NOT fail verification of the capability-table work
- **AND** verification MAY record “sync deferred” as expected status

### Requirement: Global FusionHarness Defaults
The system SHALL publish default architect/builder model settings for fusion-harness through `.pi/capabilities.yaml` `global.settings.fusionHarness` with:
- `architect`: `kimi-coding/k3`
- `builder`: `grok-build/grok-4.5`
- `architectThinking`: `high`
- `builderThinking`: `high`

These values become the authoritative global defaults once global sync is later run. CLI flags and any later project-level settings continue to follow the existing override order defined by the extension (CLI > settings > built-in defaults).

#### Scenario: Manifest defaults match agreed sovereign stack
- **WHEN** `global.settings.fusionHarness` is read from the capability table after apply
- **THEN** the four keys SHALL equal the values listed above

#### Scenario: Extension still works if global block not yet synced
- **GIVEN** only the capability table was updated and global sync has not run
- **WHEN** a project still has a local `fusionHarness` block or the extension falls back to built-in defaults
- **THEN** project-local behavior SHALL remain usable independently of global runtime

## MODIFIED Requirements

### Requirement: Extension Registration
The system SHALL register the fusion-harness extension as a Pi package in pi-config’s capability delivery surfaces, making `/opinion`, `/fusion`, and `/auto-validate` available without requiring `-e` or shell scripts. Global registration SHALL use the unpinned git package source in `global.settings.packages`. Project `.pi/settings.json` MAY still list the package until global sync dedupe removes a duplicate entry.

#### Scenario: Global registration source is unpinned git URL
- **WHEN** global registration is configured in the capability table
- **THEN** the package source SHALL be `git:github.com/nantas/fusion-harness`

#### Scenario: Project-only registration is no longer the sole delivery path
- **WHEN** capability-table apply is complete
- **THEN** fusion-harness delivery SHALL be declared at global manifest scope
- **AND** relying solely on project `.pi/settings.json` without a capability-table entry SHALL be considered incomplete for cross-repository availability

### Requirement: Settings Configuration Block
The system SHALL support a `fusionHarness` configuration block that provides default values for architect model, builder model, architect thinking level, and builder thinking level. For cross-repository defaults, the block SHALL be present under `.pi/capabilities.yaml` `global.settings.fusionHarness` with the values defined in **Global FusionHarness Defaults**. Project `.pi/settings.json` MAY retain a `fusionHarness` block as a local preference surface for sessions that load project settings.

#### Scenario: Global settings.json provides model defaults after deferred sync
- **GIVEN** an operator has later synced the capability table to `~/.pi/agent/settings.json`
- **WHEN** no `--architect` or `--builder` CLI flags are provided and no project override wins
- **THEN** the extension SHALL use the global `fusionHarness` values as settings defaults

#### Scenario: Capability-table apply does not require live global settings mutation
- **WHEN** this change is applied
- **THEN** writing `global.settings.fusionHarness` into `.pi/capabilities.yaml` SHALL satisfy the configuration-block delivery requirement for this change
- **AND** live mutation of `~/.pi/agent/settings.json` SHALL remain out of required scope
