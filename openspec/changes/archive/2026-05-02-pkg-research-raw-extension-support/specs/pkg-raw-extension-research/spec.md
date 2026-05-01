# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-raw-extension-research`
- 来源: `proposal.md` — New Capabilities
- 变更类型: `new`
- 用户确认摘要: 支持从外部 git 仓库调研 raw extension，Phase 2 分支检测、clone 复用、pi -e 测试命令输出、npm 依赖检测

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Phase 2 Must Detect Source Type And Branch Accordingly
The system SHALL detect whether the source is a package type (has `package.json` at root) or a raw extension collection (has `extensions/*.ts` files but no `package.json` at root) before deciding the Phase 2 install/task workflow.

#### Scenario: package source detected
- **WHEN** the cloned source has a `package.json` at its root
- **THEN** the system proceeds with the original `pi install -l` workflow for Phase 2

#### Scenario: raw extension source detected
- **WHEN** the cloned source has an `extensions/` directory with `.ts` files and no `package.json` at root
- **THEN** the system switches to the raw extension branch for Phase 2

#### Scenario: neither package nor raw extension
- **WHEN** the source has neither `package.json` nor `extensions/` with `.ts` files
- **THEN** the system reports unrecognized source type and asks the user how to proceed

### Requirement: Phase 2 Raw Extension Branch Must List Discovered Extensions
The system SHALL list all discovered extension files from the `extensions/` directory in the cloned source, including file name, path, and a brief description from the reference documentation if available.

#### Scenario: extensions listed after clone
- **WHEN** raw extension source is detected
- **THEN** the system presents a structured list of extensions with name, path, and inferred purpose

### Requirement: Phase 2 Raw Extension Branch Must Check For Npm Dependencies
The system SHALL check each extension directory for a `package.json` file (at `extensions/<name>/package.json`) to determine if the extension has npm dependencies. If present, run `npm install` in that extension directory before providing test commands.

#### Scenario: extension has package.json
- **WHEN** `extensions/<name>/package.json` exists
- **THEN** the system executes `cd /tmp/<clone>/extensions/<name> && npm install` and reports dependencies installed

#### Scenario: extension has no package.json
- **WHEN** `extensions/<name>/package.json` does not exist
- **THEN** the system reports "no external dependencies" and proceeds

### Requirement: Phase 2 Raw Extension Branch Must Output Ephemeral Test Commands
The system SHALL output runnable `pi -e` commands using the temporary clone path for each extension, allowing the user to test functionality before any installation decision.

#### Scenario: test commands provided for single-file extensions
- **WHEN** the extension is a single `.ts` file
- **THEN** the test command is `pi -e /tmp/<clone>/extensions/<name>.ts`

#### Scenario: test commands provided for subdirectory extensions
- **WHEN** the extension has a subdirectory with `package.json`
- **THEN** the test command is `pi -e /tmp/<clone>/extensions/<name>/index.ts`

### Requirement: Phase 2 Raw Extension Branch Must Wait For User Test Feedback
The system SHALL explicitly ask the user to test each extension using the provided commands and confirm the functionality is satisfactory before proceeding to Phase 3.

#### Scenario: user confirms extension works
- **WHEN** the user reports testing was successful
- **THEN** the system proceeds to Phase 3 with the research results

#### Scenario: user reports extension failure
- **WHEN** the user reports the extension failed to load or function correctly
- **THEN** the system records the failure details and asks the user: retry with fixes, skip this extension, or abort the entire research
