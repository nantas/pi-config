# Design

## Context

The existing `obsidian_search` tool depends on Obsidian CLI's `search` command, which has a known upstream bug (race condition on vaults > ~2,700 files, causing silent empty returns). Our target vault (my-wiki) has 5,195 markdown files, fully triggering this bug. The fallback rg mechanism in the current code has its own critical defects: un-tokenized multi-keyword queries, broken scope path resolution, and hardcoded relevance scores.

The redesign replaces CLI search with rg as the sole backend and introduces a vault-level YAML configuration file to make ranking, scoping, and tokenization vault-adaptable rather than hardcoded.

Relevant specs: `specs/obsidian-search-config/spec.md`, `specs/obsidian-search-tool/spec.md`, `specs/obsidian-tools-extension/spec.md`.

## Goals / Non-Goals

**Goals:**
- Replace CLI search with rg as the single search backend (eliminate two-tier fallback design)
- Tokenize multi-keyword queries (space-split + Intl.Segmenter Chinese) for accurate OR matching
- Vault-level `search-config.yaml` for configurable scopes, ranking weights, tokenization, and runtime params
- `obsidian_cli search:init` command to generate default config files
- Match-position-aware ranking (frontmatter fields, headings, body content)
- Rich snippet output (paragraph preview + context match)
- Fix `globalThis` dedup guard violation
- Maintain backward-compatible tool parameter interface

**Non-Goals:**
- jieba Chinese segmentation (reserved as config extension point)
- Synonym mapping tables (agent guidance in tool description instead)
- Search index pre-build or caching (rg performance suffices)
- Changes to other CLI commands (backlinks, links, properties are unaffected)

## Decisions

### D1: Single rg backend, no fallback
**Decision**: Use rg as the only search path. Remove all CLI search code and the two-tier CLI→fallback design.

**Rationale**: CLI search is broken upstream with no ETA for a reliable fix. Maintaining a two-tier design adds complexity (two code paths, two result parsers, two relevance models) for no benefit when one path is always dead. A single rg path is simpler to reason about, debug, and optimize.

**Implementation**: `searchToolExecute` calls `rgSearch()` directly. `runFallbackSearch`, `parallelRecall`, and all CLI-command construction in `search-tool.ts` are removed.

### D2: Config file at vault root, not `.obsidian/`
**Decision**: Place `search-config.yaml` at the vault root (`<vault>/search-config.yaml`).

**Rationale**: The `.obsidian/` directory is Obsidian's internal config space. Our search config is a Pi-tool-specific artifact, not an Obsidian setting. Placing it at vault root makes it visible and editable alongside other repo-level config files (`pyrightconfig.json`, `AGENTS.md`).

### D3: Intl.Segmenter over jieba for Chinese tokenization
**Decision**: Use `Intl.Segmenter('zh', {granularity: 'word'})` as the initial Chinese tokenization method, with jieba reserved as a config-driven alternative.

**Rationale**: `Intl.Segmenter` is built into Node.js ≥ 18, requires zero dependencies, and executes synchronously. Its word-boundary accuracy for Chinese is adequate for search tokenization (where false splits are preferable to missed splits — rg will still match substrings). jieba requires Python runtime and `pip install`, adding complexity. The config field `tokenization.method` allows future opt-in to jieba without code changes.

**Trade-off**: `Intl.Segmenter` may over-segment compound terms (e.g., `"游戏设计"` → `["游戏", "设计"]`). This is acceptable because the OR pattern ensures both tokens match if either appears in text, and the compound form `"游戏设计"` is also present as a substring in text.

### D4: Lazy frontmatter detection via line position, not YAML parsing
**Decision**: Determine match position (frontmatter/heading/body) by inspecting the matched line's content and position within the file, using rg's `--line-number` output and a single `head -30` file read if needed. Do not parse full YAML frontmatter.

**Rationale**: The user clarified that frontmatter ranking is about _which field was matched_, not about _extracting field values_. Since rg searches text, a match on `title: NeonAbyss全景分析` is a match on a frontmatter `title` field — we only need to detect that the matched line is in frontmatter and starts with `title:`. No YAML parsing needed.

**Implementation**: After rg returns results, for each file's highest-scoring match:
1. If line number ≤ 20 and the raw match line matches `^[a-z_]+:`, classify as frontmatter field
2. If the raw match line matches `^#+\s`, classify as heading
3. Otherwise, classify as body content

### D5: Parallel rg per scope, merge-and-rank
**Decision**: Search all default scopes in parallel (each a separate `rg` subprocess), merge results by path, and rank globally.

**Rationale**: The user chose "merged ranking" over "priority serial." With ~2,000 files across default scopes, parallel rg is fast (< 2s total). Serial search would add unnecessary latency for the common case where high-value results span multiple scopes.

**Implementation**: `Promise.all(scopes.map(s => spawnRg(s)))` → merge by path (keep highest match count) → rank.

### D6: Tool description bilingual guidance instead of synonym table
**Decision**: Embed bilingual search guidance in the tool's `promptGuidelines` rather than maintaining a hardcoded synonym mapping table.

**Rationale**: The user explicitly preferred agent-side language adaptation over a maintained synonym table. The tool description guides the LLM to:
- Use both English and Chinese keywords in queries
- Retry with synonyms/translations if results are sparse
- Use `scope` to narrow searches to specific directories

This leverages the LLM's inherent translation capability, which is more flexible and lower-maintenance than a static mapping table.

## Risks / Migration

### Risk 1: rg availability
**Mitigation**: The existing code already has a `resolveRgPath()` function that checks multiple locations (`~/.pi/agent/bin/rg`, `/opt/homebrew/bin/rg`, `/usr/local/bin/rg`, PATH). This is promoted to the primary rg lookup. If rg is not found, the search tool returns a clear error with installation instructions.

### Risk 2: Intl.Segmenter quality on technical Chinese
**Mitigation**: When segmentation over-splits a term (e.g., `"桌游机制"` → `["桌游", "机制"]`), the OR pattern `桌游|机制` will still match `"桌游机制"` in text because rg does substring matching within regex alternation. False positives from individual words (e.g., `"机制"` matches many unrelated files) are handled by the ranking model (directory weight, content density).

### Risk 3: Config file drift
**Mitigation**: The `search:init` command generates a commented YAML file with documentation for each field. Users can adjust weights without understanding the internal ranking model. The config is read once per session, so changes take effect on the next session.

### Risk 4: Breaking existing vaults without config
**Mitigation**: The tool returns a clear error when config is missing, instructing the user to run `search:init`. No silent fallback to hardcoded defaults — this forces explicit configuration, which the user explicitly requested.

### Risk 5: Performance regression on first deep-mode search
**Mitigation**: Deep mode reads result files for snippet generation. With max 20 results, this means ≤ 20 file reads (~10-50KB each), which is under 200ms. Fast mode skips file reads entirely and uses raw rg match lines as snippets.
