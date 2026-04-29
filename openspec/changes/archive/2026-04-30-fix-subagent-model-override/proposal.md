# Proposal

## 问题定义

`dispatch` 工具的 7 个 builtin subagent（`context-builder`、`oracle`、`planner`、`researcher`、`reviewer`、`scout`、`worker`）默认使用 `openai-codex/gpt-5.5` 或 `openai-codex/gpt-5.3-codex` 模型。当前环境没有 `openai-codex` provider 的 API key，导致所有 dispatch subagent 调用立即失败（exit code 1, 0 turns, "No API key found for openai-codex"）。

`delegate` agent 无显式 `model` 字段，继承父模型，不受影响。project-owned agents（`code-writer`、`dispatch-planner`）也无显式 model，不受影响。

## 范围边界

- **在范围内**：在 `.pi/settings.json` 中添加 `subagents.agentOverrides`，将 7 个受影响 builtin agent 的 model 覆盖为 `deepseek/deepseek-v4-flash`
- **不在范围内**：修改 `pi-subagents` npm 包内置 agent 定义、添加新的 API key、修改 agent 的 system prompt 或其他配置

## Capabilities

### New Capabilities

- `subagent-model-override`: 通过 `settings.json` 的 `subagents.agentOverrides` 机制覆盖 builtin subagent 的模型配置

### Modified Capabilities

- 无

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **更改文件**：`.pi/settings.json` — 添加 `subagents.agentOverrides` 节
- **新增文件**：无
- **依赖**：无外部依赖，仅使用 `pi-subagents` 已支持的 builtin agent override 机制

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
