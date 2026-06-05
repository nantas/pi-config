# Specification Delta

## Capability 对齐（已确认）

- Capability: `capabilities-env-schema`
- 来源: `proposal.md` — New Capabilities
- 变更类型: new
- 用户确认摘要: 用户要求在 `capabilities.yaml` 中新增按能力分组的 env 字段，支持 global 和 catalog 两种范围，解决扁平字段无法关联能力 ID 的问题

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Env section structure

The system SHALL support a `global.env` section in `capabilities.yaml` where environment variables are declared per-capability using capability IDs as keys.

- Each key in `global.env` SHALL be a capability ID matching an active entry in `global.settings.packages`, `global.extensions`, `global.skills`, or `global.agents`
- Each capability entry SHALL contain `description` (string) and `variables` (map) at minimum
- Each variable entry SHALL support `value` (string, the expected assignment), `description` (string), and `required` (boolean, default false)
- `value` MAY contain `$HOME` and other shell variables; consumers SHALL expand them before comparison

#### Scenario: Global env block for a package capability

- **WHEN** `global.settings.packages` contains `npm:@ff-labs/pi-fff`
- **AND** `global.env` contains a key `pi-fff` with variables `FFF_FRECENCY_DB` and `FFF_HISTORY_DB`
- **THEN** the sync script SHALL recognize `pi-fff` as an active capability with 2 required env variables

#### Scenario: Orphaned env block detection

- **WHEN** `global.env` contains a key `old-capability`
- **AND** no entry in `global.settings.packages`, `global.extensions`, `global.skills`, or `global.agents` maps to capability ID `old-capability`
- **THEN** the sync script SHALL emit a warning that `old-capability` has orphaned env configuration

### Requirement: Catalog env section

The system SHALL support a `catalog.env` section with identical structure to `global.env`.

- Catalog env entries SHALL NOT be checked by `sync-pi-agent.sh` during global sync
- Catalog env entries SHALL be checked by the `install-from-pi-config` workflow when a catalog capability is installed

#### Scenario: Catalog env for obsidian-search

- **WHEN** `catalog.env` contains `obsidian-search` with variable `OBSIDIAN_VAULT_PATH`
- **AND** `obsidian-search` is listed in `catalog.skills` but NOT in `global.skills`
- **THEN** global sync SHALL skip it; `install-from-pi-config` SHALL check it during installation

### Requirement: Env variable validation semantics

The system SHALL define the following validation semantics for each variable:

- `required: true` → absent variable SHALL cause an error-level message during check
- `required: false` (or absent) → absent variable SHALL cause a warning-level message
- `value` is present → actual value SHALL be compared against it (after `$HOME` expansion); mismatch SHALL cause a warning
- `value` is absent → only existence is checked, not value

#### Scenario: Required variable missing

- **WHEN** `pi-fff` capability declares `FFF_FRECENCY_DB` with `required: true`
- **AND** the shell environment does NOT contain `FFF_FRECENCY_DB`
- **THEN** the sync script SHALL output an error-level message with the expected `export` command

#### Scenario: Variable value mismatch

- **WHEN** `pi-fff` capability declares `FFF_FRECENCY_DB` with `value: "$HOME/.cache/pi/fff_frecency"`
- **AND** the shell environment has `FFF_FRECENCY_DB="$HOME/.cache/pi/fff_alt"`
- **THEN** the sync script SHALL output a warning showing current vs expected value
