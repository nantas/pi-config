# pi-config

**pi-config** 是一个集中式 Pi 编码代理（Pi coding agent）配置仓库，管理所有自定义扩展、外部包、治理工作流、Agent 定义与 OpenSpec 规划系统。通过结构化分层与版本控制，实现 Pi 运行时的可追溯、可审计、可复用配置管理。

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

---

### 外部 Pi 包

定义在 `.pi/settings.json` 的 `packages` 数组中，通过 Pi 的包管理机制加载。

#### `pi-mcp-adapter`

- **来源**: `npm:pi-mcp-adapter@2.5.1`
- **描述**: MCP（Model Context Protocol）适配器，使 Pi 能够与 MCP 服务器通信并调用其工具。
- **解决的问题**: 扩展 Pi 的工具调用能力，接入外部 MCP 生态系统（文件系统、数据库、API 等）。
- **引用**: `.pi/settings.json` → `packages`

#### `subagent-dispatch`

- **来源**: `./packages/subagent-dispatch`（本地包，替代 `npm:pi-subagents`）
- **描述**: Subagent 调度引擎，支持在单次会话中并行或串行派生子 agent 执行独立任务。
- **解决的问题**: Pi 原生不支持多 agent 协作。本包提供了 `dispatch` 工具，使主 agent 可以委派子任务给专用子 agent，实现并行开发、多视角审查等模式。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-ask-tool-extension`

- **来源**: `npm:pi-ask-tool-extension`
- **描述**: 提供 `ask` 工具，允许 agent 在运行时向用户发起结构化多选/确认问题。
- **解决的问题**: 当 agent 需要用户决策时（如选择实现方案），无需中断对话，可通过 `ask` 工具发起即时交互。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-tab-status`

- **来源**: `npm:@tmustier/pi-tab-status`
- **描述**: 在多个终端 tab 运行 Pi 时，tab 标题显示 agent 执行状态图标（`:new` / `:running...` / `:✅` / `:🚧` / `:🛑`），方便区分各 tab 进度。
- **解决的问题**: 同时管理多个 Pi 会话时难以区分各 tab 状态的痛点。本包通过终端转义序列动态更新 tab 标题。
- **引用**: `.pi/settings.json` → `packages`

#### `pi-powerline-footer`

- **来源**: `npm:pi-powerline-footer` | [GitHub](https://github.com/nicobailon/pi-powerline-footer)
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

---

### Agent 定义

位于 `.pi/agents/` 下，定义仓库专用的 Agent 角色和委托合约。

#### `code-writer`

- **角色**: 仓库本地实现专家。专注于小型、目标明确的编码任务。
- **解决的问题**: 为 dispatch 系统提供专用的实现 Agent，避免主 Agent 上下文被实现细节污染。
- **源文件**: `.pi/agents/code-writer.md`

#### `dispatch-planner`

- **角色**: 规划委托 Agent。专注于任务分解和执行规划。
- **解决的问题**: 在 dispatch 流程中，将规划工作分离给专用 Agent，利用 `pi-subagents` skill 进行结构化任务分解。
- **源文件**: `.pi/agents/dispatch-planner.md`

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

将仓库管理范围内的路径（`.pi/settings.json`、`.pi/extensions/`、`.pi/packages/`、`.pi/prompts/`、`.pi/themes/`、`.pi/agents/`）同步到 `~/.pi/agent/`。

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
| `.pi/agents/` | Agent 定义（code-writer、dispatch-planner） |
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

本 README 是仓库的"活文档"，需要随仓库能力演化而持续更新。以下定义了自动维护治理工作流。

### 触发条件

当以下任一场景发生时，当前变更的实施者**必须**评估是否需要更新 README：

| 触发场景 | 条件 | 操作 |
|---|---|---|
| **新增扩展** | 新文件添加到 `.pi/extensions/` | 更新"自定义扩展"节 |
| **新增全局包** | 通过 `pkg-research` 将包加入 `settings.json` `packages` | 更新"外部 Pi 包"节 |
| **仅待定包** | 包被记录到 `pkg-backlog.md` 而非全局添加 | **不更新** README |
| **新增 Skill/Agent** | 新 skill/agent 加入 `.pi/skills/` 或 `.pi/agents/` | 更新对应数据类型节 |
| **新增 Capability Spec** | 新能力规格加入 `openspec/specs/` | 如为用户可见能力，更新对应节或新增节 |
| **纯 bugfix/内部重构** | 无新增用户可见能力 | **不更新** README |

### 更新检查清单

当需要更新 README 时，依次执行以下步骤：

1. **在正确的数据类型节添加条目** — 不要创建重复的节
2. **包含三项内容**：名称、功能说明、解决的问题
3. **添加源文件相对路径链接**
4. **添加 OpenSpec spec 链接**（如适用）
5. **验证所有现有链接仍然有效**
6. **验证节顺序保持不变**
7. **最终完整性检查**：无坏链、无占位符文本（如 TBD）



### 异常处理

| 场景 | 处理方式 |
|---|---|
| **自指跳过** | 当本节自身（`comprehensive-readme-and-automation-governance`）归档时，显式跳过 self-governance 检查并在 verification 中记录 |
| **新增数据类型** | 如果新增能力没有现有数据类型节，在 README 中新增适当节，并在后续定期审计中确认结构一致性 |
| **链接失效** | 如果源文件被移动或删除导致链接失效，verification 步骤会检测到并 block 变更通过 |

---

*README 最后更新: 2026-04-30*
