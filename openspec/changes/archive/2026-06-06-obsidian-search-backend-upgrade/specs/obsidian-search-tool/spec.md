# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-search-tool`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 搜索后端 rg→FFF + 中文分词 Intl.Segmenter→jieba

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Search Execution
The system SHALL use FFF (`@ff-labs/fff-node` → `FileFinder.multiGrep()`) as the primary search backend with pre-indexed in-process search, executing one multi-pattern search per vault. When FFF is unavailable, the system SHALL fall back to rg (ripgrep) with the same tokenized pattern.

#### Scenario: FFF primary search
- **WHEN** an `obsidian_search` call is made and the FFF `FileFinder` has been initialized successfully
- **THEN** the system SHALL call `finder.multiGrep(tokens, { pageSize: config.runtime.fff_page_size, timeout: config.runtime.fff_timeout_ms })` to search the entire vault index, then apply scope filtering as a post-filter on the result file paths

#### Scenario: FFF fallback to rg
- **WHEN** FFF `FileFinder` initialization fails or `multiGrep()` throws
- **THEN** the system SHALL fall back to spawning one `rg` subprocess per scope (same behavior as the previous rg-only implementation), with a warning logged

#### Scenario: Parallel scope search with FFF
- **WHEN** an `obsidian_search` call is made without explicit `scope` parameter
- **THEN** with FFF backend, the system SHALL search the entire FFF index and post-filter results to paths within default scopes (no subprocess parallelism needed)

#### Scenario: Explicit scope search with FFF
- **WHEN** an `obsidian_search` call includes a `scope` parameter
- **THEN** with FFF backend, the system SHALL search the entire FFF index and post-filter results to paths within the specified scope directory

### Requirement: Query Tokenization
The system SHALL tokenize multi-keyword queries into individual tokens for regex OR matching, using space-based splitting for English and **jieba** for Chinese when the Chinese substring exceeds the configured threshold. When jieba is unavailable, fall back to `Intl.Segmenter`.

#### Scenario: Chinese tokenization with jieba (primary)
- **WHEN** the query contains Chinese characters and the Chinese substring length is ≥ `cn_min_chars`
- **THEN** the system SHALL send the Chinese portion to the jieba Python worker process via stdin/stdout JSON line protocol, and use the returned tokens in the search pattern
- **AND** the tokenization SHALL correctly handle 2-character compound game design terms (e.g., `牌组构筑` → `["牌组","构筑"]`, `引擎构筑` → `["引擎","构筑"]`, `卡牌机制` → `["卡牌","机制"]`)

#### Scenario: jieba fallback to Intl.Segmenter
- **WHEN** the jieba Python worker fails to start, returns an error, or times out
- **THEN** the system SHALL fall back to `Intl.Segmenter('zh', {granularity: 'word'})` for Chinese segmentation

#### Scenario: jieba worker persistence
- **WHEN** multiple `obsidian_search` calls are made in the same session
- **THEN** the jieba Python worker process SHALL be reused across calls (started once per session)

### Requirement: Result Deduplication
The system SHALL merge results from scope-filtered FFF results (or rg fallback), deduplicating by file path and keeping the entry with the most matching lines.

#### Scenario: Same file in multiple scopes
- **WHEN** a file appears in results from two different scope filters
- **THEN** the entry with the higher match count SHALL be kept; the duplicate SHALL be discarded

### Requirement: Ranking Model
*(Unchanged — identical to previous spec. The composite score formula `directory_weight * filename_bonus * match_position_bonus * content_density_bonus * file_size_penalty` remains the same.)*

### Requirement: Snippet Generation
*(Unchanged — identical to previous spec. fast mode uses raw match lines; deep mode reads file for preview + context.)*

### Requirement: Tool Parameter Compatibility
*(Unchanged — backward-compatible parameter interface.)*

### Requirement: Tool Description Guidance
*(Unchanged — bilingual query guidance, scope guidance, retry guidance.)*
