# Specification Delta

## Capability 对齐（已确认）

- Capability: `trellis-repo-guard`
- 来源: `proposal.md` Modified Capabilities
- 变更类型: modified
- 用户确认摘要: 在探索阶段确认，用户同意使用 `.trellis/config.yaml` 作为哨兵文件，非 Trellis 仓库静默跳过

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: repo-sentinel-check
The extension SHALL check for the existence of `.trellis/config.yaml` relative to `process.cwd()` before registering any event handlers, tools, or initiating data writes. If the sentinel file does not exist, the extension SHALL return immediately from the entry function without registering anything.

#### Scenario: trellis-repository-detected
- **WHEN** `process.cwd()` contains `.trellis/config.yaml`
- **THEN** the extension proceeds with full registration (event handlers, tools, JsonlWriter) as before

#### Scenario: non-trellis-repository
- **WHEN** `process.cwd()` does not contain `.trellis/config.yaml`
- **THEN** the extension returns immediately, no event handlers registered, no tools registered, no `.trellis/.analytics/` directory created

#### Scenario: missing-trellis-directory
- **WHEN** the `.trellis/` directory does not exist at all
- **THEN** the extension returns immediately (same as non-trellis-repository)

### Requirement: sentinel-file-specification
The sentinel file SHALL be `.trellis/config.yaml`. This file is created by `trellis init` and is the authoritative indicator that a repository is a Trellis-managed project. The extension MUST NOT use other files (such as `.version`, `.developer`, or directory existence) as the sentinel.

#### Scenario: config-yaml-present
- **WHEN** `.trellis/config.yaml` exists (even if empty)
- **THEN** the repository is considered a Trellis project and analytics proceeds

#### Scenario: config-yaml-missing-but-other-files-present
- **WHEN** `.trellis/` exists with other files (e.g., `.version`, `.developer`) but `config.yaml` is missing
- **THEN** the extension SHALL still return immediately — `config.yaml` is the sole sentinel

### Requirement: no-side-effects-on-skip
When the extension skips registration due to the sentinel check, there SHALL be zero side effects: no files created, no directories created, no global state mutated, no tools registered, no event listeners attached.

#### Scenario: clean-skip
- **WHEN** the sentinel check fails in a fresh Pi session
- **THEN** no `.trellis/` paths are accessed, no `globalThis` keys are set, no `pi.on()` or `pi.registerTool()` calls are made

### Requirement: dedup-guard-ordering
The sentinel check SHALL execute before the dedup guard (`globalThis.__pi_ext_trellis_analytics_loaded`). In non-Trellis repositories, even the dedup key MUST NOT be set.

#### Scenario: non-trellis-no-dedup-key
- **WHEN** the sentinel check fails
- **THEN** `globalThis.__pi_ext_trellis_analytics_loaded` is not set, ensuring no state leakage
