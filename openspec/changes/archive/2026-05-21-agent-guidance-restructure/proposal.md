# Proposal

## 问题定义

当前 `.pi/agent/AGENTS.md`（全局 Agent 行为指导）和 `.pi/agent/AGENTS.d/` 目录篇幅臃肿，混合了高频核心规则与低频参考信息，导致：

1. **约束效力稀释** — system prompt 中 AGENTS.md 内容过长（~500 行），核心规则被低频参考细节淹没，agent 对高频规则的遵从度随内容量增加而下降
2. **项目级 AGENTS.md 被屏蔽** — 全局 AGENTS.md 注入到所有会话上下文，与项目级规则争夺约束权重
3. **冗余技能存在** — `lsp-code-intelligence` skill 指导 agent 使用 Pi 内建 `lsp` 工具，但 serena MCP 工具已接入并提供了更完善的 LSP 能力
4. **不必要的 AGENTS.d 文件** — `tool-ask-user.md`、`output-quality.md`、`tool-mcp.md` 内容低频或不复相关
5. **参考文档位置不合适** — `pi-provider-model.md` 和 `readme-governance.md` 内容详实但低频，放在 AGENTS.d/ 不恰当，应移到 `docs/reference/`

## 范围边界

### 范围内
- `.pi/agent/AGENTS.md` 内容精简与结构调整
- `.pi/agent/AGENTS.d/` 的文件增删
- `docs/reference/` 参考文档的新建
- `.pi/skills/` 中 `serena-code-intelligence` skill 的新建
- `.pi/skills/` 中 `lsp-code-intelligence` skill 的删除
- 仓库根 `AGENTS.md` 的项目级引用更新
- `.pi/capabilities.yaml` 的 skill 列表更新
- 全局 `.pi/agent/AGENTS.md` 通过 `scripts/sync-pi-agent.sh` 同步（opsx-closeout 阶段执行）

### 范围外
- serena 本身的安装和 MCP 配置（已在当前会话中完成）
- `~/.pi/agent/mcp.json` 的修改
- `~/.pi/agent/settings.json` 的修改
- 其他 skill（pkg-research、pi-extension-dev、pkg-fork-dev 等）的内容调整
- `.pi/agent/AGENTS.d/subagent-usage.md` 的内容（已合理放在 AGENTS.d 按需加载）
- 其他仓库的 AGENTS.md

## Capabilities

### New Capabilities

- `serena-code-intelligence`: 创建 serena 工具的完整使用指南 skill，包含工具概览、使用场景决策表、项目初始化工作流、代码探索与编辑最佳实践。替代已废弃的 `lsp-code-intelligence`

### Modified Capabilities

- `reference-docs-consolidation`: 将 `pi-provider-model` 和 `readme-governance` 从 AGENTS.d/ 迁移到 `docs/reference/`，更新全局 AGENTS.md 引用路径，更新项目级 AGENTS.md 添加引用链接
- `agent-guidance-simplify`: 精简全局 `.pi/agent/AGENTS.md` 内容，删除对已废弃 AGENTS.d/ 文件的引用（`tool-ask-user`、`output-quality`、`tool-mcp`、`lsp-guide`），移除低频内联细节（Web Search 参数表、Subagent 选择矩阵等），保留高频核心规则

## Capabilities 待确认项

- [ ] 能力清单已与用户确认（如未确认，请记录待确认问题）

## Impact

### 正面影响

| 影响 | 程度 |
|------|------|
| 全局 AGENTS.md 长度缩减 | ~500 行 → ~80 行 |
| agent 对高频规则的遵从度 | 提升（核心规则不再被低频内容稀释） |
| 项目级 AGENTS.md 的约束效力 | 提升（系统提示更精简，项目级上下文占比更高） |
| serena 工具的自主发现率 | 提升（有明确的 skill 引导 agent 使用） |

### 负面影响/迁移成本

| 影响 | 说明 |
|------|------|
| 删除的 AGENTS.d 文件 | `tool-ask-user`、`output-quality`、`tool-mcp` — 不再有 agent 按需读取这些指南 |
| `lsp-code-intelligence` 删除 | 现有依赖该 skill 的 agent 将失效（但 serena 已覆盖全部等价能力） |
| AGENTS.d 文件回迁可能 | 如果 `docs/reference/` 的可发现性不足，可以将来再调整 |

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `.pi/agent/AGENTS.md` — 精简
  - `.pi/agent/AGENTS.d/` — 增删文件
  - `docs/reference/pi-provider-model.md` — 新建
  - `docs/reference/readme-governance.md` — 新建
  - `.pi/skills/serena-code-intelligence/SKILL.md` — 新建
  - `.pi/skills/lsp-code-intelligence/` — 删除
  - `AGENTS.md` — 更新引用
  - `.pi/capabilities.yaml` — 更新 skill 列表
