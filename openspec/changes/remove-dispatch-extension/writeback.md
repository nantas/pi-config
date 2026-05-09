# Writeback

## 回写摘要

- change：`remove-dispatch-extension`
- 回写结论：dispatch extension 和 dispatch-planner agent 已完全移除，由 `.pi/prompts/subagent.md` 编排 prompt 替代。所有治理文件已同步更新。
- 关键结果：
  - 删除 `.pi/extensions/subagent-dispatch/`（~35KB 代码 + node_modules）
  - 删除 `.pi/agents/dispatch-planner.md`
  - 新增 `.pi/prompts/subagent.md`（编排 prompt，~3.4KB）
  - 更新 `.pi/capabilities.yaml`（移除 dispatch 条目，新增 subagent prompt）
  - 更新 `README.md` 和 `docs/getting-started.md`

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `subagent-prompt-guide` | New | `specs/subagent-prompt-guide/spec.md` | 新增 `/subagent` 编排 prompt，替代 dispatch extension 的编排入口，覆盖 single/parallel/chain/async 模式、dispatch 迁移映射、常用工作流模板、错误恢复指引 |
| `pi-subagent-dispatch-baseline` | Modified (全部 REMOVED) | `specs/pi-subagent-dispatch-baseline/spec.md` | 原有 13 个 requirement 全部标记为 REMOVED，dispatch extension 和 dispatch-planner agent 已移除 |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | subagent-prompt-guide 7/7 requirement 覆盖，pi-subagent-dispatch-baseline 13/13 REMOVED requirement 清除 | `verification.md` Spec-to-Implementation Coverage 段 |
| Task-to-Evidence | 11/11 核心任务已完成 | `verification.md` Task-to-Evidence Coverage 段 |
| 残留引用 | grep "dispatch" 仅 README.md 1 处迁移说明提及 | `verification.md` 关键证据入口表 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `README.md` | 扩展描述段、Agent 定义段、文件索引表 | subagent-dispatch 扩展描述→subagent prompt 描述；dispatch-planner agent 段→"无自定义 agent"说明；文件索引表 agent 列更新 |
| `docs/getting-started.md` | 全局同步能力表、Subagent 模型配置段 | 扩展计数 7→6、agent 计数 1→0、prompts 计数 10→11；移除 dispatch 引用 |
| `.pi/capabilities.yaml` | global.extensions、global.agents、global.prompts | 移除 subagent-dispatch 和 dispatch-planner，新增 subagent prompt |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明 |
| --- | --- | --- | --- | --- |
| `README.md` | ✅ 成功 | 2026-05-09 | pi agent | 3 处 dispatch 引用替换完成，仅保留 1 处迁移说明提及 |
| `docs/getting-started.md` | ✅ 成功 | 2026-05-09 | pi agent | 2 处变更：能力表更新 + Subagent 配置段措辞更新 |
| `.pi/capabilities.yaml` | ✅ 成功 | 2026-05-09 | pi agent | dispatch 引用 0 残留，subagent prompt 已注册 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（`pi-subagent-dispatch-baseline` 和 `pi-subagent-agent-contract`）
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
- 不执行全局同步（`scripts/sync-pi-agent.sh`）— 需用户独立确认后执行
