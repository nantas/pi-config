# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-guidance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 用户确认方案 A（在 AGENTS.md 中新增 ask_user Tool 引用节）

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
