# Specification: init-command

## Capability

- `init-command`: 在 Pi 中注册 `/init` 斜杠命令，通过 LLM 自主分析仓库结构、配置与惯例，创建或更新 AGENTS.md 文件

## Requirements

### Requirement: command-registration

The system SHALL register a `/init` slash command that is auto-discovered from `.pi/extensions/init-command.ts`.

#### Scenario: command-available-in-help
- **WHEN** the user lists available commands in Pi
- **THEN** `/init` SHALL appear with description "Initialize or update AGENTS.md for this repository"

#### Scenario: command-autoloaded
- **WHEN** Pi starts or `/reload` is run
- **THEN** the `/init` command SHALL be registered without requiring settings.json changes

### Requirement: command-accepts-arguments

The system SHALL accept optional focus arguments via `/init <focus-text>`.

#### Scenario: init-with-focus
- **WHEN** the user runs `/init focus on testing configuration`
- **THEN** the focus text SHALL be passed to the LLM as `$ARGUMENTS`, guiding the analysis toward testing-related aspects

#### Scenario: init-without-arguments
- **WHEN** the user runs `/init` without arguments
- **THEN** the LLM SHALL perform a comprehensive analysis covering all standard dimensions

### Requirement: repository-analysis

The system SHALL produce a prompt template that instructs the LLM to analyze the repository for AGENTS.md generation.

#### Scenario: analysis-scope
- **WHEN** the LLM receives the `/init` prompt
- **THEN** it SHALL investigate: README, build/test/lint/formatter configs, CI workflows, existing instruction files, monorepo structure, framework/toolchain quirks, repo-specific conventions, and testing quirks

#### Scenario: priority-order
- **WHEN** investigating the repository
- **THEN** the LLM SHALL prioritize: config files and manifests over random leaf files, and executable sources (configs, scripts) over prose documentation when conflicts arise

#### Scenario: evidence-gathering
- **WHEN** the LLM analyzes the repository
- **THEN** it SHALL use Pi built-in tools (`read`, `bash`, `write`, `edit`, `grep`, `ls`) to gather evidence, not rely on speculation or file-listing alone

### Requirement: agents-md-creation

The system SHALL instruct the LLM to create an AGENTS.md file at the repository root containing high-signal, repo-specific guidance.

#### Scenario: fresh-repo-no-agents
- **WHEN** no AGENTS.md exists in the repository
- **THEN** the LLM SHALL create one with repo-specific: developer commands, test commands, required command ordering, monorepo boundaries, framework/toolchain quirks, style conventions, and testing gotchas

#### Scenario: content-quality
- **WHEN** writing AGENTS.md
- **THEN** the LLM SHALL: prefer short sections and bullets, exclude generic advice/exhaustive file trees/obvious language conventions/speculative claims, and keep the file simple for simple repos

### Requirement: existing-agents-handling

The system SHALL handle existing AGENTS.md files with a structural comparison strategy.

#### Scenario: similar-structure
- **WHEN** an existing AGENTS.md has sections and format similar to the expected template structure
- **THEN** the LLM SHALL ask the user: "Existing AGENTS.md follows a similar structure. Update in-place preserving current sections?" before proceeding

#### Scenario: different-structure
- **WHEN** an existing AGENTS.md has a completely different structure from the expected template
- **THEN** the LLM SHALL warn the user: "Existing AGENTS.md uses a fundamentally different structure. Continuing will rewrite the file entirely. Proceed?" and ask for explicit confirmation

#### Scenario: in-place-improvement
- **WHEN** the user confirms in-place update
- **THEN** the LLM SHALL preserve verified useful content, delete stale/unverifiable claims, and reconcile with newly discovered codebase facts

### Requirement: dedup-and-session-shutdown

The extension SHALL follow the global dedup pattern with `globalThis` marker and `session_shutdown` cleanup.

#### Scenario: dedup-prevents-duplicate-registration
- **WHEN** the extension is loaded from both project-local (`.pi/extensions/`) and global (`~/.pi/agent/extensions/`) paths
- **THEN** the `globalThis` marker SHALL prevent duplicate registration

#### Scenario: session-shutdown-cleans-dedup-flag
- **WHEN** `/new`, `/reload`, or `/resume` triggers a session replacement
- **THEN** the `session_shutdown` handler SHALL delete the `globalThis` flag so the extension can re-register in the new session
