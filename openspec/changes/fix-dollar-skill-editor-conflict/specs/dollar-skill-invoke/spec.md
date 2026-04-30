# Specification Delta

## Capability 对齐（已确认）

- Capability: `dollar-skill-invoke`
- 来源: `proposal.md` / 需求确认
- 变更类型: modified
- 用户确认摘要: 修复 `input` handler 在 `session_start` 内累积注册的 bug，改为顶层注册

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Input Handler Single Registration
The system SHALL register the `input` event handler **once** at extension load time (top level of the `export default function`), NOT inside `session_start` or any per-session lifecycle handler.

#### Scenario: No handler accumulation across sessions
- **WHEN** the user creates a new session (`/new`) or the session is replaced
- **THEN** only ONE `input` event handler SHALL be active for this extension (not accumulated copies from previous sessions)

#### Scenario: Handler works across sessions
- **WHEN** the user submits text containing `$skill-name` in any session
- **THEN** the single `input` handler SHALL process the text and return the transformed `<skill>` block
