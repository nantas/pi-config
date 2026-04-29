# Tasks

## 1. Spec 覆盖与实现准备

- [ ] 1.1 确认 `pi-subagents` 的 `subagents.agentOverrides` 机制支持 `model` 字段覆盖
- [ ] 1.2 确认 7 个受影响 builtin agent 的名称和当前模型（`openai-codex/*`）

## 2. 核心实现任务

- [x] 2.1 在 `.pi/settings.json` 中添加 `subagents.agentOverrides` 节，为以下 agent 设置 `model: "deepseek/deepseek-v4-flash"`：
  - `context-builder`、`oracle`、`planner`、`researcher`、`reviewer`、`scout`、`worker`
  - 覆盖 spec: `subagent-model-override` Requirement "Builtin Subagent Model Override"
  - 验证: `.pi/settings.json` 语法有效，`subagents.agentOverrides` 包含 7 个条目

- [x] 2.2 确认 `delegate`、`code-writer`、`dispatch-planner` 不在 override 列表中
  - 覆盖 spec: `subagent-model-override` Requirements "Delegate agent unchanged"、"Project-owned agents unchanged"
  - 验证: 这些 agent 的 name 不出现在 `subagents.agentOverrides` 键中

## 3. 收敛与验证准备

- [ ] 3.1 重新加载 `/reload` 使 settings 变更生效
- [ ] 3.2 使用 `dispatch` 测试至少一个受影响 agent（如 `researcher`），确认不再报 "No API key found"
- [ ] 3.3 整理验证证据到 verification.md

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成或更新 `verification.md`
- [ ] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`
- [ ] 4.3 执行 `writeback.md` 中定义的回写目标
