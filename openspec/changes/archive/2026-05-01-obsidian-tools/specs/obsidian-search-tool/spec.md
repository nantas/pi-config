# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-search-tool`
- 来源: `proposal.md` — 用户于 Phase A/B 设计讨论确认
- 变更类型: `new`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Tool Registration

The system SHALL register a tool named `obsidian_search` with the following parameters:

- `query` (string, required): 检索意图，使用关键词组合
- `vault` (string, optional): 目标 vault 名称或路径；省略时按 vault-resolver 规则推断
- `mode` (string, optional, default "fast"): "fast" 仅关键词召回；"deep" 追加邻接上下文
- `limit` (number, optional, default 5, min 1, max 20): 返回结果数上限
- `scope` (string, optional): 限定检索目录路径

The tool SHALL emit promptSnippet and promptGuidelines instructing the LLM on when and how to use it.

#### Scenario: Tool appears in available tools list

- **WHEN** the extension is loaded at session_start
- **THEN** `obsidian_search` appears in the available tools list with TypeBox-validated parameters

#### Scenario: LLM invokes tool with minimal params

- **WHEN** LLM calls `obsidian_search({ query: "OrbitOS performance" })`
- **THEN** the tool executes with default mode="fast", limit=5, vault resolved from cwd

---

### Requirement: Input Sanitization

The system SHALL sanitize the `query` parameter before execution:

- Strip leading/trailing whitespace
- Truncate to 200 characters maximum
- Validate against regex `/^[\p{L}\p{N}\s:_\-.]+$/u` (allow Unicode letters, numbers, spaces, colons, underscores, hyphens, periods)

#### Scenario: Query exceeds 200 characters

- **WHEN** query is longer than 200 characters
- **THEN** the tool SHALL truncate to 200 characters and proceed

#### Scenario: Query contains invalid characters

- **WHEN** query contains characters outside the allowed set
- **THEN** the tool SHALL return an error with message indicating the invalid input

---

### Requirement: Vault Resolution

The system SHALL resolve the vault target using the `obsidian-vault-resolver` capability: explicit parameter → cwd-based detection → error.

#### Scenario: Vault explicitly passed

- **WHEN** vault parameter is provided as "obsidian-mind"
- **THEN** the tool SHALL use that vault directly without cwd-based detection

#### Scenario: CWD inside a vault with no explicit parameter

- **WHEN** vault parameter is omitted and cwd is inside an Obsidian vault
- **THEN** the tool SHALL detect and use the enclosing vault

#### Scenario: CWD not in any vault and no explicit parameter

- **WHEN** vault parameter is omitted and cwd is not inside any Obsidian vault
- **THEN** the tool SHALL return an error: "vault parameter required: current directory is not inside an Obsidian vault"

---

### Requirement: Preflight Caching

The system SHALL verify Obsidian CLI availability once per session and cache the result.

#### Scenario: First tool call in session

- **WHEN** `obsidian_search` is called for the first time in the current session
- **THEN** the tool SHALL run `obsidian vault="<target>" help` to verify CLI availability and cache the result (available/unavailable)

#### Scenario: Subsequent tool call in same session

- **WHEN** `obsidian_search` is called again in the same session
- **THEN** the tool SHALL use the cached preflight result without re-running the help command

#### Scenario: CLI unavailable

- **WHEN** preflight determines CLI is unavailable (spawn fails, timeout, non-zero exit)
- **THEN** the tool SHALL fall back to fallback search (rg) and set mode="fallback" in the result

---

### Requirement: Parallel Recall

The system SHALL execute recall commands in parallel for efficiency.

In CLI mode, the tool SHALL run:
```
Promise.all([
  obsidian vault="<vault>" search query="<query>" limit=20 format=json,
  scope ? obsidian vault="<vault>" search query="<query>" path="<scope>" limit=20 format=json : null
])
```

> ⚠ 实际输出格式：`obsidian search ... format=json` 返回 `string[]`（纯路径数组），而非 `{title, path, snippet, relevance}[]`。解析器应将每个字符串作为 path 使用，title 从文件名推导（不含扩展名），snippet 为空，relevance 默认 0.5。

#### Scenario: Fast mode recall with scope

- **WHEN** mode="fast" and scope is provided
- **THEN** the tool SHALL run both a vault-wide search and a scope-filtered search in parallel, merge results, and deduplicate by path

#### Scenario: Fast mode recall without scope

- **WHEN** mode="fast" and no scope provided
- **THEN** the tool SHALL run a single vault-wide search

---

### Requirement: Deterministic Scoring and Ranking

The system SHALL score and rank results programmatically without LLM involvement, using the following rules:

1. **base_score**: CLI relevance score from search output (default 0.5 if unavailable)
2. **Scope boost**: ×1.3 if path is within the scope directory
3. **File type boost**: ×1.1 if file is `.md`
4. **Known noise penalty**: ×0.6 if path contains `.json` extension or `10_日记/` segment
5. **Aggregation page penalty**: ×0.7 if path contains `Reports/` or ends with an aggregation page pattern
6. **Final sort**: descending by adjusted score, truncate to `limit`

#### Scenario: Results include noise files

- **WHEN** search results include a `.json` file with high CLI relevance
- **THEN** the penalty SHALL reduce its adjusted score, demoting it below `.md` results

#### Scenario: Scope-matched results

- **WHEN** scope is "20_项目/OrbitOS" and a result has path "20_项目/OrbitOS/design.md"
- **THEN** the scope boost SHALL be applied, promoting it above non-scope results

---

### Requirement: Automatic Upgrade to Deep Mode

The system SHALL automatically expand search context when confidence is low.

The tool SHALL upgrade from fast to deep internally when:
- `mode` is "deep" (explicit), OR
- `topk[0].score - topk[1].score < 0.15` (implicit confidence gap)

#### Scenario: Explicit deep mode

- **WHEN** mode="deep"
- **THEN** the tool SHALL always execute the expand phase after ranking

#### Scenario: Fast mode with low confidence gap

- **WHEN** mode="fast" and top1 adjusted score is 0.42 and top2 is 0.39
- **THEN** the gap (0.03) is below threshold (0.15), so the tool SHALL auto-trigger the expand phase

#### Scenario: Fast mode with clear winner

- **WHEN** mode="fast" and top1 adjusted score is 0.91 and top2 is 0.45
- **THEN** the gap (0.46) exceeds threshold, so the tool SHALL skip expand and return results immediately

---

### Requirement: Context Expansion (Expand Phase)

When upgrade is triggered, the system SHALL run three commands in parallel against the top result:

```
Promise.all([
  obsidian vault="<vault>" search:context query="<top1.title>" limit=3 format=json,
  obsidian vault="<vault>" backlinks path="<top1.path>" format=json,
  obsidian vault="<vault>" links path="<top1.path>"
])
```

> ⚠ 实际输出格式：`search:context format=json` 返回 `[{file, matches: [{line, text}]}]`；`backlinks format=json` 返回 `[{file: "path.md"}]`；`links` **不支持 `format=json`**，返回纯文本（每行一个路径）。解析器需按各命令实际格式分别处理。

Results SHALL be surfaced in `details.related` with keys `context`, `backlinks`, and `links_out`.

#### Scenario: Deep mode expansion

- **WHEN** expand phase executes with a valid top1 result
- **THEN** related.backlinks, related.links_out, and related.context SHALL be populated if the respective commands return data

#### Scenario: Expand commands fail

- **WHEN** one or more expand commands fail (timeout, non-zero exit)
- **THEN** the tool SHALL return partial related data with only the successful command results; missing fields SHALL be empty arrays

---

### Requirement: Output Structure

The system SHALL return a consistent structured output.

The `content` field SHALL contain a human-readable markdown summary of the top results.

The `details` field SHALL contain:

```typescript
{
  ok: boolean,
  mode: "cli" | "fallback",
  vault: string,
  effective_query: string,
  stats: { total_hits: number, returned: number, time_ms: number },
  topk: Array<{
    path: string,
    score: number,
    reason: string,
    snippet: string,
    metadata?: { type?: string, tags?: string[] }
  }>,
  related?: {
    context?: Array<{ path: string, snippet: string }>,
    backlinks?: Array<string>,
    links_out?: Array<string>
  }
}
```

#### Scenario: Fast mode successful search

- **WHEN** a fast mode search returns 3 results from 47 total CLI hits
- **THEN** details.stats.total_hits SHALL be 47, details.stats.returned SHALL be 3, details.topk SHALL have 3 entries, details.related SHALL be absent

#### Scenario: Deep mode with expansion data

- **WHEN** a deep mode search completes with backlinks and links data
- **THEN** details.related SHALL contain backlinks (array of strings) and links_out (array of strings)

---

### Requirement: Fallback Search

When Obsidian CLI is unavailable (determined by preflight), the system SHALL fall back to ripgrep:

```
rg -n "<query>" "<vault-path>/<scope-or-root>" --max-count=20
```

Results SHALL be parsed into the same topk structure with:
- `path`: relative to vault root
- `score`: 0.3 (low confidence, fallback source)
- `reason`: "fallback text search"
- `snippet`: matched line content

The mode SHALL be set to "fallback" in the result.

#### Scenario: Obsidian not running

- **WHEN** Obsidian application is closed and preflight fails
- **THEN** the tool SHALL execute rg fallback and return results with mode="fallback"

#### Scenario: Fallback with scope

- **WHEN** scope is "20_项目/OrbitOS" and fallback is active
- **THEN** rg SHALL search within the scope subdirectory: `<vault-path>/20_项目/OrbitOS`

---

### Requirement: Zero-Result Fallback

当 CLI search 返回 0 条结果时，系统应自动触发 rg fallback（而非仅返回空结果）。

#### Scenario: Chinese query in English vault

- **WHEN** query="牌组构筑" in an English vault and CLI search returns 0 matches
- **THEN** the tool SHALL automatically fall back to rg text search and return results with mode="fallback"

---

### Requirement: Timeout and Cancellation

The system SHALL enforce a maximum execution time and support cancellation via AbortSignal.

Each CLI command SHALL have a 25-second individual timeout. The overall tool execution SHALL have a 60-second hard limit.

#### Scenario: CLI command times out

- **WHEN** a single CLI spawn exceeds 25 seconds
- **THEN** the child process SHALL be killed with SIGTERM, and the error SHALL be surfaced in the result

#### Scenario: User aborts during search

- **WHEN** the AbortSignal is triggered during execution
- **THEN** all in-flight child processes SHALL be killed and the tool SHALL return an error result
