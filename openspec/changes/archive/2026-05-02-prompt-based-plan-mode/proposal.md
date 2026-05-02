# Proposal

## 问题定义

当前 `planner-toggle.ts` 扩展通过工具白名单（`setActiveTools` + bash regex allowlist）来限制写入操作。这种方式有两个维护痛点：

1. **bash allowlist 正则不可靠** — 正则只能覆盖已知的写入模式，无法防御新的或间接的写入方式；允许/禁止规则边界模糊，维护成本高。
2. **工具白名单脆弱** — 每个新增扩展工具（如 `obsidian_search`、`custom_tool`）都需要手动加到 `PLANNER_TOOLS` 白名单，否则 plan mode 下不可用，限制实际探索能力。

参考 Codex plan mode 的实现原理——**只通过 system prompt 指令来约束 LLM 行为，不依赖工具白名单**，本 change 将把 `planner-toggle.ts` 从 whitelist-based 设计重构为 prompt-based 设计。

## 范围边界

**In scope:**
- 重写 `planner-toggle.ts` 扩展核心逻辑
- 删除工具白名单机制（`setActiveTools` 过滤、bash regex allowlist、write/edit 拦截）
- 改为通过 `before_agent_start` → `systemPrompt` 注入完整的 plan mode 行为指令
- 用 Codex 风格的三阶段工作流（环境探查→意图对话→实现计划）替换 `[PLANNER MODE ACTIVE]` 消息注入
- 保留模型切换、状态持久化、status bar 指示器等辅助功能
- 产出 `docs/reference/plan-mode-comparison.md` 作为技术参考文档

**Out of scope:**
- 不改变 pi 的 tool_call 事件架构本身
- 不涉及 pi 其他扩展的改造
- 不涉及新的用户交互范式（保留 `/planner` 命令和快捷键）
- 不涉及 Codex 风格的 `<proposed_plan>` 流式解析（pi 无此架构支持）

## Capabilities

### New Capabilities
- `codex-plan-mode-reference`: 产出 Codex vs pi plan mode 实现对比参考文档

### Modified Capabilities
- `planner-toggle`: 将 `planner-toggle.ts` 从 whitelist-based 重构为 prompt-based plan mode，删除工具白名单与 bash allowlist，改为纯 system prompt 指令驱动的只读约束

## Capabilities 待确认项

- [x] 能力清单已确认 — 改造 `planner-toggle` + 新增参考文档

## Impact

- **planner-toggle.ts** — 核心行为不变（切换 plan mode），但实现方式从工具过滤改为 prompt 指令约束，约删减 100 行正则/过滤代码，新增 ~80 行 plan mode 指令模板
- **docs/reference/plan-mode-comparison.md** — 新增参考文档
- **用户感受** — plan mode 下所有工具仍然可见可用，LLM 根据 prompt 指令自行克制写入操作；极少数情况下 LLM 可能不遵守指令，但整体改进了 extensibility
- **Capability manifest** — 无需更新（`planner-toggle` 已经在 `.pi/capabilities.yaml` 中）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部项目页回写
