# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: grilling 收敛于 A2 方案——`--no-extensions` 后按 `fusionHarness.childExtensions` 配置追加 `-e` 显式注入扩展，使扩展注册的 provider（grok-build）在子进程可用；配置存 settings.json 的 fusionHarness 块。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Child Extension Injection
The system SHALL support injecting a configured set of extensions into fusion-harness child processes (ARCHITECT/BUILDER/FUSION/VALIDATOR), so that extensions that dynamically register providers (e.g., pi-xai registering the `grok-build` provider) remain functional inside children launched with `--no-extensions`.

The injection SHALL be driven by a `fusionHarness.childExtensions` setting (a list of package identifiers). For each identifier, the system SHALL resolve it to an installed extension entry path from the project-level and global settings packages, then append `-e <entry-path>` to the child's spawn arguments AFTER `--no-extensions`.

Extensions not found in installed packages, whose install directory does not exist, or whose `package.json` entry point cannot be resolved SHALL be silently skipped (no error, no spawn block) — a missing optional extension must never prevent a fusion run.

#### Scenario: Configured extension is injected into child spawn
- **WHEN** `fusionHarness.childExtensions` contains `"pi-xai"` AND `pi-xai` is installed (appears in project or global settings packages)
- **THEN** every child process spawned by runChild SHALL receive `-e <pi-xai-entry-path>` after `--no-extensions`
- **AND** the child process SHALL have the `grok-build` provider registered (via pi-xai's `api.registerProvider` call)
- **AND** a child spawned with `--model grok-build/grok-4.5` SHALL resolve the model successfully

#### Scenario: Empty or absent childExtensions changes nothing
- **WHEN** `fusionHarness.childExtensions` is absent, empty, or `[]`
- **THEN** child spawn arguments SHALL be identical to before this change (only `--no-extensions`, no `-e` injection)

#### Scenario: Configured extension not installed is skipped
- **WHEN** `fusionHarness.childExtensions` contains an identifier that matches no installed package in project or global settings
- **THEN** the system SHALL skip that identifier silently (no `-e` argument added for it)
- **AND** the spawn SHALL proceed normally with any other resolved extensions
- **AND** no error SHALL be raised to the user

#### Scenario: Extension entry path resolution uses package.json
- **WHEN** resolving an installed extension's entry path
- **THEN** the system SHALL read the extension's `package.json` and use `pi.extensions[0]` if present, otherwise `main`
- **AND** the resolved entry path SHALL be absolute and SHALL exist on disk before being passed to `-e`

#### Scenario: Injection applies to all child agent roles
- **WHEN** any child agent (ARCHITECT worker, BUILDER worker, FUSION, VALIDATOR, TRIAGE) is spawned
- **THEN** the `-e` injection SHALL apply uniformly — no role is exempt, because provider registration is needed by any role that may use a non-built-in provider model

## MODIFIED Requirements

### Requirement: Settings Configuration Block
The system SHALL support a `fusionHarness` configuration block that provides default values for architect model, builder model, architect thinking level, builder thinking level, and a `childExtensions` list declaring which installed extensions must be injected into child processes launched with `--no-extensions`.

For cross-repository defaults, the block SHALL be present under `.pi/capabilities.yaml` `global.settings.fusionHarness` with the values defined in **Global FusionHarness Defaults**. Project `.pi/settings.json` MAY retain a `fusionHarness` block as a local preference surface. CLI flags override settings; missing settings fall back to extension built-in defaults. The `childExtensions` default SHALL be `["pi-xai"]` at the global capability-table level (so that the grok-build provider works out-of-box for users who have pi-xai installed), and an empty array `[]` at the fork's built-in default (so users without pi-xai are unaffected).

#### Scenario: Global settings.json provides model defaults after deferred sync
- **GIVEN** an operator has later synced the capability table to `~/.pi/agent/settings.json`
- **WHEN** no `--architect` or `--builder` CLI flags are provided and no project override wins
- **THEN** the extension SHALL use the global `fusionHarness` values as settings defaults

#### Scenario: CLI flags override settings
- **GIVEN** settings provide an architect model
- **WHEN** `--architect <provider/model>` is passed
- **THEN** the CLI flag value SHALL take precedence over settings

#### Scenario: Missing settings block falls back to upstream defaults
- **GIVEN** no `fusionHarness` block is available in loaded settings
- **WHEN** no CLI flags are provided
- **THEN** the extension SHALL use its built-in defaults (upstream DEFAULT_ARCHITECT / DEFAULT_BUILDER)

#### Scenario: Capability-table apply does not require live global settings mutation
- **WHEN** global delivery is applied only in the capability table
- **THEN** writing `global.settings.fusionHarness` into `.pi/capabilities.yaml` SHALL satisfy the configuration-block delivery requirement for that apply
- **AND** live mutation of `~/.pi/agent/settings.json` MAY remain deferred until managed sync

#### Scenario: childExtensions defaults to empty at fork level
- **GIVEN** a `fusionHarness` block exists but has no `childExtensions` key
- **WHEN** child processes are spawned
- **THEN** no extensions SHALL be injected (behavior identical to pre-change), unless a global/project setting provides the list

#### Scenario: childExtensions global default includes pi-xai
- **WHEN** the capability table apply for global delivery is complete
- **THEN** `.pi/capabilities.yaml` `global.settings.fusionHarness.childExtensions` SHALL equal `["pi-xai"]`
- **AND** projects that inherit this default and have pi-xai installed SHALL get grok-build provider injection automatically
