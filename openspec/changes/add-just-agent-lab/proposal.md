# Proposal

## 问题定义

pi-config 缺少一套可观测的手段来度量「受限 Agent 在工程操作上的 Harness Compliance」——即 Agent 是否只通过项目批准的 Just recipe 执行工程命令，而不是自行构造底层命令；能力不足时是否停止并报告缺口。目前：

1. 没有受限实施 Agent（无 Bash、固定工具白名单）、没有 `just` 自定义工具、没有正式 justfile 与 Approved Recipe 集，无法开展该实验。
2. 没有 Run Trace / Run Report / Experiment Bundle 的生成与评估流程，主 Agent 无法基于运行时证据独立判定 Compliance Outcome 与 Task Outcome。
3. Just 未安装（`command not found`），需要一条可审计的项目本地 bootstrap 路径，而不是全局安装或 `curl | bash`。
4. 遗留测试 `tests/subagent-dispatch-core.test.mjs` 引用已删除的 `.pi/extensions/subagent-dispatch/core.js`，当前处于失败状态，阻塞测试基线。

## 范围边界

**目标（MVP）**：

- 建立 Just Agent Lab：一个 `just` 自定义工具（list/show/run/propose 四动作，默认拒绝未批准 recipe）、六个初始 Approved Recipes、一个项目专属 `just-worker` 受限 Agent、一个显式调用的 `$just-agent-lab` 编排 Skill、可审计的 `scripts/bootstrap-just.sh`（钉扎官方 release + SHA256，安装到 `.scratch/bin/just`）。
- 运行时记录 Experiment Bundle（Run Trace + recipe proposal）到 `.scratch/just-agent-runs/<run-id>/`，由父 Agent 独立评估两轴结果并提出至多一个 Root-Cause Change Set（2–3 项相关变更），等待人工批准。
- 完成首次用户提供真实任务的探索性运行 + 一轮已批准的调优迭代，然后按 closeout 治理验证归档。
- 将独立可用的 Just tool extension 加入 `.pi/capabilities.yaml` catalog；同步 README 与 `docs/getting-started.md` 能力描述。
- 删除过时的 `tests/subagent-dispatch-core.test.mjs`。

**非目标**：

- 不构建安全边界：无运行时硬写保护、无 justfile hash gate。受限 Agent 修改自身 justfile/工具/agent 后运行的行为被允许发生、被追踪，并判定为 compliance failed。绝不将本设计描述为 security containment。
- 不做性能基准：运行基于真实用户任务和 forked 会话上下文，属探索性（Exploratory Run），不构成可复现 A/B 对比。
- `compliance=pass` 且 `task=blocked` 是合法结果组合。
- MVP 自动 bootstrap 仅支持 macOS arm64；其他平台明确报错并要求手动安装。
- 不做全局 Just 安装，不运行 `scripts/sync-pi-agent.sh`（实验保持 project-only）。
- 不向 catalog 分发 project-only 的 agent/skill（`catalog.agents` 不受支持）；不把一次性命令预先做成 recipe（recipe 增长由观测到的重复缺口驱动）。
- 不引入 Trellis 等无关测试；package-source 扫描等 recipe 明确推迟。

## Capabilities

### New Capabilities

- `just-agent-lab`: 以受限 `just-worker` subagent + `just` 自定义工具 + Approved Recipe justfile + `$just-agent-lab` 编排 Skill 构成的 Harness Compliance 实验能力，含可审计 Just bootstrap、Experiment Bundle 记录与父 Agent 双轴评估闭环。

### Modified Capabilities

（无——删除过时测试不改变任何既有 spec 行为；`.pi/capabilities.yaml` catalog 追加是既有 manifest governance 的执行项，不是能力行为修改。）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（单一能力 `just-agent-lab`，与设计访谈确认的项目布局一致）

## Impact

**新增文件**：

- `justfile`（根，六个 recipe，`[metadata("agent:approved")]` 标注）
- `scripts/bootstrap-just.sh`
- `tests/just-agent-lab.test.mjs`
- `.pi/extensions/just-agent-lab/`（`index.ts` 工具入口 + `policy.ts` 零依赖策略模块，进入 catalog；目录型避免 discovery 加载纯策略文件）
- `.agents/just-worker.md`、`.agents/skills/just-agent-lab/SKILL.md`（project-only）
- `.scratch/just-agent-runs/<run-id>/`（运行时产物，手动清理）

**修改文件**：

- `.pi/capabilities.yaml`（catalog.extensions 追加 just-agent-lab）
- `README.md`、`docs/getting-started.md`（能力描述）
- `CONTEXT.md`（归档阶段追加 OpenSpec 索引）

**删除文件**：

- `tests/subagent-dispatch-core.test.mjs`（引用已删除实现，用户已批准删除）

**不受影响**：全局 `~/.pi/agent/`（不 sync）；未跟踪的 `node_modules/`（不触碰）。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无现有标准页（新增能力）；项目页 `CONTEXT.md` + `README.md`/`docs/getting-started.md`；回写目标为 `CONTEXT.md`（OpenSpec 索引）与 README/getting-started 能力描述，回写细节以 binding.md 为准。
