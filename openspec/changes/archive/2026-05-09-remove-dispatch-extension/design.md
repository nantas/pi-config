# Design

## Context

pi-config 仓库当前维护了一个 `subagent-dispatch` extension（基于 pi-subagents 0.20.1），提供 `dispatch` 工具和自然语言 `/dispatch` 命令作为多 agent 编排入口。pi-subagents 0.24 原生功能（intercom、resume、control events、contact_supervisor）已远超 dispatch 透传层的覆盖范围，保留 dispatch 反而成为功能升级和维护负担的瓶颈。

本 design 描述如何移除 dispatch extension 和 dispatch-planner agent，用一个轻量的 `.pi/prompts/subagent.md` prompt 文件替代，引导 LLM 直接使用原生 `subagent` 工具。

### 规范依据

- `specs/subagent-prompt-guide/spec.md` — 新 prompt 的行为规范
- `specs/pi-subagent-dispatch-baseline/spec.md` — 被废弃的 dispatch 能力规范

## Goals / Non-Goals

**Goals:**

1. **移除 dispatch extension** — 删除 `.pi/extensions/subagent-dispatch/` 整个目录（含 index.ts、core.js、node_modules）
2. **移除 dispatch-planner agent** — 删除 `.pi/agents/dispatch-planner.md`
3. **创建 `/subagent` prompt** — 提供 `.pi/prompts/subagent.md`，作为编排入口的轻量替代
4. **更新治理文件** — 更新 `.pi/capabilities.yaml`、`README.md`、`docs/getting-started.md`
5. **全局同步** — 通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`

**Non-Goals:**

- 不改动 `pi-subagent-agent-contract` spec（agent 契约标准不变）
- 不升级全局 pi-subagents 版本（保持 0.20.1，prompt 和 skill 兼容当前运行时接口）
- 不涉及其他仓库（pi-mono 或其他项目）的 dispatch 依赖变更
- 不改动其他 extension 或 agent（dollar-skill-invoke、planner-toggle 等保持不变）

## Decisions

### D1: Prompt 替代 Extension，而非 Skill

**选择**：创建 `.pi/prompts/subagent.md`（prompt 文件），而非在 skills/ 目录下创建新 skill。

**理由**：
- Prompts 是 pi 内置的轻量编排指引机制，自动注入 system prompt，无需额外 skill 加载流程
- pi-subagents 的 bundled skill 已提供完整 API 参考，prompt 只做精简命令式包装
- 移除 extension 后，prompt 作为唯一新增文件，维护成本接近零

### D2: Prompt 定位为"快速参考 + 迁移对照"，不重复 skill 内容

**选择**：prompt 只覆盖 single/parallel/chain/async 四种最常用模式 + dispatch 迁移映射，高级用法指向 pi-subagents skill。

**理由**：
- pi-subagents skill 已覆盖 intercom、control events、resume、agent management 等全部细节
- 保持 prompt 在一屏以内，减少 token 消耗
- 降低学习曲线：旧 dispatch 用户通过迁移映射快速上手

### D3: `projectContext` 差异由 Agent 定义层弥补

**选择**：不再支持 task-level `projectContext` 控制，改为 agent-level `inheritProjectContext`。

**理由**：
- pi-subagents 不在 task 层提供此控制
- 绝大多数场景中，agent 的上下文继承需求是固定的（而非每次调用都不同）
- 少数需要特殊处理的 agent 可通过 `.pi/agents/*.md` frontmatter 设置 `inheritProjectContext: true/false`

### D4: Extension 先建 prompt 再删除

**选择**：实施顺序为先创建 `.pi/prompts/subagent.md`，再删除 dispatch extension 和 dispatch-planner agent。

**理由**：
- 确保整个迁移过程中 orchestration 入口持续可用，无空窗期
- 如果 prompt 创建后发现问题，可以选择回退保留 extension

### D5: Swift 删除而非逐一解构

**选择**：删除整个 `.pi/extensions/subagent-dispatch/` 目录，而非逐一清理内部文件。

**理由**：
- extension 目录是自包含的（含 node_modules），无外部共享文件依赖
- `capabilities.yaml` 中移除对应条目后，下次同步时 Pi 运行时不会尝试加载
- 清理更彻底，无残留

## Risks / Migration

### Risk 1: `projectContext` 调用级控制丢失

- **影响**：极高。这是 dispatch 唯一真正超越 pi-subagents 原生能力的功能点。
- **缓解**：绝大部分场景使用 agent-level `inheritProjectContext` 即可覆盖。迁移前 audit 现有的 agent 定义，确保需要的 agent 设置了正确的 `inheritProjectContext`。
- **回退**：如果某工作流确实需要 task-level 控制，考虑 fork pi-subagents 或使用 minimial prompt extension 作为补充，但目前不纳入范围。

### Risk 2: 旧 dispatch 调用习惯迁移

- **影响**：中等。已有 session 记录中大量使用 `dispatch()` 工具，迁移后 LLM 需要适应 `subagent()`。
- **缓解**：prompt 中包含 dispatch→subagent 迁移映射表，降低惯性冲突。

### Risk 3: pi-subagents 运行时接口变化

- **影响**：低。当前全局 pi-subagents 0.20.1 的接口与 bundled skill 描述可能不完全匹配。
- **缓解**：prompt 引用的内容以实际运行时行为为准。如果子 agent 执行时发现接口差异，通过 `subagent({ action: "list" })` 和 `subagent({ action: "doctor" })` 验证。

### Risk 4: 全局同步前未清理的本地引用

- **影响**：低。`scripts/sync-pi-agent.sh` 会将当前 repo 的 `.pi/` 状态同步到 `~/.pi/agent/`。如果 dispatch extension 在 capabilities.yaml 中被移除，同步后全局也不会加载。
- **缓解**：实施顺序确保先移除引用再同步，避免中间状态。

### Migration 步骤摘要

1. 创建 `.pi/prompts/subagent.md`
2. 删除 `.pi/extensions/subagent-dispatch/`
3. 删除 `.pi/agents/dispatch-planner.md`
4. 更新 `.pi/capabilities.yaml`
5. 更新 `README.md`
6. 更新 `docs/getting-started.md`
7. 验证（功能 + 无残留引用）
8. 全局同步（用户确认后）
