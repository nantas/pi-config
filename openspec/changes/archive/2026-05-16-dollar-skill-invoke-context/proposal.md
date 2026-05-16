# Proposal

## 问题定义

`dollar-skill-invoke` 扩展目前的 `$skill-name` 展开机制基于 `input` 事件做文本级替换：**移除 `$skill` token → 前置 `<skill>` 块**。这种「替换式」注入导致两个问题：

1. **不支持多 skill**：上一版变更（`2026-05-12-dollar-skill-invoke-trim`）已将多 skill 展开缩减为仅展开第一个，因为多 skill 时 token 被移除导致语义漂移——LLM 看到 `"我要开发 xxx 功能，请使用  调查源码"`（skill 引用部分被清空）。
2. **语义完整性丧失**：即使单 skill，前置 `<skill>` 块意味着 LLM 先看到技能内容再看到用户意图，与用户的表达顺序相反。

对标 Codex 的 skill 引用实现：Codex **保留原始 prompt（含 `$skill_name` 标记）**，将每个 skill 的完整内容作为独立 `<skill>` 块以 user 消息形式**追加**到原始 prompt 之后。LLM 能看到 `原始意图 → 技能 A 内容 → 技能 B 内容`，从原始意图中推断配合关系。

Pi 的 `context` 事件（`repo://pi-mono/packages/coding-agent/src/core/extensions/runner.ts`）在每次 LLM 调用前触发，可修改完整 `AgentMessage[]` 数组。且 `CustomMessage`（`role: "custom"`）会被 `convertToLlm()` 转为 `role: "user"`，天然支持以 user 角色注入额外消息。将 skill 展开从 `input` 事件的文本替换切换到 `context` 事件的消息级追加，即可实现 Codex-like 的多 skill 支持。

## 范围边界

**In scope:**
- `dollar-skill-invoke` 扩展改为使用 `context` 事件注入 skill 内容
- 原始 prompt 中的 `$skill-name` 标记**保留不变**
- 每个匹配的 skill 作为独立 `CustomMessage`（`customType: "skill"`, `display: false`）追加在 user message 之后
- 支持任意数量 `$skill-name` 标记（不再限制为一个）
- `$skill` autocomplete（Tab 补全）保持不变
- `/` skill filter 保持不变
- `\$` 转义保持不变

**Out of scope:**
- 不在 `input` 事件中做任何文本转换
- 不修改 Pi 核心源码
- 不改变 autocomplete 或 slash filter 行为
- 不引入 skill 间显式编排（依赖关系、执行顺序）

## Capabilities

### Modified Capabilities

- `dollar-skill-invoke`: 将 skill 展开机制从 `input` 事件文本替换切换为 `context` 事件消息级追加。原始 prompt 保留 `$skill-name` 标记，每个 skill 内容以独立 `CustomMessage` 注入，支持多 skill 自然共存。

## Capabilities 待确认项

- [x] 能力清单已与用户确认——dollar-skill-invoke 能力升级，无新增 capability

## Impact

- **代码变更**：仅修改 `.pi/extensions/dollar-skill-invoke.ts`
- **行为变更**：`$skill` 从「前置替换」变为「后置追加」，原始 prompt 保留完整语义
- **多 skill 支持**：从「仅展开第一个」恢复为「全部展开」，但通过追加而非替换避免语义漂移
- **LLM 视角变化**：LLM 在 user message 中同时看到 `$skill-name` 引用和后续注入的 skill 内容，能推断配合关系
- **向后兼容**：单 skill 场景下 `$skill-name do X` → LLM 看到 `$skill-name do X` + `<skill>` 块，信息量更大而非更少
- **全局部署**：修改后需通过 `scripts/sync-pi-agent.sh` 同步至 `~/.pi/agent/extensions/`

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`openspec/specs/dollar-skill-invoke/spec.md`
  - 项目页：同上
  - 回写目标：`openspec/specs/dollar-skill-invoke/spec.md`
