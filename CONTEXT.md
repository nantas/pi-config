# Pi-Config 上下文

pi-config 是 Pi agent 全局配置的集中管理仓库。它管理扩展、技能、Agent、提示模板、第三方包等资源的版本控制、全局同步和按需分发。

## 仓库角色

**配置中心**：
pi-config 仓库的 `.pi/` 目录是所有全局运行时配置的唯一真相源（source of truth），`~/.pi/agent/` 是单向部署目标，不可直接编辑。

**能力清单**：
`.pi/capabilities.yaml` 声明两 tier 能力——全局同步（`global`）和按需安装（`catalog`）。所有 `.pi/` 资源的增删改必须同步更新此文件。

## 核心流转

**全局同步**：
通过 `scripts/sync-pi-agent.sh` 将仓库 `.pi/` 资源单向推送到 `~/.pi/agent/`。同步前需用户确认。settings.json 由 capabilities.yaml 直接生成，不做双向合并。

**目录安装**：
其他仓库通过 `install-from-pi-config` 技能从 pi-config 的 catalog tier 按需安装能力到自己的 `.pi/` 目录。

**变更提案**：
通过 OpenSpec 工作流管理变更。使用 `orbitos-change-v1` schema：binding → proposal → specs → design → tasks → verification → writeback。所有 openspec 工件操作必须通过 `/opsx-*` 提示模板或 `openspec` CLI。

**归档**：
完成的变更提案移入 `openspec/changes/archive/`（日期前缀），可选将 delta specs 同步到 `openspec/specs/` 主规格目录。

## 资源类型

**扩展**：
TypeScript 单文件（`.ts`）或带 `package.json` 的目录，通过 Pi Extension API 注册工具、命令、快捷键等。存放于 `.pi/extensions/`。

**技能**：
`.pi/skills/` 下的目录，包含 `SKILL.md` 定义触发条件和工作流程。可被 `$技能名` 语法调用。

**Agent**：
`.pi/agents/` 下的 Markdown 文件（含 YAML frontmatter），定义 dispatch subagent 的人设和行为。可被 `/run agent名` 调度。

**提示模板**：
`.pi/prompts/` 下的 Markdown 文件，通过 `/模板名` 触发引导式工作流（如 `/opsx-new`）。

**包**：
通过 npm 或 git 安装的第三方 Pi 包（如 `pi-fff`、`fusion-harness`）。由 `pkg-research` 技能管理评估和安装决策。MCP 服务器由 Pi 原生支持（`~/.pi/agent/mcp.json`，仓内源 `.pi/agent/mcp.json`）。

## 全局 vs 仓库层

**全局运行时**：
`~/.pi/agent/` 目录。全局资源优先于项目级资源（提示模板和技能在冲突时全局版本覆盖项目版本）。

**仓库层**：
项目内 `.pi/` 目录。pi-config 仓库本身也是资源来源——其 `.pi/` 内容通过全局同步分发到 `~/.pi/agent/`。

## 包管理

**包研究**：
第三方包的评估流程：安全审查 → 隔离安装研究 → 用户决策（全局安装 / backlog 记录 / 丢弃）。

**包分叉**：
已使用的包需要修改时，通过 `pkg-fork-dev` 技能管理 fork 生命周期。所有 fork 注册在 `forks/manifest.yaml`。

## 辅助能力

**Obsidian 集成**：
Obsidian vault 搜索和知识导出能力。后端使用 jieba（Python）做中文分词，fff-node 做 SIMD 模式匹配。

**会话浏览**：
历史 Pi 会话的索引、检索和树状浏览能力。

**代码检索**：
使用 fff（`ffgrep`/`fffind`）做 frecency 排序的文本搜索，替代 LSP 级别的代码智能。

---

## OpenSpec 索引

以下映射帮助从用户术语定位到 openspec 中的实现规格。使用 `ffgrep` 或 `openspec show <slug>` 查看具体 spec 内容。

### 变更治理

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 能力清单、清单治理 | `capability-manifest`, `capability-governance`, `capability-manifest-governance` |
| 环境变量声明 | `capabilities-env-schema` |
| 全局同步、同步脚本 | `pi-runtime-bootstrap-sync`, `pkg-global-sync`, `sync-env-check`, `global-agent-md-sync` |
| 全局同步确认 | `pi-global-runtime-sync-confirmation`, `pi-config-closeout-settings-governance` |
| settings 生成 | `pi-fff-env-config`, `pi-fff-global-package` |
| models.json 生成、模型配置治理 | `models-manifest-governance` |
| 全局包移除、node_modules 清理 | `capability-manifest` |
| 变更收尾 | `pi-config-closeout-settings-governance` |

### 扩展

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 扩展开发、新建扩展 | `pi-extension-dev-skill`, `pi-extension-lifecycle-guidance` |
| 扩展自去重 | `extension-dedup-mechanism`, `extension-dedup-standard`, `extension-self-dedup` |
| $ 技能调用、$ 展开 | `dollar-skill-invoke`, `dollar-skill-autocomplete`, `dollar-skill-invoke-context`（注：后缀变体见 archive） |
| /init 命令 | `init-command` |
| 会话浏览、会话树 | `session-retrieval-tools`, `browse-session-tree` |
| Obsidian 工具 | `obsidian-tools`, `obsidian-tools-extension`, `obsidian-cli-tool`, `obsidian-vault-resolver` |
| Obsidian 搜索 | `obsidian-search-skill`, `obsidian-search-tool`, `obsidian-search-config` |
| Notion CLI、ntn 命令 | `notion` |
| HTML 导出 | `html-export-support` |
| / 技能过滤 | `slash-skill-filter` |
| 添加供应商 | 见 extensions `add-provider.ts` |
| Wikilink 批量替换 | `wikilink-batch-replace` |
| X 检索、Twitter 检索、twscrape | `x-reach-skill` |
| Fusion harness 多模型编排 | `fusion-harness-integration`, `capability-manifest` |

### 包管理

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 包安全审查 | `pkg-security-review` |
| 包安装研究 | `pkg-install-research`, `pkg-raw-extension-research` |
| 包决策、三选一 | `pkg-decision-backlog`, `pkg-global-sync` |
| 目录安装、跨仓库安装 | `install-from-pi-config`, `install-from-pi-config-overwrite`, `install-skill-single-file` |
| Fork 管理 | 见 skill `pkg-fork-dev`，registry `forks/manifest.yaml` |
| pi-xai prompt ghost、next-prompt 预填 | `pi-xai-prompt-suggest` |

### Agent 与 Subagent

| 用户术语 | 相关 spec slug |
|----------|---------------|
| Agent 定义、Agent 文件 | `agent-file-definitions`, `pi-subagent-agent-contract` |
| Agent 指导、AGENTS.md | `global-agent-guidance`, `global-agent-definitions`, `agent-guidance-simplify` |
| Subagent 调度 | `pi-subagent-dispatch-baseline`, `pi-global-subagent-package-delivery` |
| Subagent 模型覆盖 | `subagent-model-override`, `subagent-settings` |
| Subagent 提示模板 | `subagent-prompt-guide` |
| 提问引导 | `ask-user-guidance` |

### 提示模板与文档

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 提示模板治理 | `prompts-manifest-governance` |
| README 治理 | `readme-automation-governance`, `readme-documentation` |
| 参考文档 | `reference-docs-consolidation`, `pi-reference-curation-model` |
| 入门文档 | `readme-documentation` |

### 代码检索与 MCP

| 用户术语 | 相关 spec slug |
|----------|---------------|
| fff 检索 | `fff-retrieval` |
| MCP 配置 | `global-mcp-config` |

### 仓库架构

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 仓库蓝图 | `pi-customization-blueprint`, `pi-phase2-delivery-plan` |
| 项目源层 | `pi-project-source-layer` |

## Just Agent 实验术语

**工程入口遵从性（Harness Compliance）**：受限 Agent 在执行工程操作时，使用项目批准的 Just recipe，而不是自行构造底层命令；当现有 recipe 不足时，应停止执行并报告能力缺口。它不表示安全隔离或任务性能达标。

**Approved Recipe（已批准 recipe）**：已进入实验可执行能力集、允许受限 Agent 调用的项目操作。

**Recipe Proposal（recipe 提案）**：受限 Agent 为填补能力缺口而提交的候选 recipe；在人工批准并晋升前不可执行。

**Forked Experiment Run（分叉实验运行）**：从主会话当前叶节点继承对话上下文后启动的受限 Agent 运行，适合围绕当前任务快速试验；其结果受主会话历史影响，不等同于可复现基准。

**Run Trace（运行轨迹）**：由实验运行时生成的机器可读行为记录，覆盖专属 Agent 的全部工具调用，并记录精简参数、结果状态和时间；它是主 Agent 诊断实验行为的事实来源。

**Run Report（运行报告）**：受限 Agent 对任务结果、能力缺口和 recipe 提案的结构化总结；它用于解释 Run Trace，但不替代运行时证据。

**Restricted Implementation Agent（受限实施 Agent）**：可读取、检索和修改项目代码，并可调用已批准 recipe；不具备 Bash，并被要求不得直接修改正式 harness；违反该要求属于可观察的遵从性失败。

**Experiment Bundle（实验包）**：一次实验运行产生的临时证据集合，包含 Run Trace 和候选 recipe 片段；它不属于正式项目能力或版本化交付物。

**Experiment Skill（实验入口 Skill）**：将用户任务包装为实验契约，并强制主 Agent 通过 forked subagent 调用 Restricted Implementation Agent；委派失败时报告失败，不由主 Agent 回退执行。

**Root-Cause Change Set（根因变更集）**：一次实验迭代中，由同一个已观察失败根因直接要求的少量相关改进；可同时涉及两到三项配置，但不得夹带无关优化。

**Compliance Outcome（遵从性结果）**：描述受限 Agent 是否只通过 Approved Recipe 执行工程命令，并在能力不足时停止和报告。

**Task Outcome（任务结果）**：描述用户任务是否完成、阻塞或失败。任务阻塞可以与遵从性通过同时成立。


**Behavioral Boundary（行为边界）**：由 Agent system prompt 声明、但不由运行时阻止的规则；违规行为允许发生并被记录，用于衡量遵从性，不能解释为安全隔离。

**Exploratory Run（探索性运行）**：以真实开发任务为输入、用于发现遵从失败和能力缺口的实验运行；不同运行之间不构成受控性能比较。

**Experiment Control Plane（实验控制面）**：定义实验条件的 Just tool、正式 justfile、专属 Agent 和 Experiment Skill。MVP 将其作为 Behavioral Boundary 观察对象，而非运行时强制只读资源。

**Observer（观察者）**：运行 Experiment Skill 的主 Agent；它在子 Agent 返回后分别评估 Compliance Outcome 与 Task Outcome，并提出等待人工确认的 Root-Cause Change Set，不自动修改实验控制面。

**Project-only Experiment（项目专属实验）**：只在 pi-config 仓库中自动发现的 Agent 与 Skill 组合；MVP 不向其他项目分发，独立可用的 Just tool 可单独进入 catalog。
