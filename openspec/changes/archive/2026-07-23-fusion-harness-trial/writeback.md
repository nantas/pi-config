# Writeback

## 回写摘要

- change：`fusion-harness-trial`
- 回写结论：**trial 阶段无永久回写**（按 binding.md 约定）。本次 change 是 scratch 隔离的价值验证 trial，价值已确认（有条件），后续正式引入由独立 change 承担。
- 关键结果：auto-validate 内容层 gate 相对现有 governance 有明确增量（15/34 项零能力区）；fusion 在批判性深度有真实视角差异；主干结构跨模型收敛；总成本 $0.10

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
|---|---|---|---|
| `fusion-harness-trial` | New | `specs/fusion-harness-trial/spec.md` | 定义 fusion harness trial 的 5 项行为规格：scratch 隔离执行、upstream 框架优先（不重实现）、skill 契约路径指针注入（非拼装）、全阶梯试跑（opinion→fusion→auto-validate）、价值评估驱动后续决策 |

**说明**：本 capability 是 trial 性质——验证 fusion/auto-validate 模式在 markdown ingest 场景的真实价值。trial 本身不引入任何 pi-config 运行时资源（无新 skill/extension/agent），仅产出 spec 工件。

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
|---|---|---|
| Spec-to-Implementation | 5/5 Requirement 全覆盖，12/12 Scenario 全验证 | `verification.md` Spec-to-Implementation Coverage 节 |
| Task-to-Evidence | 22/22 任务全完成 | `tasks.md`（全部 `[x]`）+ `verification.md` Task-to-Evidence 节 |
| 三轴评估 | 价值确认（有条件）：auto-validate 明确增量，fusion 在批判深度有差异 | `verification.md` 三轴评估节 + `~/scratch/fusion-trial/runs/` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
|---|---|---|
| **pi-config spec 工件**（本 change 内） | `openspec/changes/fusion-harness-trial/*` | 已完成：binding/proposal/specs/design/tasks/verification/writeback 全套工件 |
| **my-wiki digest**（trial 注释） | 无 | **不回写**——trial 产出落 scratch，my-wiki `20-synthesis/` 零改动（binding.md 同步约束） |
| **pi-config `.pi/` 资源** | 无 | **不回写**——trial 阶段不引入运行时资源（proposal.md 范围边界） |
| **全局 `~/.pi/agent/`** | 无 | **不回写**——不同步（binding.md 同步约束） |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
|---|---|---|---|---|
| pi-config spec 工件 | ✅ 成功 | 2026-07-23 | agent | 7 个工件全部生成，`openspec status` 可验证 |
| my-wiki | ⏭️ 跳过（设计如此） | — | — | trial 阶段不碰 my-wiki 运行时；scratch 产出 `~/scratch/fusion-trial/output/` 保留供对照 |
| pi-config `.pi/` | ⏭️ 跳过（设计如此） | — | — | 价值确认后由独立 change 处理（见下） |
| 全局配置 | ⏭️ 跳过（设计如此） | — | — | 不同步 |

## 回写前置条件

- [x] verification.md 已完成且三轴评估有明确结论
- [x] binding.md 确认的回写目标已全部处理（spec 工件完成，其余按设计跳过）
- [x] 价值结论已记录（价值确认·有条件）

## 不回写的内容

- **fusion/auto-validate 实际产出的 digest**：落 scratch，不进 my-wiki `20-synthesis/`（ground truth 已存在，trial 产出仅作对照）
- **fusion-harness 仓库代码**：clone 在 scratch，不进 pi-config `.pi/git/` 或 `.pi/extensions/`
- **pointer 文件 / launch 脚本**：在 scratch，不进 pi-config `.pi/`
- **模型配置变更**：`~/.pi/agent/settings.json` / `models.json` 零改动
- **`capabilities.yaml`**：不动（proposal.md 明确排除）

## 后续正式引入路径（超出本 change scope）

价值确认后，由独立 change 承担正式引入：

1. **pkg-research** 评估 upstream `disler/fusion-harness`（安全审查 + 隔离安装研究）
2. **pkg-fork-dev** fork 注入 my-wiki 契约（解决 FUSION agent 路径遵守问题 + pointer 文件持久化）
3. **Q3 解冻**：评估声明式 YAML gate vs Python gate，考虑 LLM-as-judge hook 补语义盲区
4. **`capabilities.yaml` 回写**：正式引入时新增 extension 条目
5. **my-wiki ingest 工作流改造**：把 auto-validate gate-first loop 挂到 lecture-ingest skill 末尾（替换现有事后 governance），届时 my-wiki 需注册到 `repo-registry`
