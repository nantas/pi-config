# Specification Delta

## Capability 对齐（已确认）

- Capability: `ask-user-guidance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户确认方案 A（在 AGENTS.d/ 中创建 tool-ask-user.md 并在 AGENTS.md 添加引用）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: prompt-self-containment
Agent 在调用 `ask_user` 时，`prompt` 字段 MUST 包含用户做出决策所需的全部信息。Agent 不得在 `prompt` 中引用仅存在于 Agent 内部上下文中的内容（如"以下是建议的标题和描述"而不附带实际标题和描述）。

#### Scenario: confirm-pr-with-inline-content
- **WHEN** Agent 生成了 PR 标题和描述，需要用户确认
- **THEN** Agent MUST 将完整的标题和描述文本内联写入 `prompt` 字段，或通过 `options[].description` / `options[].preview` 传递

#### Scenario: choose-between-options-with-context
- **WHEN** Agent 需要用户在多个方案间选择，每个方案包含详细内容
- **THEN** Agent MUST 将每个方案的完整摘要写入对应 option 的 `description` 或 `preview` 字段，不得仅写方案名称而将详情留在内部上下文中

### Requirement: anti-pattern-documentation
`AGENTS.d/tool-ask-user.md` MUST 包含明确的反模式示例和正确做法示例，覆盖 prompt 空引用和 option 信息缺失两类典型错误。

#### Scenario: new-session-reads-guidance
- **WHEN** Agent 首次在 session 中需要调用 `ask_user`
- **THEN** Agent 通过 AGENTS.md 引用加载 `AGENTS.d/tool-ask-user.md`，获取自包含规则和反模式示例

### Requirement: agents-md-reference
`AGENTS.md` 的 Tool Call Guidelines 区域 MUST 包含 "ask_user Tool" 引用节，列出触发加载 `AGENTS.d/tool-ask-user.md` 的场景条件。

#### Scenario: agents-md-contains-ask-user-section
- **WHEN** 查看 `.pi/agent/AGENTS.md`
- **THEN** 文件中包含 `### ask_user Tool` 小节，引用 `AGENTS.d/tool-ask-user.md`，并列出触发场景（确认决策、展示内部生成数据供用户判断等）
