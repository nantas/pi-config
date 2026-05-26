# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-search-config`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 三 capability 清单已确认（obsidian-search-config / obsidian-search-tool / obsidian-tools-extension），用户指示继续

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Config File Loading
The system SHALL load search configuration from `search-config.yaml` located at the vault root directory during each session's first search invocation.

#### Scenario: Config file exists and is valid
- **WHEN** the first `obsidian_search` call is made in a session and `search-config.yaml` exists at the vault root
- **THEN** the system SHALL parse the YAML, validate it against the expected schema, and cache the resolved configuration in memory for the remainder of the session

#### Scenario: Config file is missing
- **WHEN** `search-config.yaml` does not exist at the vault root
- **THEN** the system SHALL return an error message instructing the agent to run `obsidian_cli search:init` to generate a default config, and SHALL NOT fall back to hardcoded defaults

#### Scenario: Config file is invalid YAML
- **WHEN** `search-config.yaml` contains malformed YAML
- **THEN** the system SHALL return an error message with the parse error details and the file path

#### Scenario: Config file has missing required fields
- **WHEN** `search-config.yaml` is valid YAML but missing required top-level keys (`search.scopes`, `search.ranking`, `search.tokenization`, `search.runtime`)
- **THEN** the system SHALL return an error message listing the missing keys

### Requirement: Config Schema — Scopes
The configuration SHALL support a `scopes` list where each entry defines a directory path relative to the vault root, a numeric weight affecting ranking, and a boolean `default` flag controlling whether the scope is searched by default.

#### Scenario: Default scope exclusion
- **WHEN** a scope has `default: false`
- **THEN** that scope SHALL NOT be searched unless explicitly included via the `scope` parameter in the search tool call

#### Scenario: Scope weight affects ranking
- **WHEN** search results are ranked
- **THEN** each result's score SHALL be multiplied by its originating scope's `weight` (via the `directory_weight` ranking factor)

### Requirement: Config Schema — Ranking
The configuration SHALL support ranking weight factors including filename match, content density, match position, and file size penalty.

#### Scenario: Filename match weighting
- **WHEN** a query token matches a filename exactly (without extension)
- **THEN** the result SHALL receive the `filename_exact` multiplier
- **WHEN** a query token is a substring of a filename
- **THEN** the result SHALL receive the `filename_partial` multiplier

#### Scenario: Match position weighting
- **WHEN** a matching line is within a frontmatter block (between `---` delimiters in lines 1-20)
- **THEN** the result SHALL receive the `match_position.frontmatter_title` multiplier if the match is on a `title:` line, `frontmatter_tags` if on a `tags:` line, or `frontmatter_other` for other frontmatter fields

#### Scenario: Heading match weighting
- **WHEN** a matching line is a Markdown heading (starts with `#`)
- **THEN** the result SHALL receive the `match_position.heading` multiplier

#### Scenario: Content density weighting
- **WHEN** a file has matching lines
- **THEN** the content density score SHALL be calculated as `1.0 + (match_lines / total_lines) * (content_density_max - 1.0)`, capped at `content_density_max`

#### Scenario: File size penalty
- **WHEN** a file's size in KB is below `file_size.min_kb` or above `file_size.max_kb`
- **THEN** the result SHALL receive a penalty multiplier of `0.5`

### Requirement: Config Schema — Tokenization
The configuration SHALL support a `tokenization` section with `cn_min_chars` (minimum Chinese query length to trigger segmentation) and `method` (segmentation method identifier).

#### Scenario: Chinese segmentation threshold
- **WHEN** the query contains Chinese characters and the Chinese substring length is ≥ `cn_min_chars`
- **THEN** the system SHALL apply `Intl.Segmenter` with `granularity: "word"` to tokenize the Chinese portion
- **WHEN** the Chinese substring length is < `cn_min_chars`
- **THEN** the Chinese substring SHALL be treated as a single token

#### Scenario: English tokenization
- **WHEN** the query contains ASCII/alphabetic words separated by whitespace
- **THEN** each whitespace-separated word SHALL become an individual token

### Requirement: Config Schema — Runtime
The configuration SHALL support a `runtime` section with `max_results`, `rg_timeout_ms`, `snippet_context_lines`, and `snippet_preview_chars`.

#### Scenario: Runtime parameters override defaults
- **WHEN** `max_results` is set in config
- **THEN** it SHALL cap the maximum number of returned results, unless a smaller `limit` is specified in the tool call parameters

#### Scenario: RG timeout
- **WHEN** an rg subprocess exceeds `rg_timeout_ms`
- **THEN** the process SHALL be killed and its partial results discarded, with a warning logged

### Requirement: Search Init Command
The system SHALL provide a `search:init` subcommand registered via `obsidian_cli` that generates a default `search-config.yaml` at the vault root.

#### Scenario: Generate default config
- **WHEN** `obsidian_cli search:init` is invoked
- **THEN** a `search-config.yaml` file SHALL be created at the vault root with sensible defaults (scopes: `10-wiki` 3.0, `20-synthesis` 2.0, `directive` 2.5, `templates` 1.0, `docs` 1.0, `30-raw` 0.3 [default:false]; ranking factors as designed; cn_min_chars: 4)

#### Scenario: Config already exists
- **WHEN** `obsidian_cli search:init` is invoked and `search-config.yaml` already exists
- **THEN** the system SHALL warn and exit without overwriting, unless an `--overwrite` flag is provided
