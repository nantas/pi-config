# Specification Delta

## Capability 对齐（已确认）

- Capability: `models-manifest-governance`
- 来源: `proposal.md` / 用户确认（用户通过 /opsx-propose 确认按推荐方案：单 capability，manifest 治理路径）
- 变更类型: `new`
- 用户确认摘要: 用户选定方案 A（capabilities.yaml 新增 `global.models` 段 + sync 脚本渲染 models.json，preserve 未声明 provider），deepseek Responses 配置作为首个托管 provider

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: manifest-declares-shared-models
The system SHALL allow `.pi/capabilities.yaml` to declare cross-device provider definitions under a `global.models` section, where each entry is a provider name mapping to a provider configuration containing at least `models` (array of model definitions), and MAY contain `apiKey` (env-var reference only), `baseUrl`, `api`, `headers`, and `compat` following the `models.json` provider schema.

#### Scenario: declare-deepseek-responses-provider
- Given a `.pi/capabilities.yaml` with a `global.models` entry for provider `deepseek` defining model `deepseek-v4-flash` with `api: "openai-responses"` and `baseUrl: "https://api.deepseek.com"`,
- When the manifest is parsed,
- Then the provider configuration is available to the sync script for rendering into `~/.pi/agent/models.json`.

#### Scenario: forbid-plaintext-api-keys
- Given a `global.models` entry that would contain a literal API key,
- When the manifest is authored,
- Then the value MUST reference an environment variable (e.g. `$DEEPSEEK_API_KEY`); plaintext secrets SHALL NOT be committed to the manifest.

### Requirement: sync-renders-models-json
The sync script `scripts/sync-pi-agent.sh` SHALL render `~/.pi/agent/models.json` from the manifest: providers declared in `global.models` are authoritative (the target entry for that provider is replaced wholesale), while providers NOT declared in the manifest are preserved from the existing target file.

#### Scenario: manifest-provider-overrides-target
- Given the target `~/.pi/agent/models.json` contains a `providers.deepseek` entry,
- And the manifest declares `global.models.deepseek`,
- When the sync script runs,
- Then the target `providers.deepseek` entry is replaced with the manifest-defined configuration.

#### Scenario: undeclared-provider-is-preserved
- Given the target `~/.pi/agent/models.json` contains `providers.zhipuai-coding-plan`,
- And the manifest does not declare a `zhipuai-coding-plan` entry under `global.models`,
- When the sync script runs,
- Then the `providers.zhipuai-coding-plan` entry is preserved unchanged in the target file.

#### Scenario: non-json-target-is-safe
- Given the target `~/.pi/agent/models.json` is missing or unparseable,
- When the sync script runs,
- Then rendering proceeds with only the manifest-declared providers and does not fail the sync.

#### Scenario: atomic-write
- Given the sync script is rendering the models file,
- When the write occurs,
- Then the target file is written atomically (temp file + rename), matching the existing `render_settings_file` behavior.

### Requirement: deepseek-flash-uses-responses-api
The manifest-managed `deepseek` provider SHALL define `deepseek-v4-flash` to use the Responses API (`api: "openai-responses"`, `baseUrl: "https://api.deepseek.com"`) with reasoning enabled and a thinking level map exposing `low`, `high`, and `max`, so pi interacts with DeepSeek V4 Flash via the Responses API on all synced devices.

#### Scenario: flash-model-metadata-complete
- Given the manifest `global.models.deepseek` entry for `deepseek-v4-flash`,
- When pi loads the synced models.json,
- Then the model has `api: "openai-responses"`, `reasoning: true`, a context window of 1048576 tokens, and a `thinkingLevelMap` with `low`, `high`, and `max` mapped to provider values.

#### Scenario: pro-model-unaffected
- Given the manifest does not define `deepseek-v4-pro`,
- When pi loads the synced models.json,
- Then `deepseek/deepseek-v4-pro` remains available from pi's built-in catalog (Chat Completions), unchanged.

### Requirement: readme-reflects-models-governance
The repository README.md and docs/getting-started.md SHALL document the `global.models` manifest section and the sync-rendered models.json behavior, consistent with `capabilities.yaml`.

#### Scenario: readme-lists-models-section
- Given the change is implemented,
- When a user reads README.md,
- Then they find a description of the `global.models` manifest section and its sync behavior, with a source reference to `capabilities.yaml`.
