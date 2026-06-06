# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-guidance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: AGENTS.md 重构：删除 Grep/Find Tool、LSP 代码智能 section，新增 fff 指导 section，重写委派判断表为信息掌握度驱动

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: tool-call-guidelines-sections
AGENTS.md 的 Tool Call Guidelines MUST 只包含 Edit Tool、Bash Tool、Error Recovery、Web Search 四个子 section。Grep/Find Tool section 和 LSP 代码智能 section MUST 被移除。

#### Scenario: agent 读取 AGENTS.md 工具指导
- **WHEN** agent 读取 AGENTS.md 的 Tool Call Guidelines
- **THEN** 只能看到 Edit Tool、Bash Tool、Error Recovery、Web Search 四个子 section
- **THEN** 不应看到任何关于内置 `grep`/`find` 或 serena 的使用指导

### Requirement: fff-guidance-section
AGENTS.md MUST 包含独立的 `## 代码检索与文件定位（fff）` section，位于 Tool Call Guidelines 和 Subagent 自动委派之间。内容 MUST 覆盖：核心规则声明、决策表、ffgrep 使用原则、fffind 使用原则、反模式示例、编辑工作流串联。

#### Scenario: agent 面对检索任务
- **WHEN** agent 需要搜索代码或定位文件
- **THEN** AGENTS.md 的 fff section 提供完整的工具选择决策表和使用原则
- **THEN** agent 无需按需加载额外文件即可做出正确选择

### Requirement: delegation-by-information-level
AGENTS.md 的 Subagent 自动委派 section 的判断表 MUST 以主 agent 的信息掌握度为判断轴，MUST NOT 引用具体工具名。

#### Scenario: agent 判断是否委派
- **WHEN** agent 需要决定是否将检索任务委派给 subagent
- **THEN** 判断依据为主 agent 对目标代码的掌握程度（低 → 委派盲探测；高 → 直接执行）
- **THEN** 判断表中不出现任何具体工具名称

## REMOVED Requirements

### Requirement: lsp-code-intelligence-section
**Reason**: serena MCP 被全局移除，LSP 代码智能不再作为全局默认能力
**Migration**: 代码编辑回退到 `edit` tool + `bash sed`，检索回退到 `ffgrep`/`fffind`

### Requirement: grep-find-tool-section
**Reason**: 内置 grep/find 被 fff 工具替代，相关使用原则已整合到 fff-retrieval spec
**Migration**: fff 工具自带 smart-case、frecency 排名、git-aware 特性，无需手动约束 glob/path
