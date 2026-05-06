# Specification Delta

## Capability 对齐（已确认）

- Capability: `getting-started-guide`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 用户确认创建面向初学者的六步入门工作流文档，放在 `docs/getting-started.md`，使用非 ollama 的 custom 供应商作为示例，install-from-pi-config 需说明是在其他仓库执行来安装 catalog 能力，openspec 工作流入口为 `.pi/prompts` 而非 `.agents/skills`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: six-step-onboarding-document
The system SHALL provide a standalone `docs/getting-started.md` document that guides beginners through six sequential steps to configure and sync pi-config capabilities.

#### Scenario: beginner-starts-with-non-pi-agent
- **WHEN** a beginner opens the pi-config repository with any coding agent
- **THEN** they can locate `docs/getting-started.md` from a prominent reference in `README.md`
- **AND** the document SHALL provide six clear steps: configure provider, configure enabledModels, review capabilities, confirm sync scope, execute global sync, verify environment

### Requirement: custom-provider-example-non-ollama
The system SHALL use a non-Ollama custom provider as the example in the custom provider configuration section.

#### Scenario: document-describes-custom-provider
- **WHEN** the document explains custom provider setup via `~/.pi/agent/models.json`
- **THEN** the example SHALL use a generic corporate proxy, API gateway, or third-party compatible endpoint (not Ollama)
- **AND** the example SHALL demonstrate `baseUrl`, `api`, `apiKey`, and `models` fields

### Requirement: install-from-pi-config-context
The system SHALL clearly state that `install-from-pi-config` is executed in *other* repositories to install capabilities from this repository's catalog.

#### Scenario: document-lists-extension-workflows
- **WHEN** the document lists available post-setup workflows
- **THEN** `install-from-pi-config` SHALL be described as: "run `$install <capability>` in your target repository to install capabilities listed in pi-config's catalog"
- **AND** it SHALL reference `.pi/capabilities.yaml` as the catalog source

### Requirement: openspec-workflow-entry-correct
The system SHALL reference the correct entry point for OpenSpec workflows.

#### Scenario: document-mentions-openspec
- **WHEN** the document mentions OpenSpec workflow capabilities
- **THEN** the entry point SHALL be stated as prompts installed via `.pi/prompts/` (e.g., `/opsx-new`, `/opsx-apply`)
- **AND** it SHALL NOT reference `.agents/skills/` as the entry point
