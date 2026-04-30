# Specification Delta

## Capability 对齐（已确认）

- Capability: `readme-documentation`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户确认 README 按数据类型（自定义扩展/外部包/治理工作流/技能/Agent/OpenSpec 等）分类展示，每项含功能说明与解决的问题

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: readme-structure-by-data-type

The README SHALL organize capabilities by data/source type rather than by feature domain.

#### Scenario: custom-extensions-section
- **WHEN** user reads the README
- **THEN** a section titled "自定义扩展" (Custom Extensions) SHALL list all `.pi/extensions/*.ts` files
- **AND** each extension SHALL include: 文件名、功能说明、解决的问题

#### Scenario: external-packages-section
- **WHEN** user reads the README
- **THEN** a section titled "外部 Pi 包" (External Pi Packages) SHALL list all packages in `.pi/settings.json` `packages` array
- **AND** each package SHALL include: 包名/来源、功能说明、解决的问题

#### Scenario: governance-workflows-section
- **WHEN** user reads the README
- **THEN** a section titled "工作流技能" (Workflow Skills) SHALL list agent-facing meta-skills
- **AND** OpenSpec workflow skills SHALL be summarized with a link to [OpenSpec](https://github.com/Fission-AI/OpenSpec) rather than listed individually

#### Scenario: agent-definitions-section
- **WHEN** user reads the README
- **THEN** a section titled "Agent 定义" (Agent Definitions) SHALL list all `.pi/agents/*.md` files and their roles

#### Scenario: openspec-section
- **WHEN** user reads the README
- **THEN** a section titled "OpenSpec 规划系统" SHALL reference OpenSpec with a link to [https://github.com/Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)

#### Scenario: configuration-and-sync-section
- **WHEN** user reads the README
- **THEN** sections SHALL cover `.pi/settings.json` baseline configuration and `scripts/sync-pi-agent.sh` sync mechanism

### Requirement: readme-problem-context

Each capability description SHALL include what problem it solves, not just what it does.

#### Scenario: problem-statement-in-entries
- **WHEN** a capability entry is written
- **THEN** it SHALL include both a functional description and a "解决的问题" subsection

### Requirement: readme-link-to-sources

The README SHALL link to the actual source files where each capability is implemented.

#### Scenario: source-file-links
- **WHEN** a capability entry references a file
- **THEN** the entry SHALL contain a relative path link to that file (e.g., `.pi/extensions/planner-toggle.ts`)
- **AND** if the capability has a spec in `openspec/specs/`, the entry SHALL also link to that spec

### Requirement: readme-architecture-overview

The README SHALL include an architecture overview explaining the repository's layered structure.

#### Scenario: layer-diagram
- **WHEN** user reads the architecture section
- **THEN** a diagram or structured list SHALL show the relationship between:
  - `.pi/` (Phase 1 managed Pi source)
  - `.agents/` (cross-agent shared resources)
  - `openspec/` (planning and execution contracts)
  - `docs/` (research and reference)
  - `scripts/` (automation)

### Requirement: readme-archived-changes

The README SHALL include a summary of archived changes as project evolution context.

#### Scenario: archived-changes-summary
- **WHEN** user reads the README
- **THEN** a brief section SHALL list the number of archived changes and their categories (extensions, packages, governance, etc.)
- **AND** link to `openspec/changes/archive/` for details
