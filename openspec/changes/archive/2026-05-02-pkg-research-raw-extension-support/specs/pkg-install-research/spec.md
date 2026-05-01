# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-install-research`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: Phase 2 新增 raw extension 分支——跳过 `pi install -l`，改为检测扩展列表、检查 package.json 依赖、输出 `pi -e` 测试命令并等待用户确认

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Phase 2 Must Branch On Source Type
The system SHALL branch between the package install workflow and the raw extension research workflow based on source type detection at the beginning of Phase 2.

#### Scenario: package source goes through original install
- **WHEN** source type is package (has root `package.json`)
- **THEN** the system proceeds with the original Phase 2 workflow: `pi install -l`, structure analysis, dependency analysis, smoke test, conflict check, research summary

#### Scenario: raw extension goes through test-first workflow
- **WHEN** source type is raw extension (no root `package.json`, has `extensions/*.ts`)
- **THEN** the system executes the raw extension Phase 2 workflow

## ADDED Requirements

### Requirement: Phase 2 Raw Extension Workflow Must Follow Test-First Sequence
The system SHALL follow this sequence for raw extension Phase 2: list extensions → detect npm dependencies → resolve dependencies in temp → output test commands → wait for user feedback.

#### Scenario: complete raw extension workflow
- **WHEN** raw extension source is confirmed
- **THEN** the system:
  1. Lists all discovered extensions from `extensions/` directory
  2. For each extension, checks for `extensions/<name>/package.json`
  3. If `package.json` exists, runs `npm install` in that directory
  4. Outputs `pi -e` test commands for each extension using temp paths
  5. Asks user to test and report back

### Requirement: Phase 2 Must Not Modify .pi/ Directory For Raw Extensions
The system SHALL NOT copy, install, or modify any files under `.pi/` during Phase 2 when handling raw extensions. All testing is done via ephemeral `pi -e` from the temporary clone.

#### Scenario: no files written to .pi/
- **WHEN** executing raw extension Phase 2 workflow
- **THEN** no files are written to `.pi/extensions/`, `.pi/settings.json`, or any other `.pi/` path
- **AND** all testing uses the temporary clone path
