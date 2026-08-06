# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-fff-env-config`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: modified
- 用户确认摘要: 用户实测 `PI_FFF_MODE=override` 下 `@` 补全与 pi-powerline 编辑器共存正常后，授权将取值从 `tools-only` 翻转为 `override`，以从工具注册层根除 fff 与内置 grep/find 的并存竞争

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: PI_FFF_MODE environment variable

The system SHALL configure `PI_FFF_MODE` to `override` in both the manifest declaration (`.pi/capabilities.yaml` `global.env.pi-fff.variables.PI_FFF_MODE.value`) and the runtime export (`~/.zshenv`).

- The value SHALL be `override`, causing pi-fff to register fff engine under the built-in tool names `grep`/`find` (replacing them) rather than as additional `ffgrep`/`fffind` tools
- The two layers (manifest declaration + shell export) SHALL carry identical values, since `global.env` is a declarative schema validated against `os.environ` by `sync-pi-agent.sh` and does not write files itself
- The variable description in `.pi/capabilities.yaml` SHALL document that the historical `setEditorComponent` conflict with pi-powerline is eliminated in pi-fff v0.10+ (migrated to the composable `addAutocompleteProvider` API)

#### Scenario: Manifest declaration value

- **WHEN** reading `.pi/capabilities.yaml` `global.env.pi-fff.variables.PI_FFF_MODE`
- **THEN** the `value` field SHALL be `override`
- **AND** the `description` SHALL reference the elimination of the historical setEditorComponent conflict and coexistence with pi-powerline

#### Scenario: Runtime shell export value

- **WHEN** reading `~/.zshenv`
- **THEN** it SHALL contain `export PI_FFF_MODE=override`

#### Scenario: Sync env check passes without mismatch

- **WHEN** `scripts/sync-pi-agent.sh` runs its environment check
- **THEN** the `pi-fff` capability SHALL NOT emit a `PI_FFF_MODE mismatch` warning
- **AND** the check SHALL report `OK: pi-fff (FFF_FRECENCY_DB, FFF_HISTORY_DB, PI_FFF_MODE)`

#### Scenario: Override tool registration in effect

- **WHEN** a new pi session starts with `PI_FFF_MODE=override`
- **THEN** the tool list SHALL contain `grep` and `find` powered by the fff engine
- **AND** the tool list SHALL NOT contain separate `ffgrep`/`fffind`/`fff-multi-grep` tool registrations
- **AND** the `@`-mention autocomplete SHALL coexist with pi-powerline's `PromptPrefixEditor` without one disabling the other

### Requirement: Fallback downgrade path

The system SHALL document `tools-and-ui` as the downgrade fallback if a future pi-powerline version reintroduces exclusive `setEditorComponent` behavior that breaks `@`-mention coexistence.

- `tools-and-ui` keeps fff UI (`@` autocomplete) and registers fff tools under `ffgrep`/`fffind` names but does NOT replace built-in `grep`/`find` — it reintroduces tool-list competition, so it is a degradation accepted only as a temporary workaround
- `tools-only` (the previous value) is explicitly excluded as a fallback because it disables fff UI entirely while still not resolving the competition

#### Scenario: Future powerline regression

- **WHEN** a pi-powerline upgrade causes `@`-mention autocomplete to stop working under `override`
- **THEN** the operator SHALL set `PI_FFF_MODE=tools-and-ui` in both layers as a temporary measure
- **AND** SHALL open a follow-up change to restore `override` once the root cause is addressed
