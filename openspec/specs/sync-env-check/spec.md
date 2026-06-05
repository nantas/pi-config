# Specification Delta

## Capability 对齐（已确认）

- Capability: `sync-env-check`
- 来源: `proposal.md` — New Capabilities
- 变更类型: new
- 用户确认摘要: 用户要求在 `sync-pi-agent.sh` 中新增 env 变量检查步骤，在同步时验证 manifest 中声明的环境变量

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Env check step position

The system SHALL add an env variable check step to `sync-pi-agent.sh` positioned after the deduplication step (step 6) and before the summary step (step 7).

#### Scenario: Normal sync includes env check

- **WHEN** `scripts/sync-pi-agent.sh` is executed
- **THEN** after the dedup step, the script SHALL execute the env check step
- **AND** env check results SHALL appear in the terminal output

### Requirement: Env variable presence check

The system SHALL parse `global.env` from `capabilities.yaml` and check each declared variable's presence in the current shell environment.

- The check SHALL use Python 3 with PyYAML to parse the manifest
- The check SHALL filter to only capabilities whose ID appears in `global.settings.packages`, `global.extensions`, `global.skills`, or `global.agents`
- The check SHALL NOT require any `catalog.env` entries

#### Scenario: All env vars present and correct

- **WHEN** all required env vars for active capabilities are set in the shell with matching values
- **THEN** the output SHALL display `OK: FFF_FRECENCY_DB, FFF_HISTORY_DB`

#### Scenario: Missing required env var

- **WHEN** `FFF_FRECENCY_DB` is declared with `required: true` but not present in the shell
- **THEN** the output SHALL display an error-level message with the recommended `export` command

#### Scenario: Value mismatch

- **WHEN** `FFF_FRECENCY_DB` is set to a different path than declared `value`
- **THEN** the output SHALL display a mismatch warning with current and expected values

### Requirement: Orphaned env block detection

The system SHALL detect env blocks in `global.env` whose capability ID does not match any active capability, and emit warnings.

#### Scenario: Env block with no matching capability

- **WHEN** `global.env` contains a key `removed-capability`
- **AND** there is no entry in any global config list that maps to `removed-capability`
- **THEN** the output SHALL display a warning indicating orphaned env configuration

### Requirement: Directory creation for path-type variables

The system SHALL automatically create parent directories for env variables whose `value` contains a path, when the directory does not exist.

#### Scenario: DB directory does not exist

- **WHEN** `FFF_FRECENCY_DB` has `value: "$HOME/.cache/pi/fff_frecency"`
- **AND** `~/.cache/pi/` does not exist
- **THEN** the sync script SHALL create `~/.cache/pi/` before the env check reports results

### Requirement: No modification of shell config files

The system SHALL NOT modify `~/.zshenv`, `~/.zshrc`, or any other shell configuration file.

- The env check SHALL only report warnings and recommended commands
- The user is responsible for adding missing variables to their shell config

#### Scenario: Env check finds missing variables

- **WHEN** env variables are missing or mismatched
- **THEN** the output SHALL include explicit `export` commands for the user to add manually
- **AND** no shell config files SHALL be modified
