# Design

## Context

当前全局安装 `pi-subagents@0.24.0`（`@mariozechner/*` peer deps），与 pi-core `@earendil-works/pi-coding-agent@0.75.3` 的 dependency scope 不匹配。新版 `@johnnywu/pi-subagents@1.5.0` 使用 `@earendil-works/*` peer deps，完全兼容。新版采用精简架构：仅提供 extension（无 skills/prompts），agent 通过 `.pi/agents/*.md` frontmatter 文件定义。

Agent 配置当前分散在两处：
- **全局** `~/.pi/agent/settings.json` 的 `subagents.agentOverrides`：7 个 agent（context-builder, oracle, planner, researcher, reviewer, scout, worker）
- **项目** `.pi/settings.json` 的 `subagents.agentOverrides`：2 个 agent（scout, worker），覆盖全局配置

新版不读取 `subagents.agentOverrides`，所有 agent 配置必须通过 `.md` 文件提供。

## Goals / Non-Goals

**Goals:**
- 完成包替换：卸载旧版，安装新版
- 将 7 个 agentOverrides 中的 agent 迁移为 `.pi/agents/*.md` 文件
- 清理 settings.json 中不再需要的 `subagents` 配置
- 更新 capabilities.yaml 保持 single source of truth
- 通过 sync 脚本同步到全局

**Non-Goals:**
- 补全新版缺失的 chain/parallel/async 功能
- 编写替代旧版 pi-subagents skill 的文档
- 迁移旧版 prompt 模板
- 配置新版高级 frontmatter 字段（allowedAgents, maxDepth, debug, skills）

## Decisions

### D1: Agent 文件放置位置

**决策**: 在 `.pi/agents/` 目录创建 agent 定义文件（项目级）。

**理由**: 新版 agent-loader 扫描 `~/.pi/agent/agents/`（全局）和 `.pi/agents/`（项目）。capabilities.yaml 的 `global.agents` 列表已包含 `unity-worker`，说明全局 agents 通过 sync 脚本从 `.pi/agents/` 同步到 `~/.pi/agent/agents/`。因此项目级 `.pi/agents/` 是正确的创建位置。

### D2: Agent 迁移策略

**决策**: 将项目 `.pi/settings.json` 中的 override 作为主要源（它覆盖全局），为每个 agent 创建独立 `.md` 文件。对于全局 `settings.json` 中存在但项目级未覆盖的 agent（context-builder, oracle, planner, researcher, reviewer），使用全局配置的值创建文件。

**映射**:
| Agent | Model | Thinking | Tools 来源 | Prompt Body |
|-------|-------|----------|-----------|-------------|
| scout | zhipuai-coding-plan/glm-5.1 | minimal | 项目 override | 角色描述 |
| worker | zhipuai-coding-plan/glm-5.1 | low | 项目 override | 角色描述 |
| context-builder | deepseek/deepseek-v4-flash | high | 全局 override | 角色描述 |
| oracle | deepseek/deepseek-v4-flash | medium | 全局 override | 角色描述 |
| planner | deepseek/deepseek-v4-flash | high | 全局 override | 角色描述 |
| researcher | kimi-coding/kimi-for-coding | high | 全局 override | 角色描述 |
| reviewer | kimi-coding/kimi-for-coding | high | 全局 override | 角色描述 |

### D3: Settings 清理策略

**决策**: 完全移除 `subagents` key（包括 `subagents.agentOverrides`）。新版不读取此配置，保留会造成混淆。

**影响范围**:
- `.pi/capabilities.yaml`: 移除 `global.settings.subagents`
- `.pi/settings.json`: 移除 `subagents` key
- `~/.pi/agent/settings.json`: sync 后自动移除

### D4: Package 替换顺序

**决策**: 先卸载旧版 `pi-subagents@0.24.0`，再安装新版 `@johnnywu/pi-subagents@1.5.0`。

**理由**: 避免两个包同时存在导致冲突。旧版和新版包名不同，但功能注册可能冲突。

### D5: capabilities.yaml agents 列表更新

**决策**: 在 `global.agents` 列表中追加所有 7 个新 agent 文件名，确保 sync 脚本正确同步到全局。

### D6: existing unity-worker.md 保留

**决策**: 已存在的 `.pi/agents/unity-worker.md` 保持不变，不做修改。

## Risks / Migration

### R1: 功能降级
新版不支持 chain/parallel/async/slash commands。主 agent 仍可直接调用新版 `subagent({ agent, task })` 执行单个 agent 任务，但无法使用 chain 管道和并行执行模式。
**缓解**: 用户已明确了解并接受此降级。后续可按需添加。

### R2: 旧版 skill 注入消失
旧版提供的 `pi-subagents` skill 是一个非常详尽的编排指南（~400 行），注入到每个 session 的 system prompt 中。新版不提供此 skill，主 agent 在编排 subagent 时不再有详细指引。
**缓解**: 当前 session 中的 skill 列表仍有 `pi-subagents`（来自旧版安装），在新版安装后新 session 将不再注入。可在后续按需创建项目级 skill 替代。

### R3: Agent prompt body 需要手写
旧版内置 8 个 agent（含完整 prompt body）。新版不捆绑 agent，所有 prompt body 需自行编写。
**缓解**: 当前 settings.json 中的 override 不含 prompt body（只有 model/thinking/tools），新版 agent 文件的 prompt body 将编写简洁的角色描述。这是可接受的起点。
