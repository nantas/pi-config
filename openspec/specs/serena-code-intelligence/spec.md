# Specification Delta

## Capability 对齐（已确认）

- Capability: `serena-code-intelligence`
- 来源: `proposal.md` — New Capabilities
- 变更类型: `new`
- 用户确认摘要: 用户确认清单不变，继续创建 specs

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: serena-skill-created

The pi-config repository SHALL contain a skill at `.pi/skills/serena-code-intelligence/SKILL.md`
that provides complete usage guidance for the serena MCP tool.

#### Scenario: skill-exists
- **WHEN** the pi-config workspace is loaded
- **THEN** `.pi/skills/serena-code-intelligence/SKILL.md` exists and is loadable as a skill

#### Scenario: skill-listed-in-capabilities
- **WHEN** `.pi/capabilities.yaml` is inspected
- **THEN** the skill `serena-code-intelligence` appears in the `global.skills` list

### Requirement: lsp-skill-replaced

The pi-config repository SHALL remove the `lsp-code-intelligence` skill,
as it is replaced by the serena equivalent.

#### Scenario: old-skill-removed
- **WHEN** `.pi/skills/lsp-code-intelligence/` is inspected
- **THEN** the directory no longer exists

#### Scenario: old-skill-removed-from-manifest
- **WHEN** `.pi/capabilities.yaml` is inspected
- **THEN** `lsp-code-intelligence` no longer appears in `global.skills`

### Requirement: serena-skill-content

The serena-code-intelligence skill SHALL contain:

1. **Tool overview**: List serena tools and their purpose, categorized by role (navigation, editing, diagnostics, memory, project management)
2. **Usage decision table**: When to use serena tools vs when to use Pi built-in tools (grep, read, bash, gitnexus)
3. **Project initialization workflow**: step-by-step guidance for first-time project setup:
   - Creating/activating a serena project via `--project-from-cwd`
   - Running the `serena_onboarding` tool
   - Understanding and writing memories
4. **Code exploration workflow**: How to use `get_symbols_overview`, `find_symbol`, `find_declaration`, `find_referencing_symbols`, `find_implementations` in concert
5. **Code editing workflow**: How to use `replace_symbol_body`, `rename_symbol`, `insert_after_symbol`, `insert_before_symbol`, `replace_content` for safe symbol-level edits
6. **Diagnostics workflow**: When and how to use `get_diagnostics_for_file`
7. **Language server configuration reference**: How to adjust `.serena/project.yml` languages, ignored paths, and additional workspace folders

#### Scenario: skill-covers-tools
- **WHEN** the skill is read
- **THEN** it includes usage guidance for all 21 serena tools registered in the current config

#### Scenario: skill-covers-init
- **WHEN** the skill is read
- **THEN** it includes explicit steps for first-time project setup (project creation → activation → onboarding → memory writing)

#### Scenario: skill-has-decision-table
- **WHEN** the skill is read
- **THEN** it includes a clear decision table comparing serena tools vs Pi built-in tools (grep, read, lsp, gitnexus)

### Requirement: serena-onboarding-in-skill

The skill SHALL instruct agents to call `serena_onboarding` tool before using serena's code tools in a new project,
and to read/write memories as guided by the onboarding process.

#### Scenario: onboarding-step-included
- **WHEN** an agent reads the skill for the first time in a project
- **THEN** it is guided to call the `serena_onboarding` tool

#### Scenario: memory-usage-described
- **WHEN** the skill is read
- **THEN** it describes how to use `serena_read_memory`, `serena_write_memory`, `serena_list_memories`, `serena_edit_memory` tools for persisting project knowledge
