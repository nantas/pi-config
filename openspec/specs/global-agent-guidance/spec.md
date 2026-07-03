# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-guidance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 用户确认方案 A（在 AGENTS.md 中新增 ask_user Tool 引用节）；后续变更替换 serena 为 fff 工具

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: agents-md-tool-call-guidelines
`AGENTS.md` 的 Tool Call Guidelines 区域 SHALL 在 "MCP Tool / Dispatch" 之后、"Markdown Output Quality" 之前包含 `### ask_user Tool` 小节，内容为：触发条件列表 + 链接到 `AGENTS.d/tool-ask-user.md`。

#### Scenario: agents-md-section-order
- **WHEN** 查看 `.pi/agent/AGENTS.md` 的 Tool Call Guidelines 区域
- **THEN** section 顺序为：Edit Tool → Bash Tool → Error Recovery → MCP Tool / Dispatch → ask_user Tool → Markdown Output Quality

#### Scenario: agents-md-trigger-conditions
- **WHEN** Agent 准备调用 `ask_user` 让用户确认决策或内容选择
- **THEN** Agent 通过 AGENTS.md 中的引用节识别需要加载 `AGENTS.d/tool-ask-user.md`

### Requirement: tool-call-guidelines-sections
AGENTS.md 的 Tool Call Guidelines MUST 包含 `### Edit Tool` 子 section（原生 edit，oldText/newText 模型），MUST NOT 包含任何引用 `quick_edit`、`target_edit`、`pi-snap-edit` 或「行号定位编辑」「精确文本定位编辑」模型的指导。Tool Call Guidelines 的子 section 顺序 SHALL 为：Edit Tool → Bash Tool → Error Recovery → Web Search。Edit Tool 子 section MUST 包含调用前三项自检作为硬约束。

#### Scenario: agent 读取 AGENTS.md 工具指导
- **WHEN** agent 读取 AGENTS.md 的 Tool Call Guidelines 区域
- **THEN** 看到原生 `### Edit Tool` 子 section，内容为 oldText/newText 模型
- **THEN** 不应看到任何 `quick_edit` / `target_edit` / `pi-snap-edit` 或行号定位编辑的引用

#### Scenario: edit 调用前自检
- **WHEN** agent 准备调用原生 `edit` 工具
- **THEN** AGENTS.md 强制三项自检：`path` 是顶层字段、每条 `oldText`/`newText` ≤ 200 字符、单次 ≤ 4 条 edits
- **THEN** 超过任一阈值时改用 `bash` + `sed` / `awk`

### Requirement: fff-edit-workflow-mapping
AGENTS.md 的 `### 编辑工作流（发现 → 修改）` section MUST 将检索后的编辑场景映射到原生工具：小范围精确替换（≤200 字符）用 `edit` tool，大范围替换/多文件/跨文件重命名用 `bash` + `sed`，批量 checkbox 用 `bash` + `sed -i ''`。该 section MUST NOT 引用 `quick_edit`、`target_edit` 或 `pi-snap-edit`。fff section 的检索指导（ffgrep/fffind 决策表、使用原则、反模式）不受影响。

#### Scenario: agent 面对编辑任务
- **WHEN** agent 通过 fff 完成检索后需要修改代码
- **THEN** AGENTS.md 编辑工作流表将场景映射到 `edit` tool 或 `bash` + `sed`
- **THEN** 不应出现 `quick_edit` / `target_edit` 作为推荐工具

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
