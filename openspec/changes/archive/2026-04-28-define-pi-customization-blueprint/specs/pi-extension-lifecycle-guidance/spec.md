# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-extension-lifecycle-guidance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户要求规划文档包含后续“新增自研 extension / 引入现有开源 extension”的工作流，但该工作流只覆盖 Pi 与 extension 相关知识、开发、部署约定，不替代 OpenSpec 工件流程

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Lifecycle Guidance Must Separate Intake And Authoring Paths
The system SHALL define separate guidance for introducing existing open-source Pi extensions and for authoring new custom extensions.

#### Scenario: Reader evaluates an existing extension
- **WHEN** the reader wants to add an existing extension
- **THEN** the planning document provides a distinct intake path with evaluation, compatibility, integration, and deployment checkpoints

#### Scenario: Reader plans a new extension
- **WHEN** the reader wants to create a custom extension
- **THEN** the planning document provides a distinct authoring path with knowledge inputs, development expectations, integration points, and deployment expectations

### Requirement: Lifecycle Guidance Must Preserve OpenSpec As Execution Artifact Source
The system SHALL state that extension lifecycle guidance does not replace OpenSpec proposal, design, tasks, verification, or writeback artifacts.

#### Scenario: Workflow boundaries are reviewed
- **WHEN** the planning document describes extension workflows
- **THEN** it explicitly limits the workflow to Pi and extension knowledge, development, and deployment conventions while leaving execution artifacts to OpenSpec

### Requirement: Lifecycle Guidance Must Define Deployment Surfaces
The system SHALL define where extension-related outputs are expected to land, including repository source locations, runtime deployment targets, and configuration touchpoints.

#### Scenario: Deployment boundary is documented
- **WHEN** a reader follows the lifecycle guidance
- **THEN** the reader can tell which outputs belong in the repository, which belong in `~/.pi/agent/`, and which are project-local resources
