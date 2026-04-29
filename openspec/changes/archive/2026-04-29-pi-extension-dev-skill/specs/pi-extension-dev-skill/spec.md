# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-extension-dev-skill`
- 来源: `proposal.md` / 讨论中确认
- 变更类型: `new`
- 用户确认摘要: 用户确认 skill 放置在 `.pi/skills/pi-extension-dev/SKILL.md`，知识模式为引用型（指向 reference doc 和 pi-mono 源），产出为本仓库 `.pi/extensions/` 资产并通过 `scripts/sync-pi-agent.sh` 同步到全局，流程管控走完整 OpenSpec change

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Skill placement and discovery
The skill SHALL be located at `.pi/skills/pi-extension-dev/SKILL.md` within the pi-config repository, following the Agent Skills standard with valid YAML frontmatter (`name`, `description`). Pi SHALL auto-discover this skill when running from the pi-config working directory without requiring settings.json changes.

#### Scenario: Skill loads when pi runs from pi-config repo
- **WHEN** pi starts with the pi-config repository as working directory
- **THEN** `pi-extension-dev` appears in the available skills list and the LLM can load it via `read` or `/skill:pi-extension-dev`

#### Scenario: Skill does not require settings.json changes
- **WHEN** the skill is placed at `.pi/skills/pi-extension-dev/SKILL.md`
- **THEN** pi discovers it automatically without needing `skills` array entries in `.pi/settings.json`

### Requirement: Knowledge loading workflow
The skill SHALL instruct the LLM to load prerequisite knowledge in a specific order: first `docs/plans/pi-customization-reference.md` Section 3 (Extension System), then on-demand `packages/coding-agent/docs/extensions.md` from repo://pi-mono for detailed API reference. The skill SHALL NOT duplicate API documentation within its own content.

#### Scenario: Loading reference document
- **WHEN** the skill is activated for an extension development task
- **THEN** the LLM reads `docs/plans/pi-customization-reference.md` Section 3 to establish baseline extension system knowledge

#### Scenario: Loading pi-mono API details on demand
- **WHEN** the LLM needs detailed API information (e.g., specific event signatures, tool registration options)
- **THEN** the LLM reads the relevant section from `repo://pi-mono/packages/coding-agent/docs/extensions.md`

#### Scenario: Skill does not duplicate source docs
- **WHEN** the pi-mono extensions.md contains 2500+ lines of API documentation
- **THEN** the skill contains at most a compact quick-reference table pointing to source locations, not a copy of the full API

### Requirement: Requirements clarification phase
The skill SHALL guide the LLM through a structured requirements clarification before any design decisions. The clarification SHALL cover at minimum: what the extension does, what triggers it (event-driven vs tool-callable vs command), and what Pi ExtensionAPI surfaces it needs.

#### Scenario: Basic use case clarification
- **WHEN** user says "I want an extension that does X"
- **THEN** the skill prompts the LLM to ask the user: what exactly X should do, when it should activate, and what API surfaces are needed

#### Scenario: User already provides detailed requirements
- **WHEN** user describes the extension with clear trigger conditions and desired capabilities
- **THEN** the skill allows the LLM to proceed directly to design decisions without redundant clarification

### Requirement: Design decision guidance
The skill SHALL provide structured guidance for three key design decisions: (a) event selection from the 20+ Pi lifecycle events, (b) Tool vs Command vs Shortcut vs Flag selection matrix, and (c) file organization pattern (single file vs subdirectory vs package with dependencies). The skill SHALL reference specific sections of the pi-mono extensions.md for detailed event descriptions.

#### Scenario: Selecting the right event
- **WHEN** the extension needs to intercept tool calls
- **THEN** the skill guides the LLM to use `tool_call` event and references the tool events section in extensions.md

#### Scenario: Choosing between Tool and Command
- **WHEN** the extension's functionality could be either an LLM-callable tool or a user-typed command
- **THEN** the skill provides a decision matrix: Tool if the LLM needs to invoke it autonomously, Command if it's user-initiated

#### Scenario: Choosing file organization
- **WHEN** the extension requires an npm dependency
- **THEN** the skill guides the LLM to use the subdirectory + package.json pattern as documented in extensions.md

### Requirement: OpenSpec change integration
The skill SHALL require that extension development proceeds through the complete OpenSpec change workflow: `openspec-new-change` → proposal → specs → design → tasks → implementation → verification → archive. The skill SHALL NOT permit bypassing OpenSpec for any extension development task.

#### Scenario: Starting an extension development task
- **WHEN** the user confirms the design decisions
- **THEN** the skill instructs the LLM to create an OpenSpec change using the openspec-new-change skill, with a kebab-case name derived from the extension name

#### Scenario: Change artifacts are complete before implementation
- **WHEN** the OpenSpec change is created
- **THEN** the skill requires proposal, specs, design, and tasks artifacts to all be created and user-reviewed before any implementation code is written

### Requirement: Implementation guidance
The skill SHALL guide the LLM to place extension code in `.pi/extensions/<name>.ts` (single file) or `.pi/extensions/<name>/index.ts` (subdirectory). The skill SHALL reference the minimal extension template from `docs/plans/pi-customization-reference.md` Section 3 and the quick-start example from pi-mono extensions.md.

#### Scenario: Writing a simple single-file extension
- **WHEN** the extension requires no npm dependencies beyond `@mariozechner/pi-coding-agent` and `typebox`
- **THEN** the skill guides the LLM to create `.pi/extensions/<name>.ts` with the default export function pattern

#### Scenario: Writing an extension with npm dependencies
- **WHEN** the extension needs additional npm packages
- **THEN** the skill guides the LLM to create `.pi/extensions/<name>/` with `package.json`, run `npm install` in that directory, and place code in `index.ts`

#### Scenario: Settings.json is not modified unnecessarily
- **WHEN** the extension is placed in `.pi/extensions/`
- **THEN** the skill instructs the LLM to NOT add an extensions entry to `.pi/settings.json` since Pi auto-discovers this directory

### Requirement: Verification guidance
The skill SHALL guide the LLM through verification steps: (a) run the openspec-verify-change skill against the change, (b) test the extension with `pi -e .pi/extensions/<name>.ts`, and (c) verify hot-reload with `/reload`.

#### Scenario: Running functional verification
- **WHEN** implementation of the extension code is complete
- **THEN** the skill instructs the LLM to test with `pi -e .pi/extensions/<name>.ts` before proceeding to deployment

#### Scenario: OpenSpec verification
- **WHEN** functional testing passes
- **THEN** the skill instructs the LLM to run openspec-verify-change to validate change artifact completeness

### Requirement: Deployment sync guidance
The skill SHALL instruct the LLM to deploy the extension by running `./scripts/sync-pi-agent.sh` which copies `.pi/extensions/` to `~/.pi/agent/extensions/`. The skill SHALL reference the existing sync script without modifying it.

#### Scenario: Syncing extension to global runtime
- **WHEN** verification is complete and the extension is approved
- **THEN** the skill instructs the LLM to run `./scripts/sync-pi-agent.sh` to copy the extension from `.pi/extensions/` to `~/.pi/agent/extensions/`

#### Scenario: Sync script handles all managed paths
- **WHEN** `./scripts/sync-pi-agent.sh` is executed
- **THEN** extensions, settings, prompts, themes, and agents are all synced to `~/.pi/agent/` as a single operation

### Requirement: Archival guidance
The skill SHALL instruct the LLM to run openspec-archive-change after successful verification and deployment sync.

#### Scenario: Archiving the change after deployment
- **WHEN** the extension has been verified and synced
- **THEN** the skill instructs the LLM to run openspec-archive-change to finalize the change

### Requirement: Prohibition of settings.json changes for sync
The skill SHALL NOT instruct the LLM to directly modify `~/.pi/agent/settings.json` for extension deployment. All sync operations SHALL go through `./scripts/sync-pi-agent.sh`, preserving the managed-workflow constraint from AGENTS.md.

#### Scenario: Deploying an extension without touching global settings manually
- **WHEN** an extension needs to be available globally
- **THEN** the skill instructs the LLM to run the sync script, not to edit `~/.pi/agent/settings.json`
