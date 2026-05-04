# Specification Delta

## Capability 对齐（已确认）

- Capability: `provider-persistence`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户要求将用户添加的 provider 配置持久化，使得跨 session 重启后 Provider 仍然可用，无需重新执行 `/add-provider`。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: config-persistence
The system SHALL persist the complete provider configuration (name, baseUrl, apiKey, models array) using `pi.appendEntry()` after successful registration.

#### Scenario: successful-registration
- **WHEN** a provider is successfully registered via `/add-provider`
- **THEN** the system calls `pi.appendEntry({ type: "add-provider", config: { name, baseUrl, apiKey, models } })`
- **THEN** the persisted entry survives Pi restarts

### Requirement: session-start-reload
The system SHALL reload persisted provider configurations on every `session_start` event.

#### Scenario: session-restart
- **WHEN** a new session starts (including `/new`, `/reload`, `/resume`)
- **THEN** the system reads all persisted entries with `type: "add-provider"`
- **THEN** the system calls `pi.registerProvider(name, config)` for each persisted config
- **THEN** the user sees a notification: "Reloaded N custom provider(s)" if any were loaded

#### Scenario: no-persisted-providers
- **WHEN** a new session starts and no persisted provider entries exist
- **THEN** no action is taken, no notification is shown

### Requirement: deduplication-on-reload
The system SHALL avoid duplicate registration when a provider with the same name is already registered.

#### Scenario: provider-already-registered
- **WHEN** `session_start` reload attempts to register a provider whose name already exists
- **THEN** the system skips that provider (preserves the existing registration, which may be from `/add-provider` in the current session or from a previous reload)
- **THEN** no error is shown to the user
