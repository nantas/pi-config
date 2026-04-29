# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-install-research`
- 来源: `proposal.md` / 用户确认
- 变更类型: new
- 用户确认摘要: 安全审查通过后，项目级隔离安装（`pi install -l`），调研包结构、依赖、功能测试、冲突检查

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Project-Level Isolated Install
The system SHALL install the package into the project scope using `pi install -l <source>`, isolating it from the global Pi runtime. The system SHALL note that `pi install -l` automatically modifies `.pi/settings.json` by appending the package to the `packages` array; the Decision phase (Phase 3) handles retention or rollback of this modification.

#### Scenario: npm package project install
- **WHEN** the source is an npm package (e.g., `npm:@scope/pkg@version`)
- **THEN** the system SHALL execute `pi install -l <source>` which installs under `.pi/npm/`

#### Scenario: git package project install
- **WHEN** the source is a git package (e.g., `git:github.com/user/repo`)
- **THEN** the system SHALL execute `pi install -l <source>` which clones under `.pi/git/`

#### Scenario: install failure handling
- **WHEN** `pi install -l` fails with an error
- **THEN** the system SHALL report the error to the user and request decision: retry, skip to backlog, or abort

### Requirement: Package Structure Analysis
The system SHALL analyze the installed package to identify its resource types, structure, and configuration.

#### Scenario: resource type identification
- **WHEN** the package is successfully installed
- **THEN** the system SHALL identify which resource types the package provides: extensions, skills, prompts, and/or themes

#### Scenario: manifest-based structure
- **WHEN** the package has a `pi` manifest in `package.json`
- **THEN** the system SHALL parse and report the declared resource paths

#### Scenario: convention-based structure
- **WHEN** the package lacks a `pi` manifest but has convention directories
- **THEN** the system SHALL auto-discover and report resources from `extensions/`, `skills/`, `prompts/`, `themes/` directories

### Requirement: Dependency Analysis
The system SHALL analyze the package's dependency declarations.

#### Scenario: runtime dependency listing
- **WHEN** `package.json` contains `dependencies`
- **THEN** the system SHALL list all runtime dependencies with their declared version ranges

#### Scenario: peer dependency check
- **WHEN** `package.json` contains `peerDependencies`
- **THEN** the system SHALL list all peer dependencies and verify they are satisfied by pi's bundled core packages

#### Scenario: bundled dependency detection
- **WHEN** `package.json` contains `bundledDependencies`
- **THEN** the system SHALL flag bundled dependencies for special attention (bundled packages may contain duplicate or nested pi resources)

### Requirement: Functional Smoke Test
The system SHALL perform a lightweight functional test to verify the package loads without errors.

#### Scenario: extension load test
- **WHEN** the package provides extensions
- **THEN** the system SHALL reference the pi-agent startup logs or equivalent mechanism to verify extensions register without errors

#### Scenario: skill registration test
- **WHEN** the package provides skills
- **THEN** the system SHALL verify skill files are structurally valid (contain proper YAML frontmatter or markdown structure)

#### Scenario: load error reporting
- **WHEN** any resource fails to load
- **THEN** the system SHALL report the specific error messages and affected files

### Requirement: Settings Modification Awareness
The system SHALL acknowledge that `pi install -l` modifies `.pi/settings.json` `packages` array, and SHALL defer retention/rollback decisions to the Decision phase.

#### Scenario: settings.json modification noted
- **WHEN** `pi install -l` completes successfully
- **THEN** the system SHALL note that `.pi/settings.json` has been updated with the package entry
- **AND** the system SHALL NOT treat this as a permanent decision; rollback is handled in Phase 3

### Requirement: Conflict Check
The system SHALL check the new package for conflicts with already-installed packages in `.pi/settings.json`.

#### Scenario: skill name collision
- **WHEN** the new package provides skills with names that overlap with existing skills
- **THEN** the system SHALL report the conflicting skill names and their sources

#### Scenario: extension path collision
- **WHEN** the new package provides extension files with paths that overlap with existing extensions
- **THEN** the system SHALL report the conflicting paths and their sources

#### Scenario: no conflicts found
- **WHEN** no resource name or path overlaps are detected
- **THEN** the system SHALL report that no conflicts were found

### Requirement: Research Summary Output
The system SHALL produce a structured research summary with all findings.

#### Scenario: complete research summary
- **WHEN** all research phases are complete
- **THEN** the system SHALL present a summary containing: package identity (source/version), resource inventory, dependency list, functional test results, conflict analysis, and overall assessment
