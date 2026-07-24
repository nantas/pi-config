# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 两个 capability 确认（fusion-harness-integration + capability-manifest）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Extension Registration
The system SHALL register the fusion-harness extension as a Pi package in pi-config, making `/opinion`, `/fusion`, and `/auto-validate` slash commands available in Pi sessions without requiring `-e` or shell scripts.

#### Scenario: Extension auto-loaded on Pi startup
- **WHEN** Pi starts with fusion-harness listed in `.pi/settings.json` packages
- **THEN** the three slash commands (`/opinion`, `/fusion`, `/auto-validate`) SHALL be available without manual `-e` flag

#### Scenario: Extension loaded via fork with local modifications
- **WHEN** the package source is a local dev path during development
- **THEN** `/reload` in Pi TUI SHALL pick up code changes from the dev clone without requiring `pi install -l` or git push

### Requirement: Settings Configuration Block
The system SHALL support a `fusionHarness` configuration block in `.pi/settings.json` that provides default values for architect model, builder model, architect thinking level, and builder thinking level.

#### Scenario: Settings.json provides model defaults
- **GIVEN** `.pi/settings.json` contains:
  ```json
  "fusionHarness": {
    "architect": "deepseek/deepseek-v4-pro",
    "builder": "zhipuai-coding-plan/glm-5.2",
    "architectThinking": "high",
    "builderThinking": "medium"
  }
  ```
- **WHEN** no `--architect` or `--builder` CLI flags are provided
- **THEN** the extension SHALL use the settings.json values as defaults

#### Scenario: CLI flags override settings.json
- **GIVEN** settings.json sets `architect: "deepseek/deepseek-v4-pro"`
- **WHEN** `--architect anthropic/claude-sonnet-5` is passed
- **THEN** the CLI flag value SHALL take precedence over settings.json

#### Scenario: Missing settings block falls back to upstream defaults
- **GIVEN** settings.json has no `fusionHarness` block
- **WHEN** no CLI flags are provided
- **THEN** the extension SHALL use its built-in defaults (upstream DEFAULT_ARCHITECT / DEFAULT_BUILDER)

### Requirement: Artifact Persistence
The system SHALL store fusion harness run artifacts in `.scratch/fusion-harness/` within the session's working directory, instead of `/tmp/`.

#### Scenario: Artifacts persist across sessions
- **WHEN** a `/fusion` or `/auto-validate` command completes
- **THEN** intermediate artifacts (agent outputs, gate scripts, gate run logs) SHALL be written under `<cwd>/.scratch/fusion-harness/<run-id>/`

#### Scenario: Session data follows artifacts root
- **WHEN** persistent role sessions are stored
- **THEN** they SHALL use `ARTIFACT_ROOT/fusion-harness-sessions/<project-slug>/` rather than `/tmp/fusion-harness-sessions/`

### Requirement: Sub-agent Context Inheritance
The system SHALL allow child agents (ARCHITECT worker, BUILDER worker, FUSION, VALIDATOR, TRIAGE) to inherit the repository's skills and context files while preventing recursive extension loading.

#### Scenario: Child agent inherits skills and AGENTS.md
- **WHEN** a child agent is spawned for any fusion harness command
- **THEN** it SHALL be launched with skills and context files enabled (no `--no-skills` or `--no-context-files` flags)

#### Scenario: Child agent does not load extensions recursively
- **WHEN** a child agent is spawned
- **THEN** it SHALL be launched with `--no-extensions` to prevent fusion-harness from spawning child agents that spawn more child agents

#### Scenario: Child agent loaded via fork hosts no extraneous extensions
- **GIVEN** the fork modifies the upstream spawn to remove `--no-skills` and `--no-context-files`
- **WHEN** the fork is in development mode (local path)
- **THEN** `/reload` in Pi SHALL NOT cause recursive extension loading

### Requirement: FUSION Agent Output Path Compliance
The system SHALL instruct the FUSION agent to write all outputs to the run's artifacts directory, not to `/tmp/`.

#### Scenario: FUSION prompt specifies correct output path
- **WHEN** the FUSION merge prompt is constructed
- **THEN** it SHALL contain an explicit instruction to write all artifacts under `{{ARTIFACTS_DIR}}` rather than `/tmp`

#### Scenario: No contradictory path instructions
- **WHEN** the FUSION merge prompt template is rendered
- **THEN** it SHALL NOT contain any instruction suggesting `/tmp` as a default output location
