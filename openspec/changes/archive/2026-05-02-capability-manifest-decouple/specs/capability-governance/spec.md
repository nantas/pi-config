# Specification Delta: capability-governance

## Capability 对齐（已确认）

- Capability: `capability-governance`
- 来源: `proposal.md` — New Capabilities
- 变更类型: `new`
- 用户确认摘要: 已确认 AGENTS.md 治理规则 + pkg-research/pi-extension-dev 工作流写入 capabilities.yaml

## 规范真源声明

- 本文件是 `capability-governance` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: AGENTS.md Must Require Capability Manifest Synchronization
The system SHALL add a governance rule to the repository's `AGENTS.md` (at the repository root) declaring that any addition, removal, or scope change of `.pi/` resources must update `.pi/capabilities.yaml` accordingly.

#### Scenario: AGENTS.md contains governance rule
- **WHEN** a contributor reads the repository's `AGENTS.md`
- **THEN** a section explicitly states that `.pi/capabilities.yaml` must be kept in sync with `.pi/` changes

#### Scenario: Rule covers all resource types
- **WHEN** the governance rule is read
- **THEN** it explicitly mentions extensions, skills, agents, and packages as resource types requiring manifest updates

### Requirement: Pkg-Research Skill Must Write To Capability Manifest On Decision
The system SHALL augment the `pkg-research` skill's Phase 3 (Decision) workflow to include a capabilities.yaml write step after the user makes a decision.

#### Scenario: Global decision writes to global packages
- **WHEN** the user chooses Option A (global config) for a package
- **THEN** the workflow appends the package source to `global.settings.packages` in `.pi/capabilities.yaml`

#### Scenario: Backlog decision writes to catalog packages
- **WHEN** the user chooses Option B (backlog) for a package
- **THEN** the workflow adds a new entry to `catalog.packages` in `.pi/capabilities.yaml` with `type: "settings-entry"`

#### Scenario: Discard decision does not write to manifest
- **WHEN** the user chooses Option C (discard) for a package
- **THEN** the workflow does not modify `.pi/capabilities.yaml`

#### Scenario: Global package already in catalog
- **WHEN** a package being promoted to global already exists in `catalog.packages`
- **THEN** the workflow removes it from `catalog.packages` and adds it to `global.settings.packages`

### Requirement: Pi-Extension-Dev Skill Must Write To Capability Manifest On Deployment
The system SHALL augment the `pi-extension-dev` skill's Phase F (Deployment + Archive) to include a capabilities.yaml write step based on the extension's scope decision.

#### Scenario: Global extension writes to global extensions
- **WHEN** the extension is designated as global scope
- **THEN** the workflow adds the extension name to `global.extensions` in `.pi/capabilities.yaml`

#### Scenario: Optional extension writes to catalog extensions
- **WHEN** the extension is designated as optional scope
- **THEN** the workflow adds a new entry to `catalog.extensions` in `.pi/capabilities.yaml`

#### Scenario: Extension entry includes metadata
- **WHEN** a catalog extension entry is created
- **THEN** it includes `name`, `source`, `description`, and `has_package_json` (if applicable)

### Requirement: Capability Manifest Must Stay Consistent After Skill Workflow Changes
The system SHALL ensure that after `pkg-research` or `pi-extension-dev` modifies `.pi/capabilities.yaml`, the file remains valid YAML and all sections are structurally intact.

#### Scenario: Manifest is valid after write
- **WHEN** a skill workflow writes to `.pi/capabilities.yaml`
- **THEN** the resulting file is parseable as valid YAML

#### Scenario: Manifest preserves non-modified sections
- **WHEN** a skill workflow writes to one section of the manifest
- **THEN** other sections remain unchanged
