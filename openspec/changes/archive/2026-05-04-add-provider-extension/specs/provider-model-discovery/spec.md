# Specification Delta

## Capability 对齐（已确认）

- Capability: `provider-model-discovery`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户要求 Extension 在收集到 base URL 和 API key 后，自动从 Provider 的 OpenAI-compatible `/v1/models` 端点拉取模型列表，并解析为 Pi 的 `ProviderModelConfig` 格式。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: models-endpoint-fetch
The system SHALL make an HTTP GET request to `{baseUrl}/models` with `Authorization: Bearer {apiKey}` header when an API key is provided.

#### Scenario: successful-discovery
- **WHEN** the user has provided base URL and API key
- **THEN** the system fetches `{baseUrl}/models`
- **THEN** the system parses the response as OpenAI-compatible models list (`{ data: Array<{ id: string }> }`)
- **THEN** the system maps each model to a `ProviderModelConfig` with sensible defaults

#### Scenario: no-api-key
- **WHEN** the user leaves API key empty
- **THEN** the system fetches `{baseUrl}/models` without Authorization header
- **THEN** proceeds with discovery if the endpoint is public

### Requirement: model-config-mapping
The system SHALL map each discovered model ID to a `ProviderModelConfig` with the following defaults:
- `name`: same as `id`
- `reasoning`: `false`
- `input`: `["text"]`
- `cost`: `{ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
- `contextWindow`: `128000`
- `maxTokens`: `4096`
- `api`: `"openai-completions"`

#### Scenario: default-mapping
- **WHEN** models are successfully discovered
- **THEN** each model is registered with the defaults above
- **THEN** the user is shown a summary: "Found N models: model-a, model-b, ..."

### Requirement: discovery-failure-handling
The system SHALL handle discovery failures gracefully, allowing the user to proceed with a single manually-specified model.

#### Scenario: endpoint-unreachable
- **WHEN** the `/models` endpoint returns non-2xx or is unreachable
- **THEN** the system notifies the user of the failure
- **THEN** the system prompts the user for a single model ID to register
- **THEN** the system registers that model with default config

#### Scenario: empty-model-list
- **WHEN** the `/models` endpoint returns an empty list
- **THEN** the system notifies the user
- **THEN** the system prompts the user for a single model ID to register
