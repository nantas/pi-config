# Specification Delta

## Capability 对齐（已确认）

- Capability: `capability-manifest`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 两个 capability 确认（fusion-harness-integration + capability-manifest）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Fork Manifest Must Register Fusion Harness
The system SHALL include the fusion-harness fork entry in `forks/manifest.yaml` with canonical metadata (name, fork URL, upstream URL, upstream source, status).

#### Scenario: Manifest contains fusion-harness entry
- **WHEN** `forks/manifest.yaml` is inspected
- **THEN** it SHALL contain a `forks` list entry with `name: fusion-harness`, `fork_url: https://github.com/nantas/fusion-harness`, `upstream_url: https://github.com/disler/fusion-harness`, `upstream_source: git:github.com/disler/fusion-harness`, and `status: active`

### Requirement: Settings.json Must Reference Fusion Harness Package
The system SHALL include the fusion-harness package reference in `.pi/settings.json` packages array, using a local path during development and a git URL after shipping.

#### Scenario: Development mode uses local path
- **WHEN** the fork is under active modification
- **THEN** `.pi/settings.json` packages SHALL contain the absolute local path to the dev clone

#### Scenario: Production mode uses git URL
- **WHEN** the fork modifications are committed and pushed
- **THEN** `.pi/settings.json` packages SHALL contain `git:github.com/nantas/fusion-harness`

### Requirement: Settings.json Must Define Fusion Harness Configuration Block
The system SHALL support a `fusionHarness` block in `.pi/settings.json` that specifies the architect model, builder model, architect thinking level, and builder thinking level.

#### Scenario: Fusion harness block present after setup
- **WHEN** the change is complete
- **THEN** `.pi/settings.json` SHALL contain a `fusionHarness` object with `architect`, `builder`, `architectThinking`, and `builderThinking` keys

### Requirement: Global Package Conflict Must Be Resolved
When the fusion-harness fork is in development mode (local path), any conflicting global package entry in `~/.pi/agent/settings.json` SHALL be removed and the removal recorded for later restoration.

#### Scenario: Global conflict detected and resolved
- **GIVEN** `~/.pi/agent/settings.json` contains a package entry matching fusion-harness
- **WHEN** the project package source is switched to a local dev path
- **THEN** the conflicting global entry SHALL be removed and recorded in `.pi-dev-state.json` or OpenSpec `writeback.md`

#### Scenario: Global entries restored after shipping
- **GIVEN** global entries were removed during development
- **WHEN** the fork transitions to production mode (git URL)
- **THEN** the removed global entries SHALL be restored from the override record
