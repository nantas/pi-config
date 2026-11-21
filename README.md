# pi-config

**pi-config** 是一个集中式 Pi 编码代理（Pi coding agent）配置仓库，管理所有自定义扩展、外部包、治理工作流、Agent 定义与 OpenSpec 规划系统。通过结构化分层与版本控制，实现 Pi 运行时的可追溯、可审计、可复用配置管理。

---

## 新手上路

> 在开始之前，请确保你已经[安装并可以运行 Pi](https://pi.dev/docs/latest/installation)。

如果你是第一次使用本仓库，请阅读 [docs/getting-started.md](docs/getting-started.md)，按照六个步骤完成 Pi 环境配置和全局同步：安装 Pi CLI → 配置模型供应商 → 查看能力清单 → 确认同步范围 → 执行全局同步 → 验证环境。

---

## 架构分层概览

仓库按数据类型分为五个层级，每层承担不同角色：

```
┌──────────────────────────────────────────────────────────────┐
│                     .pi/ (仓库管理源)                        │
│  settings.json  extensions/  agents/  packages/  prompts/   │
│  herdr-templates/  — hc 终端模板（→ ~/.config/herdr-core/） │
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

#### `init-command`

- **描述**: 提供 `/init` 命令，交互式初始化当前项目的 `.pi/` 目录配置，包括 AGENTS.md、settings.json 等基础文件。
- **解决的问题**: 新项目接入 Pi 时缺乏引导式初始化，需要手动创建配置文件。本扩展提供一键初始化体验。
- **源文件**: `.pi/extensions/init-command.ts`

#### `tool-counter-widget`

- **描述**: 在 Pi 界面中显示当前会话的工具调用计数 widget，实时追踪工具使用情况。
- **解决的问题**: 长 session 中难以追踪工具调用频率和模式，本扩展提供直观的工具使用统计。
- **源文件**: `.pi/extensions/tool-counter-widget.ts`

#### `bash-search-guard`

- **描述**: 全局运行时护栏，拦截 agent 通过 bash 执行 `grep`/`egrep`/`fgrep`/`rg`/`find` 做仓库搜索的命令（作为命令或管道起点），引导改用 Pi 内置 `grep`/`find` 工具；同时改写 bash 工具的 system prompt 描述并追加强约束 guideline。管道下游过滤（如 `ps aux | grep node`、`git log | grep feat`）和非递归 `-q` 存在性检查、`find -delete` 等运维操作保持放行。仅在 `getActiveTools()` 包含对应工具时生效。
- **解决的问题**: 尽管全局 AGENTS.md 已规定禁用 bash 检索仓库，agent 仍频繁用 `grep -rn`/`find . -name` 全仓扫描；本扩展在运行时层面强制拦截并给出正确工具引导。
- **源文件**: `.pi/extensions/bash-search-guard.ts`
- **测试**: `tests/bash-search-guard.test.ts`（`node --test tests/bash-search-guard.test.ts`，零外部依赖）

#### `hc-delegation`

- **描述**: 按运行时角色（`hc_lead` / `hc_worker` / `hc_peer` / `subagent` / `standalone`）动态管理委派行为的护栏：提供 `hc_worker` / `hc_report` 工具，按角色注入系统提示 `<section>`，实施 Lead 委派硬拦截（仓库无关的多文件写入拦截——对所有路径一视同仁，含 OpenSpec 工件/spec/plan/ADR 等流程化产物，交由 `hc_worker` 按固定流程产出；多次直接探查提醒；裸跑 `hc run <template>` 重定向）、验证分工提醒（Worker 执行构建/测试/lint/验证命令并回报观测输出或日志路径，Lead 直接跑验证套件时收到非阻塞 `[hc-delegation]` 提醒，专注审查证据与 diff）与 Worker/Peer/Subagent 反递归硬拦截，支持 `/hc-guard`、`/hc-role` 命令。
- **解决的问题**: 原先静态写在 `.pi/agent/AGENTS.md` 与 `AGENTS.d/hc-delegation.md`、`AGENTS.d/subagent-usage.md` 里的委派总则被无条件注入所有角色，易错流程（SPACE_ID/TAB_ID 反查、first_message 校验等）交给模型手写胶水；本扩展改为运行时按角色动态注入与强制拦截，静态文档已删除。
- **源文件**: `.pi/extensions/hc-delegation.ts`
- **测试**: `tests/hc-delegation.test.ts`（`node --test tests/hc-delegation.test.ts`，零外部依赖）

---

### 外部 Pi 包

定义在 `.pi/settings.json` 的 `packages` 数组中，通过 Pi 的包管理机制加载。

#### `pi-ask`

- **来源**: `git:github.com/jwu/pi-ask`
- **描述**: 提供 `ask_user` 工具，允许 agent 在运行时向用户发起结构化多选/确认问题。
- **解决的问题**: 当 agent 需要用户决策时（如选择实现方案），无需中断对话，可通过 `ask_user` 工具发起即时交互。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-tool-display`

- **来源**: `git:github.com/nantas/pi-tool-display`
- **描述**: 在 Pi 界面中显示工具调用详情的可视化扩展。
- **解决的问题**: 工具调用的输入输出在默认界面中不易查看，本扩展提供更直观的工具执行展示。
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

#### 模型配置

在 Magpie 中管理 Pi 的默认模型和切换范围。当前仓库未声明共享供应商，全局同步会跳过 `~/.pi/agent/models.json`，并保留 Magpie 写入本机 `settings.json` 的模型设置。

#### 环境变量配置（`global.env` / `catalog.env`）

部分能力需要环境变量才能启用全部功能（如数据库路径、API key 等）。`capabilities.yaml` 通过 `global.env` 和 `catalog.env` 字段声明这些变量，**按能力 ID 分组**，与 `global.settings.packages`、`global.extensions`、`global.skills`、`global.shared_skills`、`global.agents` 中的能力条目对应。

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
- **Key**：能力 ID（与 packages/extensions/skills/shared_skills/agents 列表中的条目对应）
- **`variables`**：环境变量映射，每个变量支持 `value`（期望值）、`description`（用途说明）、`required`（是否必需）
- **`global.env`**：由 `sync-pi-agent.sh` 在全局同步时检查
- **`catalog.env`**：由 `install-from-pi-config` 技能在 catalog 安装时检查

**校验行为**：sync 脚本会检测孤立 env 块（能力 ID 无匹配），并在缺失/不匹配时给出修复命令。不自动修改 shell 配置文件。

当前仓库定义 3 个 agent（`.pi/agents/`），模型走 Magpie 路由分组：

| Agent | 模型 | 用途 |
|-------|------|------|
| `worker` | `magpie/group/grunt` | 实施执行 |
| `reviewer` | `magpie/group/grunt` | 实施后审查 |
| `researcher` | `magpie/group/workhorse` | 外部资料调研 |

仓库同时托管 hc（herdr-core）终端模板 `.pi/herdr-templates/`，经 `global.hc_templates` 同步到 `~/.config/herdr-core/templates/`（只增不删）。模板为纯 YAML frontmatter 启动清单（仅 `description` + `command`，正文为空），worker 角色提示由 `hc-delegation` 扩展在运行时注入：

| 模板 | 模型 | 用途 |
|------|------|------|
| `grunt` | `magpie/group/grunt` | 常规实施：多文件编辑、批量改动、审查、探索 |
| `workhorse` | `magpie/group/workhorse` | 复杂实施：架构级改动、难调试、深度调研 |
| `peer` | 默认模型 | 同空间 peer 协作（发现同空间 agent 并互发消息） |

---

### 工作流技能

#### 全局技能（Global skills）

##### `install-from-pi-config`

- **描述**: 跨仓库能力安装器。读取 `~/.pi/agent/catalog/pi-config.yaml` 里的 catalog，把 skill / extension / package 装进当前项目的 `.pi/` 目录。
- **解决的问题**: 一个能力要复用到多个项目时全靠手工复制，容易版本漂移；本 skill 把「从 catalog 选能力并落地」收敛成一条命令。
- **源文件**: `.pi/skills/install-from-pi-config/SKILL.md`
- **范围**: 只管仓库内 `.pi/` 的能力安装；直接装 npm/git 包用 `pi install -l`。

##### `notion`

- **描述**: 通过 `ntn` CLI 读取、搜索、查询和编辑 Notion 页面与数据库。
- **解决的问题**: Notion 内容不在文件系统里，Agent 无法直接检索或改写；本 skill 给出统一的读写入口与查询方式。
- **源文件**: `.pi/skills/notion/SKILL.md`

##### `x-reach`

- **描述**: 专门用于 X/Twitter 的稳定检索通道，twscrape 账号池驱动（账号轮换抗限流 + SQLite 持久会话 + JSONL 输出）。
- **解决的问题**: X 检索容易限流、账户容易被风控，单账号跑批量任务经常中断；本 skill 用账号池与持久会话把批量检索做成可复现流程。
- **源文件**: `.pi/skills/x-reach/SKILL.md`
- **依赖**: `twscrape` CLI；未初始化时先跑 `scripts/x-reach-init.sh`。
- **范围**: 只读，不支持发帖/点赞/关注。

##### `worktrunk-isolation`

- **描述**: 让 Agent 用社区工具 worktrunk（CLI `wt`）管理 git worktree，给多 session 并行作业做文件系统隔离，并强制人确认合入门禁。
- **解决的问题**: 多 session 同仓并行时 agent 工作互相覆盖、且无人确认就擅自合入。本 skill 用 worktree 隔离各 session 工作树，并把 merge/remove 锁在用户明确确认后。
- **源文件**: `.pi/skills/worktrunk-isolation/SKILL.md`
- **依赖**: 运行时需要本机安装 `worktrunk`（`brew install worktrunk`）；preflight 缺失时给出安装指引，skill 本身不安装 CLI。
- **范围**: 管隔离与门禁，不管多 agent 编排（不做任务板/端口分配/worklease）。

#### 共享层技能（Shared skills → `~/.agents/skills/`）

##### `agent-reach`

- **描述**: 互联网平台能力路由器。指导 Agent 通过上游 CLI/API 读取与搜索 15+ 平台（网页、YouTube、GitHub、Twitter、Reddit、B站、小红书、雪球金融行情等）；多后端路由，`agent-reach doctor` 体检。
- **解决的问题**: 各平台接入方式分散、易失效，Agent 需反复选型/配置。本 skill 提供统一路由表与命令参考。
- **源文件**: `.pi/skills/agent-reach/SKILL.md`（含英文版 `SKILL_en.md`）
- **安装位置**: `~/.agents/skills/agent-reach/`（经 `global.shared_skills` 同步，供 pi 与其他 harness 共用；同步只替换声明条目，不清理共享目录其他内容）
- **依赖**: 运行时需要本机安装 Python CLI `agent-reach`（及可选上游工具）；skill 本身不安装 CLI。
- **注意**: 触发面很广（调研/搜索/各平台 URL），可能与内置 `webfetch` / X 搜索等工具路由重叠，Agent 需按任务选择。

#### 元技能（Meta-skills）（Meta-skills）

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

### Subagent 模型

Agent 的模型写在 `.pi/agents/<name>.md` 的 frontmatter `model:` 字段，不通过 `settings.json` 的 `subagents.agentOverrides` 配置（当前 subagent 扩展不支持该键）。

本仓库的 agent 统一使用 Magpie 路由分组，不在 agent 文件里写死具体模型：

| Agent | model |
|-------|-------|
| `worker` | `magpie/group/grunt` |
| `reviewer` | `magpie/group/grunt` |
| `researcher` | `magpie/group/workhorse` |

分组内的实际模型由 Magpie 的 `magpie/group/<id>` 定义决定，换模型只需改分组，不用改 agent 文件。

---

### 配置与同步

#### `.pi/settings.json` 配置

`.pi/settings.json` 是仓库管理的 Pi 运行时配置文件，支持以下核心参数：

```json
{
  "defaultProvider": "your-provider",
  "defaultModel": "provider/model-name",
  "defaultThinkingLevel": "high",
  "packages": [...]
}
```

- **`defaultProvider`** / **`defaultModel`**: 切换默认 API 提供商和模型
- **`defaultThinkingLevel`**: 控制深度思考级别（`off` / `low` / `medium` / `high`）
- **`packages`**: 添加或移除外部 Pi 包（包管理见 `pkg-research` 工作流；agent 模型写在 `.pi/agents/<name>.md` 的 `model:` 字段，不通过 settings.json 覆盖）

#### `scripts/sync-pi-agent.sh` 同步机制

将仓库管理范围内的路径（`.pi/settings.json`、`.pi/extensions/`、`.pi/prompts/`、`.pi/themes/`、`.pi/agents/`、`.pi/agent/mcp.json`）同步到 `~/.pi/agent/`。

关键约束：
- **单向同步**: 仓库 → 运行时，运行时编辑不回写
- **覆盖式部署**: 每次同步完整覆盖目标路径
- **删除同步**: 仓库移除的路径，运行时对应路径也会被删除
- **运行时保留**: 管理集合之外的运行时内容不受影响（`global.external_extensions` 声明的扩展由外部工具管理，同步不触碰）

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
| 自定义扩展 | 3 | `dollar-skill-invoke`、`init-command`、`bash-search-guard` |
| 外部包管理 | 4 | `pkg-research-workflow`、`fix-global-subagent-package-delivery`、`phase2-pi-mcp-baseline`、`add-pi-subagent-baseline` |
| 治理与同步 | 3 | `govern-pi-config-closeout-sync`、`global-agent-md-tool-guide`、`fix-subagent-model-override` |
| 技能与蓝图 | 3 | `pi-extension-dev-skill`、`define-pi-customization-blueprint`、`establish-pi-config-hub-baseline` |
| 标准化 | 1 | `extension-dedup-standard` |

详细记录见 `openspec/changes/archive/`。

---

## 文件索引速查表

| 路径 | 说明 |
|---|---|
| `.pi/settings.json` | 全局配置：provider、model、packages |
| `.pi/extensions/` | 自定义 TypeScript 扩展 |
| `.pi/agents/` | Agent 定义（worker / researcher / reviewer） |
| `.pi/herdr-templates/` | hc 终端模板（global.hc_templates → `~/.config/herdr-core/templates/`，只增不删） |
| `.pi/skills/` | 同步技能源（global.skills → `~/.pi/agent/skills/`；global.shared_skills → `~/.agents/skills/`） |
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
