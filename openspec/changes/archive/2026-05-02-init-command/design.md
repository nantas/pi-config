# Design

## Context

Pi 缺少一个仓库初始化命令。OpenCode 的 `/init` 命令使用 prompt 模板指导 LLM 自主分析仓库并生成 AGENTS.md，设计精巧且效果好。Pi 可以通过扩展系统注册一个等价的 `/init` 命令，复用 Pi 已有的工具链和 AGENTS.md 机制。

核心设计思路：**不写硬编码分析逻辑，而是通过精心设计的 prompt 模板让 LLM 自主完成分析到产出的完整流程**。

参见：`specs/init-command/spec.md`（规范真源）。

## Goals / Non-Goals

**Goals:**
- 注册 `/init` 斜杠命令，支持可选焦点参数
- 提供 prompt 模板指导 LLM 完成仓库结构分析
- 支持创建新 AGENTS.md 和就地更新已有 AGENTS.md
- 处理已有 AGENTS.md 的结构兼容性（相似结构 vs 不同结构的两种路径）
- 遵循全局扩展的 dedup + session_shutdown 规范

**Non-Goals:**
- 不注册独立的 `question` 工具（LLM 直接对话提问）
- 不修改 Pi 内置工具集
- 不支持模板内嵌 shell 命令执行（OpenCode 的 `${...}` 语法）
- 不在 catalog 中注册（pi-config 仓库内建，global 范围）

## Decisions

### D1: 命令 vs 工具

- **决策**: `pi.registerCommand("init", ...)` — 斜杠命令
- **理由**: `/init` 是用户主动触发的分析任务，不是 LLM 自主调用的工具。
- **替代方案**: `pi.registerTool()` 被排除，因为 LLM 不应该在没有用户指引的情况下自行决定重写 AGENTS.md。

### D2: 当前 session 运行

- **决策**: 在当前 session 中通过 `ctx.sendUserMessage()` 将 prompt 注入给 LLM
- **理由**: 用户能看到完整分析过程、LLM 直接交互提问、AGENTS.md 产出后立即可用。不引入子 session 的复杂度。
- **事项**: 消耗当前 session 的 token 预算，但 `/init` 是一次性操作，可接受。

### D3: 提问方式

- **决策**: LLM 直接在对话中向用户提问，不额外注册 `question` 工具
- **理由**: 用户已有类似工具配置，无需强耦合。LLM 在对话中自然提问即可。

### D4: 已有 AGENTS.md 处理策略

- **决策**: 两步判断法
  - **结构类似** → 询问用户是否按现有结构就地更新
  - **结构完全不同** → 警告用户将完全重写，确认后才继续
- **理由**: 用户要求保守策略，避免意外覆盖有价值的已有内容。

### D5: 扩展范围

- **决策**: Global 范围，`global.extensions` 中注册
- **理由**: AGENTS.md 初始化是跨仓库通用需求，所有项目都应可用。

### D6: 文件组织

- **决策**: 单文件 `.pi/extensions/init-command.ts`
- **理由**: 无外部 npm 依赖，纯 TypeScript + prompt 模板字符串。不需要 `package.json`。

### D7: Prompt 模板存储

- **决策**: prompt 模板作为 TypeScript 模板字符串嵌入在扩展文件中
- **理由**: 单文件模式。OpenCode 使用独立 `.txt` 文件，但对 Pi 扩展来说，内嵌在代码中更整洁，便于浏览和版本管理。

### D8: Dedup + session_shutdown 模式

- **决策**: 遵循 pi-extension-dev 技能指定的 `globalThis` 自去重 + `session_shutdown` 清除模式
- **理由**: 全局扩展会被同步到 `~/.pi/agent/extensions/`，可能和项目目录下的副本冲突。缺少 session_shutdown 会导致 session 替换后扩展静默失效。

## Risks / Migration

- **Token 消耗**: `/init` 分析大型仓库可能消耗较多 token。用户可通过焦点参数缩小范围。
- **第一次运行**: 安装后需重启 Pi 或运行 `/reload` 激活扩展。
- **Global 同步**: 扩展部署后需运行 `scripts/sync-pi-agent.sh` 才能在所有项目中生效。
- **AGENTS.md 覆盖风险**: 通过两步判断法（结构检查 + 用户确认）将风险降至最低。
- **无回滚机制**: AGENTS.md 更新后没有自动回滚。用户在确认前应通过 git check 当前 AGENTS.md 状态。
