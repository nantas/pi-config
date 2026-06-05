# pi-config

**pi-config** 是一个集中式 Pi 编码代理（Pi coding agent）配置仓库，管理所有自定义扩展、外部包、治理工作流、Agent 定义与 OpenSpec 规划系统。通过结构化分层与版本控制，实现 Pi 运行时的可追溯、可审计、可复用配置管理。

---

## 新手上路

> 在开始之前，请确保你已经[安装并可以运行 Pi](https://pi.dev/docs/latest/installation)。

如果你是第一次使用本仓库，请阅读 [docs/getting-started.md](docs/getting-started.md)，按照七个步骤完成 Pi 环境配置和全局同步：安装 Pi CLI → 配置模型供应商 → 配置 enabledModels → 查看能力清单 → 确认同步范围 → 执行全局同步 → 验证环境。

---

## 架构分层概览

仓库按数据类型分为五个层级，每层承担不同角色：

```
┌──────────────────────────────────────────────────────────────┐
│                     .pi/ (仓库管理源)                        │
│  settings.json  extensions/  agents/  packages/  prompts/   │
│  Pi 运行时的直接配置源，通过 sync 脚本部署到 ~/.pi/agent/    │
├──────────────────────────────────────────────────────────────┤
│                     .agents/ (跨 Agent 共享层)                │
│  skills/  — OpenSpec 工作流技能等跨仓库共享技能            │
│  跨平台共享的 skill 工作流定义，通过仓库 git 版本管理          │
├──────────────────────────────────────────────────────────────┤
│                   openspec/ (规划与执行合约层)                 │
│  specs/  changes/  manifest.json  pkg-backlog.md             │
│  能力规格说明、变更生命周期管理、决策记录                     │
├──────────────────────────────────────────────────────────────┤
│                     docs/ (研究与参考层)                       │
│  蓝图设计、治理规则、阶段边界定义、参考资料                   │
├──────────────────────────────────────────────────────────────┤
│                   scripts/ (自动化层)                         │
│  sync-pi-agent.sh  — 仓库到全局运行时的单向同步入口           │
└──────────────────────────────────────────────────────────────┘
```

### 各层职责

| 层级 | 目录 | 职责 |
|---|---|---|
| **仓库管理源** | `.pi/` | Pi 运行时配置的真源，通过 `sync-pi-agent.sh` 部署到 `~/.pi/agent/` |
| **跨 Agent 共享层** | `.agents/` | 跨仓库共享的 Agent 技能/行为定义，不在同步脚本管理范围内 |
| **规划与执行合约层** | `openspec/` | 能力规格（specs）、变更（changes）、决策记录（pkg-backlog） |
| **研究与参考层** | `docs/` | 蓝图、治理文档、阶段边界、参考资料 |
| **自动化层** | `scripts/` | 同步脚本、自动化工具 |

---

## 快速开始

```bash
# 1. 克隆仓库
git clone <repo-url> pi-config
cd pi-config

# 2. 查看当前 Pi 配置状态
cat .pi/settings.json

# 3. 部署到全局运行时（需确认）
./scripts/sync-pi-agent.sh
```

更多工作流见下方的 **工作流速查** 节。

---

## 核心能力

### 自定义扩展

位于 `.pi/extensions/` 下，通过 Pi Agent SDK 开发的 TypeScript 扩展，增强或修改 Pi 编码代理的运行时行为。

#### `dollar-skill-invoke`

- **描述**: 添加 `$` 前缀技能触发和输入转换。输入 `$skill-name` 会自动补全技能名称，提交时转换为 `<skill>` 调用块。同时优化 `/` 前缀补全，过滤掉 `skill:` 条目。
- **解决的问题**: Pi 原生只支持 `@` 和 `#` 触发，无法直接通过 `$` 调用技能。本扩展填补了这一交互缺口，使技能调用与命令调度体验一致。
- **源文件**: `.pi/extensions/dollar-skill-invoke.ts`
- **OpenSpec Spec**: `openspec/specs/dollar-skill-invoke/spec.md` / `openspec/specs/dollar-skill-autocomplete/spec.md` / `openspec/specs/slash-skill-filter/spec.md`

#### `planner-toggle`

- **描述**: 通过键盘快捷键 `Ctrl+Alt+P` 或 `/planner` 命令切换只读规划模式。在规划模式下，模型切换为 `deepseek/deepseek-v4-pro`，仅开放只读工具集（read、bash、grep、find、ls）。
- **解决的问题**: 需要做架构决策或规划时，防止 agent 在思考过程中误修改文件。本扩展提供安全的规划隔离环境。
- **源文件**: `.pi/extensions/planner-toggle.ts`
- **OpenSpec Spec**: `openspec/specs/planner-toggle/spec.md`

#### `output-scroll-viewer`

- **描述**: Agent 完成长篇输出后，检测文本是否超过一屏，弹窗确认是否从开头查看，并提供全屏可滚动 overlay 查看器。支持 Markdown 渲染和完整键盘导航（↑↓/jk 逐行滚动、PgUp/Dn/Ctrl+u/d 翻页、Home/g/End/G 跳转、Esc/q 关闭）。
- **解决的问题**: 长篇 Agent 输出超过终端可见范围时，用户需手动向上滚动 scrollback 才能从开头阅读，打断阅读流。本扩展自动检测并弹出可选择的可滚动查看器。
- **源文件**: `.pi/extensions/output-scroll-viewer.ts`
- **OpenSpec Spec**: `openspec/specs/output-scroll-viewer/spec.md`

#### `subagent` (prompt)

- **描述**: 多 agent 编排 prompt，提供 `/subagent` 入口，引导主 agent 使用原生 `subagent` 工具完成 single/parallel/chain/async 工作流。
- **解决的问题**: 替代已移除的 `dispatch` 扩展，提供轻量编排指引，覆盖常用 delegation 模式和错误恢复。
- **源文件**: `.pi/prompts/subagent.md`

#### `init-command`

- **描述**: 提供 `/init` 命令，交互式初始化当前项目的 `.pi/` 目录配置，包括 AGENTS.md、settings.json 等基础文件。
- **解决的问题**: 新项目接入 Pi 时缺乏引导式初始化，需要手动创建配置文件。本扩展提供一键初始化体验。
- **源文件**: `.pi/extensions/init-command.ts`

#### `tool-counter-widget`

- **描述**: 在 Pi 界面中显示当前会话的工具调用计数 widget，实时追踪工具使用情况。
- **解决的问题**: 长 session 中难以追踪工具调用频率和模式，本扩展提供直观的工具使用统计。
- **源文件**: `.pi/extensions/tool-counter-widget.ts`

#### `add-provider`

- **描述**: 提供 `/add-provider` 命令，交互式添加自定义模型供应商到 `models.json`，支持输入 base URL、API key、模型列表等。
- **解决的问题**: 手动编辑 `models.json` 配置自定义供应商容易出错。本扩展通过交互式向导引导完成供应商配置。
- **源文件**: `.pi/extensions/add-provider.ts`

---

### 外部 Pi 包

定义在 `.pi/settings.json` 的 `packages` 数组中，通过 Pi 的包管理机制加载。

#### `@eko24ive/pi-ask`

- **来源**: `npm:@eko24ive/pi-ask`
- **描述**: 提供 `ask` 工具，允许 agent 在运行时向用户发起结构化多选/确认问题。
- **解决的问题**: 当 agent 需要用户决策时（如选择实现方案），无需中断对话，可通过 `ask` 工具发起即时交互。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-terminal-signals`

- **来源**: `git:github.com/lucasmeijer/pi-terminal-signals`
- **描述**: 捕获终端信号（如 SIGINT），在 Pi 中提供更优雅的中断处理。
- **解决的问题**: 默认终端信号处理可能导致 Pi 状态不一致，本包提供可靠的中断信号捕获。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-tool-display`

- **来源**: `git:github.com/MasuRii/pi-tool-display`
- **描述**: 在 Pi 界面中显示工具调用详情的可视化扩展。
- **解决的问题**: 工具调用的输入输出在默认界面中不易查看，本扩展提供更直观的工具执行展示。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-tab-status`

- **来源**: `npm:@tmustier/pi-tab-status`
- **描述**: 在多个终端 tab 运行 Pi 时，tab 标题显示 agent 执行状态图标（`:new` / `:running...` / `:✅` / `:🚧` / `:🛑`），方便区分各 tab 进度。
- **解决的问题**: 同时管理多个 Pi 会话时难以区分各 tab 状态的痛点。本包通过终端转义序列动态更新 tab 标题。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-powerline`

- **来源**: `git:github.com/jwu/pi-powerline`
- **描述**: 自定义 Pi editor 底部状态栏，提供 powerline 风格的状态栏、欢迎覆盖层、Git 状态、thinking 级别指示器、AI 主题加载语（Working Vibes）、编辑器 stash、bash mode 等功能。支持多个预设主题（`default`、`minimal`、`compact`、`full`、`nerd`、`ascii`）。
- **解决的问题**: Pi 原生状态栏信息有限，无法直观查看模型、成本、令牌消耗、Git 状态等关键运行时信息。本扩展将所有这些信息整合到编辑器顶部边框的 powerline 状态栏中。
- **引用**: `.pi/settings.json` → `packages`
- **OpenSpec 决策记录**: `openspec/pkg-backlog.md`

##### Nerd Font 配置工作流

pi-powerline-footer 的 Nerd Font 图标和 powerline 分隔符需要 Nerd Font 字体支持。以下是完整配置流程：

**1. 安装 Nerd Font**

```bash
# 以 JetBrainsMono Nerd Font 为例（推荐）
brew install --cask font-jetbrains-mono-nerd-font

# 其他选项（Meslo / FiraCode）
# brew install --cask font-meslo-lg-nerd-font
# brew install --cask font-fira-code-nerd-font
```

**2. 配置终端字体**

在终端模拟器中设置字体为 Nerd Font 变体：

| 终端 | 配置方式 |
|------|---------|
| **Ghostty** | `~/.config/ghostty/config.ghostty` 中加 `font-family = JetBrainsMono Nerd Font` |
| **iTerm2** | `Preferences → Profiles → Text → Font` 选择 `JetBrainsMonoNerdFont-Regular` |
| **Kitty** | `~/.config/kitty/kitty.conf` 中加 `font_family JetBrainsMono Nerd Font` |
| **Alacritty** | `~/.config/alacritty/alacritty.toml` 中加 `font.normal.family = "JetBrainsMono Nerd Font"` |
| **WezTerm** | `~/.config/wezterm/wezterm.lua` 中设 `font = wezterm.font("JetBrainsMono Nerd Font")` |

**3. 设置环境变量（可选，推荐）**

扩展会自动检测常见终端（iTerm2、WezTerm、Kitty、Ghostty、Alacritty）。对于 tmux、Warp、VS Code 集成终端等不在自动检测列表的终端，需要手动强制启用：

```bash
# ~/.zshrc（或其他 shell 配置）
export POWERLINE_NERD_FONTS=1
```

**4. 在 Pi 中切换到 Nerd 预设**

```bash
/powerline nerd    # 最大信息量预设
```

**5. 自定义图标（可选）**

创建 `~/.pi/agent/extensions/powerline-footer/theme.json` 覆盖任意图标：

```json
{
  "icons": {
    "pi": "🍕",
    "model": "🧠",
    "folder": "📁",
    "branch": "🌿",
    "git": "⎇",
    "tokens": "T",
    "context": "▣",
    "cost": "$",
    "time": "◷",
    "agents": "AG",
    "cache": "◇",
    "input": "→",
    "output": "←",
    "host": "💻",
    "session": "#",
    "auto": "⚡",
    "warning": "⚠"
  }
}
```

#### `pi-fff`

- **来源**: `npm:@ff-labs/pi-fff`
- **描述**: 高性能模糊文件搜索 Pi 扩展（基于 fff-core），支持跨会话 frecency 学习和查询历史持久化。通过 `FFF_FRECENCY_DB` 和 `FFF_HISTORY_DB` 环境变量配置 LMDB 数据库路径。
- **解决的问题**: Pi 内置文件搜索无使用频次记忆，高频访问文件的搜索排名无法随使用优化。pi-fff 通过 frecency 算法自动学习用户偏好，提升搜索精度。
- **引用**: `.pi/capabilities.yaml` → `global.settings.packages` + `global.env.pi-fff`
- **OpenSpec 决策记录**: `openspec/pkg-backlog.md`

#### 环境变量配置（`global.env` / `catalog.env`）

部分能力需要环境变量才能启用全部功能（如数据库路径、API key 等）。`capabilities.yaml` 通过 `global.env` 和 `catalog.env` 字段声明这些变量，**按能力 ID 分组**，与 `global.settings.packages`、`global.extensions`、`global.skills`、`global.agents` 中的能力条目对应。

```yaml
# global.env 示例：声明全局能力 pi-fff 需要的环境变量
global:
  env:
    pi-fff:                         # ← capability ID
      description: "fff fuzzy file finder — frecency & history databases"
      variables:
        FFF_FRECENCY_DB:
          value: "$HOME/.cache/pi/fff_frecency"
          description: "Path to LMDB frecency database for persistent ranking"
          required: true
        FFF_HISTORY_DB:
          value: "$HOME/.cache/pi/fff_history"
          description: "Path to LMDB history database for query persistence"
          required: true
```

```yaml
# catalog.env 预留：为 catalog 中的能力声明环境变量
# 由 install-from-pi-config 技能在安装时检查
catalog:
  env: {}  # 预留，暂无条目
```

**字段结构**：
- **Key**：能力 ID（与 packages/extensions/skills/agents 列表中的条目对应）
- **`variables`**：环境变量映射，每个变量支持 `value`（期望值）、`description`（用途说明）、`required`（是否必需）
- **`global.env`**：由 `sync-pi-agent.sh` 在全局同步时检查
- **`catalog.env`**：由 `install-from-pi-config` 技能在 catalog 安装时检查

**校验行为**：sync 脚本会检测孤立 env 块（能力 ID 无匹配），并在缺失/不匹配时给出修复命令。不自动修改 shell 配置文件。

当前仓库无自定义 agent 定义。使用 Pi 内置 agent（scout、planner、worker、reviewer、oracle 等）。

---

### 工作流技能

#### 元技能（Meta-skills）

##### `pi-extension-dev`

- **描述**: 指导 LLM 完成 Pi 扩展开发的完整生命周期：需求澄清 → 设计决策（事件、Tool vs Command、文件组织）→ OpenSpec 变更 → 实现 → 验证 → 部署同步 → 归档。
- **解决的问题**: 标准化扩展开发流程，确保每次扩展变更都有清晰的规范审查和验证步骤。
- **源文件**: `.pi/skills/pi-extension-dev/SKILL.md`
- **OpenSpec Spec**: `openspec/specs/pi-extension-dev-skill/spec.md`

##### `pkg-research`

- **描述**: 指导 LLM 完成第三方 Pi 包的研究评估：安全审查 → 隔离安装与研究 → 用户决策（全局/待定/丢弃）→ 全局同步。
- **解决的问题**: 引入外部包时缺乏安全审查和决策记录。本技能确保每个包都经过源码审查、结构分析和决策归档。
- **源文件**: `.pi/skills/pkg-research/SKILL.md`
- **OpenSpec Spec**: `openspec/specs/pkg-install-research/spec.md` / `openspec/specs/pkg-security-review/spec.md` / `openspec/specs/pkg-decision-backlog/spec.md` / `openspec/specs/pkg-global-sync/spec.md`

#### OpenSpec 工作流

OpenSpec 定义了完整的变更管理工作流（探索 → 提案 → 规格 → 设计 → 任务 → 实现 → 验证 → 同步 → 归档），详见 [OpenSpec 项目](https://github.com/Fission-AI/OpenSpec)。

本仓库的 OpenSpec 工作流技能位于 `.agents/skills/` 目录下。

---

### Subagent 模型覆盖

Pi 内置多个 subagent（如 `context-builder`、`oracle`、`planner` 等），可通过 `.pi/settings.json` 中的 `subagents.agentOverrides` 字段为不同 subagent 指定不同模型。

例如，为 `oracle` 和 `planner` 分配更强的模型以确保决策质量，为 `worker` 和 `scout` 分配更快/更便宜的模型以节约成本：

```json
{
  "subagents": {
    "agentOverrides": {
      "oracle": {
        "model": "provider/model-name"
      },
      "planner": {
        "model": "provider/model-name"
      }
    }
  }
}
```

未被覆盖的 subagent 会使用 `defaultModel` 指定的模型。也可通过 `defaultProvider` 统一切换 API 提供商。

---

### 配置与同步

#### `.pi/settings.json` 配置

`.pi/settings.json` 是仓库管理的 Pi 运行时配置文件，支持以下核心参数：

```json
{
  "defaultProvider": "your-provider",
  "defaultModel": "provider/model-name",
  "defaultThinkingLevel": "high",
  "packages": [...],
  "subagents": {
    "agentOverrides": { ... }
  }
}
```

- **`defaultProvider`** / **`defaultModel`**: 切换默认 API 提供商和模型
- **`defaultThinkingLevel`**: 控制深度思考级别（`off` / `low` / `medium` / `high`）
- **`packages`**: 添加或移除外部 Pi 包（包管理见 `pkg-research` 工作流）
- **`subagents.agentOverrides`**: 为不同 subagent 分配不同模型（见上方 Subagent 模型覆盖节）

#### `scripts/sync-pi-agent.sh` 同步机制

将仓库管理范围内的路径（`.pi/settings.json`、`.pi/extensions/`、`.pi/prompts/`、`.pi/themes/`、`.pi/agents/`、`.pi/agent/mcp.json`）同步到 `~/.pi/agent/`。

关键约束：
- **单向同步**: 仓库 → 运行时，运行时编辑不回写
- **覆盖式部署**: 每次同步完整覆盖目标路径
- **删除同步**: 仓库移除的路径，运行时对应路径也会被删除
- **运行时保留**: 管理集合之外的运行时内容不受影响

#### Closeout 治理流程

每次仓库配置变更完成后，需执行 `docs/pi-change-closeout-governance.md` 定义的治理流程：

1. 评估 `.pi/settings.json` 是否需要变更
2. 如果需要，在 verification 通过前更新
3. 用户确认是否需要同步到全局运行时
4. 记录同步结果（已同步 / 已拒绝 / 已推迟）

---

### OpenSpec 规划系统

`openspec/` 目录使用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 规范管理仓库的能力规格、变更生命周期和决策记录。涵盖自定义扩展、包管理、治理规则、subagent 调度等领域的能力规格。

核心目录结构：

```
openspec/
├── manifest.json    # 能力清单
├── specs/           # 能力规格说明（25+ 项）
├── changes/         # 活跃变更 & 已归档变更
└── pkg-backlog.md   # 外部包决策记录
```

---

## 工作流速查

| 场景 | 启动技能 | 关键文件 |
|---|---|---|
| **评估第三方 Pi 包** | `pkg-research` | `.pi/settings.json` → `packages` |
| **创建 Pi 扩展** | `pi-extension-dev` | `.pi/extensions/<name>.ts` |
| **启动新变更** | `openspec-new-change` / `openspec-propose` | `openspec/changes/<name>/` |
| **实现现有变更** | `openspec-apply-change` | `openspec/changes/<name>/tasks.md` |
| **验证变更完整性** | `openspec-verify-change` | `openspec/changes/<name>/verification.md` |
| **归档已完成变更** | `openspec-archive-change` | `openspec/changes/archive/` |
| **同步配置到全局** | — | `scripts/sync-pi-agent.sh`（需确认） |
| **查阅 closeout 治理** | — | `docs/pi-change-closeout-governance.md` |
| **OpenSpec 文档** | — | [github.com/Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) |

---

## 项目演进历史

仓库目前已完成 **14 个变更归档**，按类别统计：

| 类别 | 数量 | 归档示例 |
|---|---|---|
| 自定义扩展 | 3 | `dollar-skill-invoke`、`planner-toggle`、`planner-toggle-dedup` |
| 外部包管理 | 4 | `pkg-research-workflow`、`fix-global-subagent-package-delivery`、`phase2-pi-mcp-baseline`、`add-pi-subagent-baseline` |
| 治理与同步 | 3 | `govern-pi-config-closeout-sync`、`global-agent-md-tool-guide`、`fix-subagent-model-override` |
| 技能与蓝图 | 3 | `pi-extension-dev-skill`、`define-pi-customization-blueprint`、`establish-pi-config-hub-baseline` |
| 标准化 | 1 | `extension-dedup-standard` |

详细记录见 `openspec/changes/archive/`。

---

## 文件索引速查表

| 路径 | 说明 |
|---|---|
| `.pi/settings.json` | 全局配置：provider、model、packages、subagent overrides |
| `.pi/extensions/` | 自定义 TypeScript 扩展 |
| `.pi/agents/` | Agent 定义（当前无自定义 agent） |
| `.pi/skills/` | 元技能（pi-extension-dev、pkg-research） |
| `.agents/skills/` | OpenSpec 10 步工作流技能 + 全局 Superpowers |
| `openspec/manifest.json` | 能力清单（specs 映射） |
| `openspec/specs/` | 能力规格说明 |
| `openspec/changes/` | 活跃变更 & 存档 |
| `openspec/pkg-backlog.md` | 包决策记录 |
| `docs/pi-phase1-boundary.md` | 同步范围与合约定义 |
| `docs/pi-change-closeout-governance.md` | 变更 closeout 治理规则 |
| `scripts/sync-pi-agent.sh` | 仓库 → 全局运行时同步脚本 |
| `AGENTS.md` | 仓库工作流规则（永久记录在版本管理中的 Agent 指导） |

---

## README 维护工作流

本 README 是仓库的"活文档"，需要随仓库能力演化而持续更新。维护治理规则定义在 [AGENTS.d/readme-governance.md](.pi/agent/AGENTS.d/readme-governance.md)，能力列表以 `.pi/capabilities.yaml` 为准。

### 异常处理

| 场景 | 处理方式 |
|---|---|
| **自指跳过** | 当本节自身归档时，显式跳过 self-governance 检查并在 verification 中记录 |
| **新增数据类型** | 如果新增能力没有现有数据类型节，在 README 中新增适当节，并在后续定期审计中确认结构一致性 |
| **链接失效** | 如果源文件被移动或删除导致链接失效，verification 步骤会检测到并 block 变更通过 |

---

*README 最后更新: 2026-05-06*
