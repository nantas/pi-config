# Specification Delta

## Capability 对齐（已确认）

- Capability: `capability-manifest`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: fusion-harness 进 global（非 catalog）；package 源无版本 pin；`global.settings` 带 `fusionHarness` 配置字段；本 change 只更新能力表，不执行全局 sync

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Global Settings Packages MUST Include Fusion Harness Without Version Pin
The system SHALL include the fusion-harness package source `git:github.com/nantas/fusion-harness` as an entry in `.pi/capabilities.yaml` under `global.settings.packages`, and that entry MUST NOT contain a version or git-ref pin suffix (no `#…` fragment).

#### Scenario: Manifest lists unpinned fusion-harness package
- **WHEN** `.pi/capabilities.yaml` is inspected after this change is applied
- **THEN** `global.settings.packages` SHALL contain the exact string `git:github.com/nantas/fusion-harness`
- **AND** SHALL NOT contain a `#v…` or other `#…` pin on that source

#### Scenario: Fusion harness is not a catalog package
- **WHEN** the catalog section is inspected
- **THEN** `catalog.packages` SHALL NOT be required to list fusion-harness for global delivery of this capability
- **AND** fusion-harness SHALL NOT be registered under `global.extensions` as a local `.pi/extensions` file capability

### Requirement: Global Settings MUST Define FusionHarness Configuration Block
The system SHALL declare a top-level `fusionHarness` object under `.pi/capabilities.yaml` `global.settings` with keys `architect`, `builder`, `architectThinking`, and `builderThinking`, so that `scripts/sync-pi-agent.sh` treats those keys as authoritative when generating `~/.pi/agent/settings.json`.

#### Scenario: Manifest carries fusionHarness defaults
- **WHEN** `.pi/capabilities.yaml` `global.settings` is inspected after this change is applied
- **THEN** it SHALL contain:
  ```yaml
  fusionHarness:
    architect: kimi-coding/k3
    builder: grok-build/grok-4.5
    architectThinking: high
    builderThinking: high
  ```

#### Scenario: Sync authority includes fusionHarness when sync is later run
- **GIVEN** `fusionHarness` is present under `global.settings` in the manifest
- **WHEN** an operator later runs `scripts/sync-pi-agent.sh` (outside this change’s required tasks)
- **THEN** the generated `~/.pi/agent/settings.json` SHALL include a `fusionHarness` object matching the manifest values for those four keys

## MODIFIED Requirements

### Requirement: Settings.json Must Reference Fusion Harness Package
The system SHALL include the fusion-harness package reference in the authoritative package lists used for Pi loading: project `.pi/settings.json` MAY list the package during development or local override, and `.pi/capabilities.yaml` `global.settings.packages` SHALL list `git:github.com/nantas/fusion-harness` without a version pin for global delivery. Project-level entries that duplicate the global unpinned source MAY be removed by the sync script’s project package dedupe when global sync is eventually run.

#### Scenario: Global delivery uses unpinned git URL
- **WHEN** global package delivery for fusion-harness is configured
- **THEN** `global.settings.packages` SHALL contain `git:github.com/nantas/fusion-harness` with no `#…` pin

#### Scenario: Project settings may align pin policy
- **WHEN** project `.pi/settings.json` still contains `git:github.com/nantas/fusion-harness#v0.1.3` or another pinned form
- **THEN** apply MAY rewrite that project package entry to the unpinned form `git:github.com/nantas/fusion-harness` for consistency
- **AND** this change SHALL NOT require executing global sync to complete apply

### Requirement: Settings.json Must Define Fusion Harness Configuration Block
The system SHALL support a `fusionHarness` block that specifies architect model, builder model, architect thinking level, and builder thinking level. For global delivery, that block SHALL be declared under `.pi/capabilities.yaml` `global.settings.fusionHarness`. A project `.pi/settings.json` `fusionHarness` block MAY continue to exist as a project-local override surface until/unless a later sync or project edit removes it; this change’s required write is the capability-manifest `global.settings` declaration.

#### Scenario: Global fusionHarness block present after setup
- **WHEN** this change’s capability-table apply is complete
- **THEN** `.pi/capabilities.yaml` `global.settings` SHALL contain a `fusionHarness` object with `architect`, `builder`, `architectThinking`, and `builderThinking` keys

#### Scenario: Project fusionHarness may remain as local preference
- **WHEN** project `.pi/settings.json` already defines `fusionHarness`
- **THEN** apply MAY leave that project block in place
- **AND** SHALL NOT treat absence of a post-sync `~/.pi/agent/settings.json` update as a failure of this change

### Requirement: Global Package Conflict Must Be Resolved
When the fusion-harness package is delivered via `global.settings.packages` with the unpinned git source, a later global sync SHALL install that global entry as authoritative for packages. Development-mode local-path overrides remain a separate fork-dev workflow and are out of scope for this change; this change SHALL NOT remove or restore `~/.pi/agent/settings.json` entries because it does not run global sync.

#### Scenario: This change does not mutate global runtime settings
- **WHEN** apply tasks for this change complete
- **THEN** the repository capability table SHALL be updated
- **AND** `~/.pi/agent/settings.json` NEED NOT yet contain fusion-harness until an operator later runs sync

#### Scenario: Deferred sync is documented not blocked
- **WHEN** housekeep or fork ship work continues in another session
- **THEN** this change SHALL remain valid with the unpinned source `git:github.com/nantas/fusion-harness`
- **AND** SHALL NOT require a specific package version tag to land first
