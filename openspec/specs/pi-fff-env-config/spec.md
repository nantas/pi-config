# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-fff-env-config`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: modified
- 用户确认摘要: 用户要求在 `~/.zshenv` 中配置 `FFF_FRECENCY_DB` 和 `FFF_HISTORY_DB`，指向推荐的 LMDB 存储路径

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: FFF_FRECENCY_DB environment variable

The system SHALL configure `FFF_FRECENCY_DB` in `~/.zshenv` pointing to `$HOME/.cache/pi/fff_frecency`.

- The variable SHALL be exported with `export FFF_FRECENCY_DB="$HOME/.cache/pi/fff_frecency"`
- The entry SHALL include a comment block identifying it as fff-related and managed by pi-config
- The target directory `$HOME/.cache/pi/` SHALL be created by the sync script if it does not exist

#### Scenario: Variable present in shell config

- **WHEN** reading `~/.zshenv`
- **THEN** it SHALL contain `export FFF_FRECENCY_DB="$HOME/.cache/pi/fff_frecency"`
- **AND** the surrounding comments SHALL identify the variable as fff frecency database

#### Scenario: Variable effective in shell

- **WHEN** a new shell session sources `~/.zshenv`
- **THEN** `echo $FFF_FRECENCY_DB` SHALL output the expanded path to `~/.cache/pi/fff_frecency`

### Requirement: FFF_HISTORY_DB environment variable

The system SHALL configure `FFF_HISTORY_DB` in `~/.zshenv` pointing to `$HOME/.cache/pi/fff_history`.

- The variable SHALL be exported with `export FFF_HISTORY_DB="$HOME/.cache/pi/fff_history"`
- The entry SHALL be placed alongside `FFF_FRECENCY_DB` in the same comment block

#### Scenario: Variable present in shell config

- **WHEN** reading `~/.zshenv`
- **THEN** it SHALL contain `export FFF_HISTORY_DB="$HOME/.cache/pi/fff_history"`

### Requirement: Storage path convention

The system SHALL use `$HOME/.cache/pi/` as the base directory for pi-fff LMDB databases, following the XDG base directory specification for non-essential user cache data.

- LMDB databases SHALL be stored under `~/.cache/pi/fff_frecency/` and `~/.cache/pi/fff_history/` (heed/LMDB creates a directory per environment)
- The sync script SHALL create `~/.cache/pi/` if it does not exist

#### Scenario: First-time setup

- **WHEN** `~/.cache/pi/` does not exist
- **AND** `scripts/sync-pi-agent.sh` is executed
- **THEN** the directory SHALL be created
- **AND** the env check SHALL report success for the path-creation step
