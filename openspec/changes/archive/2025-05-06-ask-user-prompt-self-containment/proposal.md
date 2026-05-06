# Proposal

## 问题定义

Agent 在调用 `ask_user` 时将 prompt 当作"确认按钮"，写入引用性文字（如"以下是建议的标题和描述："），但实际的标题/描述内容仅存在于 Agent 内部上下文中，未写入 `prompt` 或 `options` 字段。用户在交互界面只能看到空引导语，无法获取决策所需的完整信息，需要额外一轮交互才能完成确认。

根因：pi-ask 的 `ASK_TOOL_PROMPT_GUIDELINES`（10 条）和 bundled `ask-user` SKILL.md 的 "ask_user payload quality" 部分均未包含 "prompt 必须自包含——用户看不到 Agent 内部上下文" 这一规则。

## 范围边界

- **In scope**：在 pi-config 的全局 Agent 指导中新增 `AGENTS.d/tool-ask-user.md`，补充 prompt 自包含规则、反模式示例与正确做法示例；在 `AGENTS.md` 中添加引用节，确保 session 在调用 `ask_user` 时加载该指导。
- **Out of scope**：不修改 `@eko24ive/pi-ask` 上游源码（`ASK_TOOL_PROMPT_GUIDELINES` 或 SKILL.md），该修复应作为后续上游 PR 单独处理。不修改 pi-ask 配置或 keymaps。

## Capabilities

### New Capabilities

- `ask-user-guidance`: 全局 Agent 指导中新增 ask_user 工具自包含规则，确保 prompt 字段包含用户决策所需的全部信息

### Modified Capabilities

- `global-agent-guidance`: 在 AGENTS.md 的 Tool Call Guidelines 区域新增 ask_user Tool 引用节，指向 AGENTS.d/tool-ask-user.md

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- 所有使用 `~/.pi/agent/AGENTS.md` 的 session 在调用 `ask_user` 前将自动加载自包含规则
- 已有 workflow 不受影响（纯增量添加，不修改现有规则）
- 需要执行 `scripts/sync-pi-agent.sh` 将变更同步到全局 `~/.pi/agent/`

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 项目页：`.pi/agent/AGENTS.md`、`.pi/agent/AGENTS.d/tool-ask-user.md`
  - 回写目标：`repo://pi-config` → 上述两文件
  - 无外部标准页引用
