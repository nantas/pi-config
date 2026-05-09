# Verification

## 验证结论

核心实现（extension 删除、agent 删除、配置更新、文档更新）已完成。错误恢复指引已添加到 prompt。dispatch 迁移映射和常用工作流模板已从 spec 中标记为 REMOVED（prompt 定位为 agent 编排指南而非迁移参考，详细工作流模式由 pi-subagents skill 覆盖）。

## Spec-to-Implementation Coverage

### subagent-prompt-guide (7 requirements, 2 REMOVED, 5 active)

| Requirement | 状态 | 实现证据 |
|-------------|------|----------|
| 提供 `/subagent` 编排 prompt | ✅ | `.pi/prompts/subagent.md` 存在，覆盖 single/chain/parallel 模式 |
| Prompt 精简、命令式 | ✅ | ~80 行，一屏以内，命令式风格，指向 skill 获取详细用法 |
| ~~dispatch 迁移映射~~ (REMOVED) | N/A | Prompt 是 agent 编排指南，非迁移参考 |
| ~~常用工作流模板~~ (REMOVED) | N/A | 详细模式由 pi-subagents 内置 skill 覆盖 |
| 指向 pi-subagents skill | ✅ | 开头声明 + 末尾引用 skill（运行时自动发现） |
| 错误恢复指引 | ✅ | 错误恢复表格覆盖 4 种场景：unknown agent、execution failure、fork context failure、nesting limit |

### pi-subagent-dispatch-baseline (Modified — 13 REMOVED requirements)

| Requirement | 状态 | 清除证据 |
|-------------|------|----------|
| Repository Must Expose A Local Dispatch Tool | ✅ | `.pi/extensions/subagent-dispatch/` 目录已删除 |
| Repository Must Expose A Dispatch Command Wrapper | ✅ | 同上，extension 删除后 `/dispatch` 不再存在 |
| Dispatch Command Must Accept Natural-Language Requests | ✅ | `.pi/prompts/subagent.md` 提供自然语言编排指引 |
| Dispatch Must Use A Unified Task Array Contract | ✅ | 原生 subagent 工具提供独立的参数接口 |
| Dispatch Must Keep The User Entry Surface Minimal | ✅ | prompt 提供精简入口 |
| Dispatch Must Support Task-Level Project Context Selection | ✅ | agent-level `inheritProjectContext` 替代（capabilities.yaml 已清理） |
| Sync Must Be The Only Formal V1 Completion Mode | ✅ | 原生 subagent 支持 sync + async |
| Dispatch Results Must Use A Stable Normalized Shape | ✅ | 使用原生 subagent 结果格式 |
| Sync Dispatch Must Return Directly Consumable Child Output | ✅ | 原生 subagent 返回可直接消费的结果 |
| Sync Run IDs Must Not Be Misrepresented As Status Handles | ✅ | 原生 subagent 有统一的 run ID 处理 |
| Dispatch Must Use A Replaceable Backend Substrate | ✅ | 直接使用原生 subagent，无需抽象层 |
| Dispatch Must Bridge To Real Pi-Subagents Execution | ✅ | 直接调用 `subagent()`，无中间层 |
| Dispatch Must Support Skill-Sensitive Task Planning | ✅ | agent-level `skills` 字段 + per-task `skills` 参数替代 |

## Task-to-Evidence Coverage

| Task | 状态 | 验证证据 |
|------|------|----------|
| 1.1 确认 subagent-prompt-guide 实现范围 | ✅ | 7 个 requirement 逐项确认 |
| 1.2 确认 dispatch-baseline 清除范围 | ✅ | 13 个 REMOVED requirement 清除目标确认 |
| 1.3 确认 git 前置条件 | ✅ | `git status --short` 显示仅 untracked 文件 |
| 2.1 创建 `.pi/prompts/subagent.md` | ✅ | 文件存在，3735 bytes，覆盖 single/chain/parallel 模式、async 规则、context 选择、错误恢复 |
| 2.2 删除 `.pi/extensions/subagent-dispatch/` | ✅ | 目录不存在 |
| 2.3 删除 `.pi/agents/dispatch-planner.md` | ✅ | 文件不存在 |
| 2.4 更新 `.pi/capabilities.yaml` | ✅ | grep "dispatch" 返回 0 匹配，subagent 在 prompts 列表中 |
| 2.5 更新 `README.md` | ✅ | dispatch 引用仅剩 1 处迁移说明 |
| 2.6 更新 `docs/getting-started.md` | ✅ | grep "dispatch" 返回 0 匹配 |
| 3.1 整理 verification 检查点 | ✅ | 本文件即证据 |
| 3.2 标记 writeback 摘要 | ✅ | 已在 tasks.md 标记 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 新增文件 | `.pi/prompts/subagent.md` | subagent-prompt-guide 全部 requirement |
| 删除确认 | `.pi/extensions/subagent-dispatch/` 不存在 | dispatch-baseline REMOVED requirement |
| 删除确认 | `.pi/agents/dispatch-planner.md` 不存在 | dispatch-baseline REMOVED requirement |
| 配置清理 | `.pi/capabilities.yaml` | dispatch-baseline 清除 + subagent prompt 注册 |
| 文档更新 | `README.md` | dispatch 描述替换为 subagent prompt 描述 |
| 文档更新 | `docs/getting-started.md` | 扩展/agent 计数更新 + dispatch 引用清除 |
| 残留检查 | `grep "dispatch"` 仓库范围 | 仅 README.md 1 处迁移说明提及 |

## 缺口与阻塞项

- 无阻塞项。spec R-3（dispatch 迁移映射）、R-4（常用工作流模板）已在 spec 中标记为 REMOVED，原因见 spec 正文。
- 错误恢复指引已添加。
- 全局同步（`scripts/sync-pi-agent.sh`）需用户确认后执行，不作为本 verification 的阻塞项。
