# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-security-review`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: Phase 1 clone 保留到 Phase 3，不复用创建，支持 raw extension Phase 2 复用同一 clone

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Security Review Clone Must Be Retained Through Phase 3
The system SHALL retain the temporary clone directory created in Phase 1 through the completion of Phase 3, instead of cleaning it up immediately after the security review.

#### Scenario: clone retained after Phase 1
- **WHEN** Phase 1 security review completes and user approves proceeding
- **THEN** the temporary clone directory is NOT cleaned up
- **AND** the clone path is recorded for Phase 2 reuse

#### Scenario: clone available for Phase 2
- **WHEN** Phase 2 raw extension branch begins
- **THEN** the system reuses the existing clone at `/tmp/<rand>/` for `pi -e` testing and npm dependency resolution

#### Scenario: clone cleaned up after Phase 3
- **WHEN** Phase 3 decision is executed (any of A/B/C)
- **THEN** the temporary clone directory is unconditionally removed

### Requirement: Security Review Must Report Clone Retention Plan
The system SHALL inform the user during the security review summary that the clone will be retained for testing in Phase 2.

#### Scenario: user told about clone retention
- **WHEN** Phase 1 security review summary is presented
- **THEN** the summary includes a note: "克隆保留用于 Phase 2 测试，在 Phase 3 决策完成后清理"
