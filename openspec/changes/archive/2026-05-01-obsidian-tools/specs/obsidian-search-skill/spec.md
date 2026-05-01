# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-search-skill`
- 来源: `proposal.md` — 用户于 Phase A/B 设计讨论确认
- 变更类型: `new`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Skill File Registration

The system SHALL provide a skill named `obsidian-search` at `.pi/skills/obsidian-search/SKILL.md`.

The skill SHALL declare in its frontmatter:

```yaml
name: obsidian-search
description: Intelligent Obsidian vault retrieval via obsidian_search and obsidian_cli tools
```

The skill SHALL be auto-discovered by Pi's skill system.

#### Scenario: Skill appears in available skills

- **WHEN** pi starts with the extension loaded
- **THEN** `obsidian-search` appears in the available skills list

---

### Requirement: Trigger Conditions

The skill SHALL instruct the LLM on when to trigger `obsidian_search`, covering the following conditions:

1. A term or topic is not present in the current conversation context
2. The user asks to retrieve or locate vault content
3. The user references a vault-specific entity (project name, research topic, document reference)
4. The answer depends on vault-stored facts that are not in the current context

The skill SHALL also instruct when NOT to trigger:
- The answer is fully contained in the current conversation context
- The user provides a complete, unambiguous file path and asks to read it directly

#### Scenario: Term out of context triggers retrieval

- **WHEN** user mentions "OrbitOS retrieval pipeline" and the current context has no information about OrbitOS
- **THEN** the skill SHALL guide the LLM to call `obsidian_search({ query: "OrbitOS retrieval pipeline" })`

#### Scenario: Context already sufficient

- **WHEN** user asks about something already discussed and documented in the current conversation
- **THEN** the skill SHALL indicate that retrieval may be skipped

---

### Requirement: Query Optimization Guidance

The skill SHALL instruct the LLM to preprocess the user's natural language question into optimized keywords before calling `obsidian_search`.

Guidance SHALL include:
1. Extract key entities (project names, module names, concepts)
2. Extract action/behavior words (design, benchmark, pipeline, architecture)
3. Combine into a concise keyword string (not a full sentence)
4. Infer scope when possible from the question context
5. **Cross-language conversion**: When the vault's dominant language differs from the user's query language, also try English keywords or synonyms. For example, "牌组构筑" → try "deck building" / "deckbuilding"

#### Scenario: Natural language to keywords

- **WHEN** user asks "上次做的那个 Obsidian CLI benchmark 的结果是什么"
- **THEN** the skill SHALL guide LLM to convert to query "Obsidian CLI benchmark 结果" with scope "30_研究/知识库"

#### Scenario: Chinese query needs English fallback

- **WHEN** user asks "牌组构筑游戏机制的相关解释" in a vault where content is primarily English
- **THEN** the skill SHALL guide LLM to first try the original Chinese query, and if 0 results are returned, retry with English equivalents: "deck building" / "deckbuilding"

---

### Requirement: Mode Selection Guidance

The skill SHALL instruct the LLM on choosing between `mode: "fast"` and `mode: "deep"`:

- **fast**: 定位型问题、已知存在某个页面、快速确认
- **deep**: 需要了解关联页面、追溯决策链路、探索邻接上下文

The skill SHALL note that the tool auto-upgrades from fast to deep when confidence is low, so the LLM does not need to pre-empt this.

#### Scenario: Locate a specific document

- **WHEN** user asks "找一下 OrbitOS 的项目首页"
- **THEN** the skill SHALL guide using mode="fast"

#### Scenario: Explore decision chain

- **WHEN** user asks "OrbitOS 的 CLI 融合工作流是怎么决定最终策略的"
- **THEN** the skill SHALL guide using mode="deep" to surface backlinks and related context

---

### Requirement: Result Consumption Guidance

The skill SHALL instruct the LLM on how to consume `obsidian_search` results:

1. Check `details.mode`: "fallback" means lower confidence, results from text search
2. Use `topk[0]` as the primary candidate
3. When topk has multiple high-score entries, present a ranked list to the user
4. When the result is promising but the snippet is insufficient, call `obsidian_cli` or `read` to get the full file content
5. When all scores are low (all < 0.4), suggest reframing the query
6. **Zero-result recovery**: When `obsidian_search` returns empty `topk` (0 results):
   a. First try English/synonym equivalents of the original keywords
   b. If still empty, use `obsidian_cli({ command: "tags" })` to discover the vault's tag taxonomy, then retry with discovered tags
   c. If tags also yield nothing, the term likely doesn't exist in this vault — inform the user and suggest alternative search locations

#### Scenario: High confidence single result

- **WHEN** topk[0].score is 0.91 and other scores are below 0.5
- **THEN** the skill SHALL guide the LLM to treat topk[0] as the definitive answer and present it directly

#### Scenario: Low confidence across all results

- **WHEN** all topk entries have score < 0.4
- **THEN** the skill SHALL guide the LLM to inform the user and suggest query refinement

#### Scenario: Zero results — cross-language retry

- **WHEN** `obsidian_search` returns empty topk for a Chinese query in an English vault
- **THEN** the skill SHALL guide the LLM to retry with English keywords before reporting failure

---

### Requirement: Routing Collaboration

The skill SHALL describe how retrieval results feed into subsequent actions:

- `retrieve` intent: present results directly, optionally offer to read full files
- `update` intent: retrieve → confirm target → use `obsidian_cli` or `edit` to update
- `summarize` intent: retrieve → read full files → produce summary
- `archive` intent: retrieve → confirm → execute archival workflow

#### Scenario: Retrieve and update workflow

- **WHEN** user asks to update a project's status and the project page is not in context
- **THEN** the skill SHALL guide: find the project page → read full content → update the status

---

### Requirement: Usage Examples

The skill SHALL provide at least 3 complete workflow examples demonstrating end-to-end retrieval scenarios.

Each example SHALL show:
1. User question (natural language)
2. Query preprocessing (keywords + scope)
3. Expected tool call parameters
4. How to interpret and present results

#### Scenario: Example — locate a project

- **WHEN** the skill is read by the LLM
- **THEN** it SHALL contain a complete example of locating a project page and reading its content
