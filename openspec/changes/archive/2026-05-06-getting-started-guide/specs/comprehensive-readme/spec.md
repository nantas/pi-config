# Specification Delta

## Capability 对齐（已确认）

- Capability: `comprehensive-readme`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 用户确认在 README 最开头增加「新手上路」章节引用，指向 `docs/getting-started.md`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: readme-getting-started-section
The system SHALL include a "新手上路" (Getting Started) section at the beginning of `README.md`, before the current architecture overview.

#### Scenario: beginner-opens-readme
- **WHEN** a user opens `README.md`
- **THEN** the first section after the title and short description SHALL be a "新手上路" section
- **AND** it SHALL contain a brief description of the six-step onboarding process
- **AND** it SHALL provide a direct link to `docs/getting-started.md`
- **AND** it SHALL state the prerequisite: "在开始之前，请确保你已经安装并可以运行 Pi"

### Requirement: readme-maintains-existing-structure
The system SHALL preserve all existing README sections and content after the new "新手上路" section.

#### Scenario: existing-readme-content
- **WHEN** the modified README is reviewed
- **THEN** all existing sections (架构分层概览, 核心能力, 工作流速查, 项目演进历史, etc.) SHALL remain intact
- **AND** their relative order SHALL not change
