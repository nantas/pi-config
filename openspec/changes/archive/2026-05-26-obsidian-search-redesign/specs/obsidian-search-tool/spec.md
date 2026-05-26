# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-search-tool`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 三 capability 清单已确认，用户指示继续

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Search Execution
The system SHALL use `rg` (ripgrep) as the primary search backend, executing parallel `rg` subprocesses for each configured scope directory. The CLI search path is removed as a code path.

#### Scenario: Parallel scope search
- **WHEN** an `obsidian_search` call is made without explicit `scope` parameter
- **THEN** the system SHALL spawn one `rg` subprocess per scope where `default: true`, searching within that scope's directory using the tokenized query pattern as a regex OR expression

#### Scenario: Explicit scope search
- **WHEN** an `obsidian_search` call includes a `scope` parameter
- **THEN** the system SHALL search only the specified scope directory, ignoring the default scope list

#### Scenario: No CLI dependency
- **WHEN** the system performs a search
- **THEN** it SHALL NOT invoke `obsidian search` or `obsidian search:context` CLI commands under any circumstances

### Requirement: Query Tokenization
The system SHALL tokenize multi-keyword queries into individual tokens for regex OR matching, using space-based splitting for English and `Intl.Segmenter` for Chinese when the Chinese substring exceeds the configured threshold.

#### Scenario: English-only query
- **WHEN** the query is `"DBG deck building synergy"`
- **THEN** the tokens SHALL be `["DBG", "deck", "building", "synergy"]` and the rg pattern SHALL be `DBG|deck|building|synergy`

#### Scenario: Mixed Chinese-English query
- **WHEN** the query is `"卡牌 synergy 设计模式"` and `cn_min_chars` is 4
- **THEN** the Chinese substring `"卡牌synergy设计模式"` has ≥ 4 characters, so Chinese segmentation applies: tokens SHALL be `["卡牌", "synergy", "设计", "模式"]` → rg pattern `卡牌|synergy|设计|模式`

#### Scenario: Short Chinese query (no segmentation)
- **WHEN** the query is `"卡牌"` (2 Chinese chars) and `cn_min_chars` is 4
- **THEN** the Chinese portion is below threshold, so `"卡牌"` SHALL be treated as a single token → rg pattern `卡牌`

#### Scenario: Special characters in tokens
- **WHEN** tokens contain regex-special characters
- **THEN** the system SHALL escape them for use in the rg pattern

### Requirement: Search Scope Resolution
The system SHALL resolve scope directories relative to the vault root path.

#### Scenario: Scope path relative to vault root
- **WHEN** a scope entry is `20-synthesis` and the vault root is `/Users/nantasmac/projects/my-wiki`
- **THEN** the rg search directory SHALL be `/Users/nantasmac/projects/my-wiki/20-synthesis`

#### Scenario: Scope path is explicit subdirectory
- **WHEN** the `scope` parameter is `20-synthesis/digest/游戏分析`
- **THEN** the rg search directory SHALL be resolved to `<vault-root>/20-synthesis/digest/游戏分析`, and the output path SHALL be correctly prefixed with the scope path (not stripped)

### Requirement: Result Deduplication
The system SHALL merge results from parallel scope searches, deduplicating by file path and keeping the entry with the most matching lines.

#### Scenario: Same file in multiple scopes
- **WHEN** a file appears in results from two different scopes (e.g., a link to `10-wiki/foo.md` also matched in `20-synthesis` via backlinks)
- **THEN** the entry with the higher match count SHALL be kept; the duplicate SHALL be discarded

### Requirement: Ranking Model
The system SHALL rank results by a composite score derived from filename match, directory weight, content density, match position, and file size penalty, all configured via the ranking section of `search-config.yaml`.

#### Scenario: Composite score calculation
- **WHEN** a result is ranked
- **THEN** its score SHALL be calculated as: `directory_weight * filename_bonus [* match_position_bonus] * content_density_bonus * file_size_penalty`, where each factor is determined by the matching characteristics of that result

#### Scenario: Multiple match positions in one file
- **WHEN** a single file has matches in both a heading line and body lines
- **THEN** the best (highest) match position multiplier among all matches SHALL be used

### Requirement: Snippet Generation
The system SHALL generate a snippet for each result consisting of a preview paragraph (first 200 characters after frontmatter) and a best-match excerpt (up to 3 matching lines with ±2 lines context).

#### Scenario: Preview paragraph
- **WHEN** a result's file is read for snippet generation
- **THEN** the system SHALL extract the first non-empty, non-frontmatter, non-heading paragraph of up to `snippet_preview_chars` characters as the preview

#### Scenario: Best-match excerpt
- **WHEN** a file has multiple matching regions
- **THEN** the system SHALL select the region with the highest density of matching lines and include ±`snippet_context_lines` of surrounding context

#### Scenario: Snippet in deep mode
- **WHEN** mode is `deep`
- **THEN** the system SHALL read the result file to generate the full preview and context snippet
- **WHEN** mode is `fast`
- **THEN** the system SHALL use the raw rg match line as the snippet without file reading

### Requirement: Tool Parameter Compatibility
The system SHALL maintain backward compatibility with the existing `obsidian_search` parameter schema (`query`, `vault`, `mode`, `limit`, `scope`).

#### Scenario: Existing parameters
- **WHEN** the tool is called with `query`, `vault`, `mode`, `limit`, or `scope`
- **THEN** each parameter SHALL behave as documented (query: tokenized keywords; vault: auto-detected or explicit; mode: fast/deep affects snippet depth; limit: max results; scope: directory override)

### Requirement: Tool Description Guidance
The tool's `promptGuidelines` SHALL guide agents to use bilingual queries and iterative refinement.

#### Scenario: Bilingual guidance
- **WHEN** the tool's prompt guidelines are injected into the agent context
- **THEN** they SHALL include: "Search with both English and Chinese keywords for better coverage" and "If results are few, retry with synonyms or translations of key terms"

#### Scenario: Scope guidance
- **WHEN** the tool's prompt guidelines are injected into the agent context
- **THEN** they SHALL include: "Use `scope` to narrow search to a specific subdirectory (e.g., '20-synthesis/digest/游戏分析')"

## REMOVED Requirements

### Requirement: CLI Search as Primary Backend
**Reason**: The Obsidian CLI `search` command has a known upstream bug (race condition on vaults > ~2,700 files) causing silent empty returns. It has been replaced by rg as the sole backend.
**Migration**: No caller migration needed — the tool interface is unchanged. Internal execution path is replaced.

### Requirement: Fallback Search
**Reason**: The previous two-tier design (CLI search → fallback rg) is replaced by a single rg-based path. The fallback concept is eliminated since rg is now the primary and only backend.
**Migration**: The `runFallbackSearch` function is removed. Its rg invocation logic is promoted to the primary `searchToolExecute` path with correct tokenization and path resolution.
