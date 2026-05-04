# Specification Delta

## Capability 对齐（已确认）

- Capability: `settings-merge-strategy`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户要求 sync 脚本在覆写 settings.json 前缓存运行时修改的字段（如 enabledModels），覆写后合并回目标文件

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: pre-sync-cache
The system SHALL read the current target `settings.json` before overwriting it and extract the values of all user-managed keys.

#### Scenario: target-exists
- **WHEN** `render_settings_file()` is invoked and the target `settings.json` exists
- **THEN** the system reads the target file and extracts values for all keys defined in `USER_MANAGED_KEYS`
- **THEN** the extracted values are stored in a cache object for later merging

#### Scenario: target-missing
- **WHEN** `render_settings_file()` is invoked and the target `settings.json` does not exist
- **THEN** the cache is initialized as empty (no values to merge)
- **THEN** the sync proceeds with the source file only

### Requirement: user-managed-keys-definition
The system SHALL define a whitelist of keys that are considered user-managed and should be preserved across syncs.

#### Scenario: initial-whitelist
- **WHEN** the sync script runs
- **THEN** `USER_MANAGED_KEYS` contains at minimum: `enabledModels`
- **THEN** any key in this list that exists in the target but not in the source is preserved
- **THEN** any key in this list that exists in both target and source uses the **target** value (target wins)

### Requirement: post-sync-merge
The system SHALL merge the cached user-managed key values back into the synced settings.json after the source content is written.

#### Scenario: merge-after-write
- **WHEN** the filtered source settings.json has been written to the target path
- **THEN** the system reads the newly written file
- **THEN** for each key in `USER_MANAGED_KEYS`, if the cache contains a value, it overwrites the corresponding key in the merged result
- **THEN** the merged result is written back to the target path

#### Scenario: no-conflict-keys
- **WHEN** a user-managed key does not exist in the source settings.json
- **THEN** the cached value from the target is added to the merged result
- **THEN** this preserves user-added configuration that is not in the repo source

### Requirement: manifest-filter-priority
The system SHALL apply manifest filtering (packages whitelist, exclude_keys) **before** the merge step, ensuring that manifest governance is not bypassed by cached values.

#### Scenario: excluded-key-in-cache
- **WHEN** a key is in `exclude_keys` (manifest-level exclusion)
- **THEN** the key is removed during the manifest filter phase
- **THEN** even if the key was in the target cache, it is NOT merged back
- **THEN** manifest exclusions take priority over user-managed key preservation

### Requirement: atomic-write
The system SHALL write the final settings.json atomically to avoid corruption if the process is interrupted.

#### Scenario: write-failure
- **WHEN** the merge or write step fails
- **THEN** the system reports an error and exits with non-zero status
- **THEN** the target file is left in a valid state (either the pre-sync version or the successfully written merged version)
