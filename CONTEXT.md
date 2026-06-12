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
通过 npm 或 git 安装的第三方 Pi 包（如 `pi-fff`、`pi-mcp-adapter`）。由 `pkg-research` 技能管理评估和安装决策。

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

**行号编辑**：
通过 `pi-snap-edit` 包注册的 `quick_edit` 和 `target_edit` 替代内置 `edit`。按行号定位编辑（`quick_edit`）或按精确文本定位编辑（`target_edit`），支持批量原子操作、行首内容守卫和 trim 匹配模式。

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
| 变更收尾 | `pi-config-closeout-settings-governance` |

### 扩展

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 扩展开发、新建扩展 | `pi-extension-dev-skill`, `pi-extension-lifecycle-guidance` |
| 扩展自去重 | `extension-dedup-mechanism`, `extension-dedup-standard`, `extension-self-dedup` |
| $ 技能调用、$ 展开 | `dollar-skill-invoke`, `dollar-skill-autocomplete`, `dollar-skill-invoke-context`（注：后缀变体见 archive） |
| 计划模式切换 | `planner-toggle` |
| /init 命令 | `init-command` |
| 输出滚动查看 | `output-scroll-viewer` |
| 会话浏览、会话树 | `session-index-engine`, `session-retrieval-tools`, `browse-session-tree`（注：`session-browse` 见 extensions） |
| Obsidian 工具 | `obsidian-tools`, `obsidian-tools-extension`, `obsidian-cli-tool`, `obsidian-vault-resolver` |
| Obsidian 搜索 | `obsidian-search-skill`, `obsidian-search-tool`, `obsidian-search-config` |
| HTML 导出 | `html-export-support` |
| / 技能过滤 | `slash-skill-filter` |
| 添加供应商 | 见 extensions `add-provider.ts` |
| Wikilink 批量替换 | `wikilink-batch-replace` |

### 包管理

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 包安全审查 | `pkg-security-review` |
| 包安装研究 | `pkg-install-research`, `pkg-raw-extension-research` |
| 包决策、三选一 | `pkg-decision-backlog`, `pkg-global-sync` |
| 目录安装、跨仓库安装 | `install-from-pi-config`, `install-from-pi-config-overwrite`, `install-skill-single-file` |
| Fork 管理 | 见 skill `pkg-fork-dev`，registry `forks/manifest.yaml` |

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
| MCP 配置 | `pi-mcp-shared-bridge`, `global-mcp-config` |

### 仓库架构

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 仓库蓝图 | `pi-customization-blueprint`, `pi-phase2-delivery-plan` |
| 项目源层 | `pi-project-source-layer` |
| Trellis 防护 | `trellis-repo-guard` |
| Plan 模式对比 | `codex-plan-mode-reference` |
