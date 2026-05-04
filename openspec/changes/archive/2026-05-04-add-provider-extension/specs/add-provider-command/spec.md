# Specification Delta

## Capability 对齐（已确认）

- Capability: `add-provider-command`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户要求创建 `/add-provider` 交互式命令，通过 Extension 注册，引导用户输入 provider 名称、API key、base URL，并自动发现模型列表。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: command-registration
The system SHALL register a `/add-provider` command via `pi.registerCommand()` in the Extension entry point.

#### Scenario: command-available
- **WHEN** the Extension is loaded
- **THEN** the `/add-provider` command is available in the command palette and accepts no positional arguments

### Requirement: interactive-prompt-sequence
The system SHALL prompt the user sequentially for: provider name, base URL, and API key.

#### Scenario: valid-inputs
- **WHEN** the user invokes `/add-provider`
- **THEN** the system prompts for provider name (free text, validated non-empty)
- **THEN** the system prompts for base URL (free text, default suggestion `http://localhost:1234/v1`, validated as URL-like)
- **THEN** the system prompts for API key (free text, optional — empty means no key)
- **THEN** the system proceeds to model discovery using the collected inputs

#### Scenario: user-cancels
- **WHEN** the user cancels any prompt (e.g., presses Escape)
- **THEN** the command aborts gracefully with an informational message and no side effects

### Requirement: provider-name-validation
The system SHALL validate that the provider name is non-empty and does not conflict with internal reserved identifiers in a way that would break `pi.registerProvider()`.

#### Scenario: empty-name
- **WHEN** the user submits an empty provider name
- **THEN** the system re-prompts or aborts with an error message
