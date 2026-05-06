# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-guidance`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 用户确认在 AGENTS.md 中增加「初学者首次配置」使用情景描述和链接，指向 `docs/getting-started.md`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: agents-md-beginner-scenario
The system SHALL add a "初学者首次配置" scenario reference in `.pi/agent/AGENTS.md` under a dedicated section or within the existing Pi 供应商与模型配置 section.

#### Scenario: agent-encounters-beginner
- **WHEN** an agent session involves a user who is new to pi-config or needs complete setup guidance
- **THEN** the agent SHALL reference `AGENTS.d/pi-provider-model.md` for provider/model configuration details
- **AND** it SHALL reference `docs/getting-started.md` (via repo link or relative path) for the full onboarding workflow
- **AND** the reference SHALL be placed in a location that agents encounter when looking for provider/model guidance

### Requirement: agents-md-link-consistency
The system SHALL ensure all links in the modified AGENTS.md use consistent relative path conventions.

#### Scenario: link-verification
- **WHEN** the modified AGENTS.md is reviewed
- **THEN** the link to `docs/getting-started.md` SHALL use `repo://pi-config/docs/getting-started.md` or an equivalent consistent reference format
- **AND** existing links SHALL remain unchanged
