# Proposal

## 问题定义

当前 `subagent-dispatch` extension 是基于 pi-subagents 0.20.1 的透传包装层，在 pi-subagents 0.24 引入 intercom 桥接、resume 恢复、control events、contact_supervisor 等关键能力后，dispatch 的透传价值大幅衰减，且成为升级障碍：

1. **功能受限**：保留 dispatch 意味着无法使用 pi-subagents 0.24 的原生能力（intercom、resume、control events、file-only output）
2. **维护负担**：每层透传包装都需要随上游 pi-subagents API 变化同步维护
3. **认知负担**：`dispatch` + `subagent` 双工具并存，LLM 和用户都易混淆

核心替代方案：移除 dispatch extension，用 pi-subagents 原生 `subagent` 工具 + 一个 `/subagent` 编排 prompt 替代，实现更轻量、更完整的子 agent 调度能力。

## 范围边界

### 范围内

- 删除 `.pi/extensions/subagent-dispatch/` 整个目录（extension + node_modules）
- 删除 `.pi/agents/dispatch-planner.md` agent 定义
- 创建 `.pi/prompts/subagent.md` 作为编排 prompt
- 删除 `pi-subagent-dispatch-baseline` capability spec（原 dispatch 工具/命令/接口规范不再适用）
- 更新 `.pi/capabilities.yaml` 移除相关条目
- 更新 `README.md` 和 `docs/getting-started.md` 中的引用
- 全局同步到 `~/.pi/agent/`

### 范围外

- **不改动** `pi-subagent-agent-contract` spec（agent 文件契约标准不受拆除影响）
- **不改动** 其他 extension 或 agent
- **不涉及** pi-mono 或其他仓库的 dispatch 消费方（当前无已知外部消费者）
- **不涉及** pi-subagents 本身的安装或升级（保持全局 0.20.1，prompt 指向 skill 中描述的接口）

## Capabilities

### New Capabilities
- `subagent-prompt-guide`: 提供 `/subagent` 命令式编排 prompt，替代 dispatch extension 的编排入口，引导 LLM 使用原生 subagent 工具完成 single/parallel/chain/async 等常见工作流

### Modified Capabilities
- `pi-subagent-dispatch-baseline`: 该 capability 将被标为已废弃（superseded），其定义的 dispatch 工具/命令/接口契约不再适用，由 `subagent-prompt-guide` 和 pi-subagents 原生接口共同替代

## Capabilities 待确认项

- [x] 能力清单已在设计讨论中与用户确认（新 prompt 名为 `subagent.md`，保留 pi-subagents skill 引用）

## Impact

| 维度 | 变更前 | 变更后 |
|------|--------|--------|
| 扩展数量 | 8 个全局扩展 | 7 个全局扩展 |
| Agent 数量 | 1 个（dispatch-planner） | 0 个（移除） |
| Prompt 数量 | 10 个 | 11 个（新增 subagent） |
| 代码量 | ~35KB（index.ts + core.js + node_modules） | ~2KB（subagent.md prompt） |
| 依赖版本 | pi-subagents 0.20.1（lock in） | 无直接依赖，随时可享用上游新特性 |
| 学习曲线 | 需理解 dispatch 的透传参数 | 直接使用 subagent 原生接口，prompt 做编排引导 |

风险：`projectContext` 调用级控制（dispatch 独有）将被移除，改为 agent 定义层的 `inheritProjectContext` 替代，可能导致极少数依赖此特性的工作流需要调整。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准：`pi-subagent-dispatch-baseline`（将被废弃）、`pi-subagent-agent-contract`（不变）
  - 方案文档：`docs/plans/dispatch-removal-migration-plan.md`
  - 回写目标：`README.md`、`docs/getting-started.md`、`.pi/capabilities.yaml`、`.pi/agents/dispatch-planner.md`、`.pi/extensions/subagent-dispatch/`、`.pi/prompts/subagent.md`
