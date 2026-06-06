# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-search-config`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: tokenization.method 默认值改为 jieba；runtime 配置新增 FFF 相关参数

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Config Schema — Tokenization
The configuration SHALL support a `tokenization` section with `cn_min_chars` (minimum Chinese query length to trigger segmentation) and `method` (segmentation method identifier, default: `"jieba"`).

#### Scenario: jieba as default method
- **WHEN** `search:init` generates a default config OR validation processes the config
- **THEN** the default value of `tokenization.method` SHALL be `"jieba"` (previously `"intl_segmenter"`)

#### Scenario: Intl.Segmenter as opt-in alternative
- **WHEN** `tokenization.method` is set to `"intl_segmenter"`
- **THEN** the system SHALL use `Intl.Segmenter` instead of jieba

#### Scenario: Chinese segmentation threshold (unchanged)
- **WHEN** the query contains Chinese characters and the Chinese substring length is ≥ `cn_min_chars`
- **THEN** the system SHALL apply segmentation to tokenize the Chinese portion
- **WHEN** the Chinese substring length is < `cn_min_chars`
- **THEN** the Chinese substring SHALL be treated as a single token

### Requirement: Config Schema — Runtime
The configuration SHALL support a `runtime` section with `max_results`, `rg_timeout_ms`, `snippet_context_lines`, `snippet_preview_chars`, `fff_timeout_ms`, and `fff_page_size`.

#### Scenario: Runtime parameters for FFF backend
- **WHEN** `fff_timeout_ms` is set in config
- **THEN** it SHALL be used as the timeout for FFF `multiGrep()` calls (default: 5000)
- **WHEN** `fff_page_size` is set in config
- **THEN** it SHALL be used as the `pageSize` parameter for FFF `multiGrep()` calls, capping the number of returned matches (default: 200)

#### Scenario: RG timeout (retained for fallback)
- **WHEN** `rg_timeout_ms` is set in config
- **THEN** it SHALL be used when the system falls back to the rg backend (default: 15000)
