# Specification Delta

## Capability 对齐（已确认）

- Capability: `agent-guidance-simplify`
- 来源: `proposal.md` — Modified Capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户确认清单不变，继续创建 specs

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: agents-d-pruned

The following files SHALL be deleted from `.pi/agent/AGENTS.d/`:

- `lsp-guide.md` — replaced by `serena-code-intelligence` skill
- `tool-ask-user.md` — content no longer needed
- `output-quality.md` — content no longer needed
- `tool-mcp.md` — content no longer needed

#### Scenario: lsp-guide-removed
- **WHEN** `.pi/agent/AGENTS.d/lsp-guide.md` is inspected
- **THEN** the file no longer exists

#### Scenario: tool-ask-user-removed
- **WHEN** `.pi/agent/AGENTS.d/tool-ask-user.md` is inspected
- **THEN** the file no longer exists

#### Scenario: output-quality-removed
- **WHEN** `.pi/agent/AGENTS.d/output-quality.md` is inspected
- **THEN** the file no longer exists

#### Scenario: tool-mcp-removed
- **WHEN** `.pi/agent/AGENTS.d/tool-mcp.md` is inspected
- **THEN** the file no longer exists

### Requirement: global-agents-simplified

The global `.pi/agent/AGENTS.md` SHALL be restructured and significantly shortened.
The following changes apply:

1. **Keep** (精简形式): Core Rules, Edit Tool rules (移除 JSON schema, 精简到 3 条核心自检), Bash Tool rules, Error Recovery
2. **Remove**（内联低频内容不保留）:
   - Web Search 完整参数表格（工具定义已自带 schema）
   - Subagent 选择矩阵（冗余，skill XML 已有相同信息）
   - Subagent 编排工作流图（AGENTS.d/subagent-usage.md 已涵盖）
   - 初学者首次配置段落（低频）
     - Markdown Output Quality 引用
     - LSP 代码智能引用（替换为 serena 引用）
3. **Update** (引用指向新位置):
   - README 维护 → 指向 `docs/reference/readme-governance.md`
   - Pi 供应商/模型 → 指向 `docs/reference/pi-provider-model.md`
   - LSP 代码智能 → 指向 `serena-code-intelligence` skill
   - Subagent 委派精简规则（保留触发原则 + 链接到 AGENTS.d/subagent-usage.md）

#### Scenario: web-search-table-removed
- **WHEN** `.pi/agent/AGENTS.md` contains the "Web Search Tool" section
- **THEN** it does NOT contain the full parameter table (search_query, location, content_size columns)
- **AND** it retains the concise usage principles (5-6 bullet points)

#### Scenario: subagent-matrix-removed
- **WHEN** `.pi/agent/AGENTS.md` contains the "Subagent 自动委派" section
- **THEN** it does NOT contain the full subagent selection matrix table (Task Type vs Agent vs Context vs Model vs Thinking)
- **AND** it retains a concise delegation trigger decision guide

#### Scenario: guide-length-reduced
- **WHEN** the line count of `.pi/agent/AGENTS.md` is measured
- **THEN** it is reduced from approximately 200+ lines to approximately 80-100 lines

#### Scenario: lsp-reference-updated
- **WHEN** `.pi/agent/AGENTS.md` contains the "LSP / Serena" section
- **THEN** it references the `serena-code-intelligence` skill, not `lsp-code-intelligence` or `lsp-guide.md`

#### Scenario: provider-reference-updated
- **WHEN** `.pi/agent/AGENTS.md` references Pi provider/model configuration
- **THEN** it links to `docs/reference/pi-provider-model.md`, not `AGENTS.d/pi-provider-model.md`

#### Scenario: readme-reference-updated
- **WHEN** `.pi/agent/AGENTS.md` references README maintenance
- **THEN** it links to `docs/reference/readme-governance.md`, not `AGENTS.d/readme-governance.md`

## REMOVED Requirements

### Requirement: web-search-parameter-table

**Reason**: Inline Web Search parameter table consumed ~500 tokens of schema detail that is already documented in the tool definition itself. Removing this frees up system prompt capacity for higher-value rules.

**Migration**: Tool schema is provided via the tool's description in the available tools list. If needed, agents can use `mcp({describe: "web_search_prime_web_search_prime"})` to get the full parameter reference.

### Requirement: subagent-selection-matrix-table

**Reason**: The same information (agent name, model, thinking level) is already present in the XML `available_skills` block and in `.pi/settings.json` `subagents.agentOverrides`. The table in AGENTS.md was duplicate information consuming significant token budget.

**Migration**: Agents should refer to the `available_skills` XML in the system prompt for agent capabilities, or use `subagent({action: "list"})` at runtime for current configuration.

### Requirement: lsp-guide-file

**Reason**: Replaced by serena-code-intelligence skill.

**Migration**: Agents with existing LSP habit patterns will need to adapt to serena tools. The new skill provides complete guidance.
