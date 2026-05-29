# Specification Delta

## Capability 对齐（已确认）

- Capability: `dollar-skill-invoke`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 修复 `/new` 后 skill 注入失败回归，增加 stale runtime 防御

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Skill Discovery with Stale Runtime Defense
The system SHALL discover skills via `pi.getCommands()` as the primary source, with an independent filesystem skill index as fallback. When `pi.getCommands()` throws an error (including but not limited to stale runtime state after `/new`), the system SHALL catch the error and fall back to `_fileSystemSkillIndex` without propagating the exception. The fallback SHALL be transparent — no user-visible behavior change when the primary source works correctly.

#### Scenario: Primary source works normally
- **WHEN** `pi.getCommands()` returns a non-empty skill list
- **THEN** the system SHALL use `pi.getCommands()` as the sole skill source, and the filesystem index SHALL NOT be consulted

#### Scenario: Primary source returns empty
- **WHEN** `pi.getCommands()` returns an empty skill list (e.g., due to race condition during ResourceLoader initialization)
- **THEN** the system SHALL use the cached filesystem index built during `session_start`

#### Scenario: Primary source throws error (stale runtime)
- **WHEN** `pi.getCommands()` throws an error (e.g., `ExtensionRuntime` stale after `/new` session replacement)
- **THEN** the system SHALL catch the error, log it silently, and fall back to `_fileSystemSkillIndex`. The `handleContextInjection` function SHALL NOT throw, and skill injection SHALL proceed using the filesystem index

#### Scenario: Skill not found in primary source but exists on filesystem
- **WHEN** a `$skill-name` token matches via regex but `find()` against `pi.getCommands()` results returns undefined
- **THEN** the system SHALL attempt a secondary `find()` against the cached filesystem index before declaring the skill unknown

#### Scenario: Filesystem index not yet built
- **WHEN** the filesystem index is `null` (e.g., `session_start` not yet fired or failed) and `pi.getCommands()` returns empty
- **THEN** the system SHALL trigger an on-demand filesystem scan to build the index and use the result

#### Scenario: Both primary and filesystem sources fail
- **WHEN** `pi.getCommands()` throws AND `_fileSystemSkillIndex` is null or empty
- **THEN** `getSkills()` SHALL return an empty array, and `handleContextInjection` SHALL proceed with no skill matches (graceful degradation)
