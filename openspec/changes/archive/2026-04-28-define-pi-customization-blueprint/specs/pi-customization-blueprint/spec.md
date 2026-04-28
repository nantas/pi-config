# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-customization-blueprint`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户确认本次 change 需要形成一份整体定制目标规划蓝图，覆盖仓库角色、配置层级、能力域和分阶段演进路线，不进入扩展能力实现

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Blueprint Must Define Repository Role And Layering
The system SHALL define the Pi Config repository as both a personal Pi configuration hub and a reusable extension incubation workspace, and SHALL describe the responsibilities of global runtime, project-local Pi resources, and cross-agent shared resources.

#### Scenario: Repository role is documented
- **WHEN** the planning document describes the target architecture
- **THEN** it identifies the dual-role repository model and distinguishes `~/.pi/agent/`, project `.pi/`, `.agents/skills/`, and `.mcp.json` responsibilities

### Requirement: Blueprint Must Cover Core Capability Domains
The system SHALL document the target capability domains for `subagent`, `MCP`, automation scripts for install and config sync, reference collection, and extension lifecycle guidance.

#### Scenario: Capability map is present
- **WHEN** a reader reviews the planning document
- **THEN** the reader can locate all five core capability domains and understand why each belongs in the blueprint

### Requirement: Blueprint Must Define Phased Evolution
The system SHALL define a phased evolution path from baseline configuration planning to minimal usable Pi parity and then to reusable extension outputs.

#### Scenario: Roadmap phases are explicit
- **WHEN** the planning document presents the evolution path
- **THEN** it includes ordered phases with intent, scope, and transition criteria for later implementation changes
