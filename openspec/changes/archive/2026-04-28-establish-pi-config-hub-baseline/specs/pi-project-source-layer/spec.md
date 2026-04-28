# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-project-source-layer`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户确认 Phase 1 需要在 `pi-config` 中建立最小 `.pi/` 受管源码层，并将 `repo://pi-mono` 作为 Pi 配置行为的查询真源

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Project Source Layer Must Define Managed Pi Paths
The system SHALL define a minimal managed `.pi/` source layer in the repository and SHALL include `.pi/settings.json`, `.pi/extensions/`, `.pi/prompts/`, `.pi/themes/`, and `.pi/agents/` as the Phase 1 managed Pi paths.

#### Scenario: Managed project skeleton is established
- **WHEN** a reader inspects the Phase 1 baseline definition
- **THEN** the reader can identify the exact `.pi/` paths that belong to the repository-managed source layer

### Requirement: Project Source Layer Must Exclude Runtime State And Package Caches
The system SHALL exclude `.pi/skills/`, `.pi/npm/`, `.pi/git/`, runtime state files, authentication files, session data, and package caches from the Phase 1 managed repository baseline.

#### Scenario: Unmanaged paths are reviewed
- **WHEN** the Phase 1 baseline lists managed and unmanaged Pi resources
- **THEN** runtime state and install artifacts are explicitly treated as out of scope for repository management

### Requirement: Project Settings Baseline Must Stay Minimal
The system SHALL treat `.pi/settings.json` as the project-level configuration entrypoint and SHALL keep the Phase 1 baseline content minimal by using an empty object instead of duplicating default resource discovery paths.

#### Scenario: Project settings contract is documented
- **WHEN** the Phase 1 baseline describes the project settings file
- **THEN** it states that `.pi/settings.json` exists as a minimal contract file and relies on `pi-mono` default discovery behavior

### Requirement: Pi Mono Must Be The Configuration Query Authority
The system SHALL treat `repo://pi-mono` as the authoritative source for Pi configuration behavior, supported project-level resource locations, and settings semantics used by Phase 1 decisions.

#### Scenario: Configuration behavior is justified
- **WHEN** Phase 1 defines path conventions or settings behavior
- **THEN** those decisions are derived from `repo://pi-mono` source or documentation rather than locally invented conventions
