# Proposal

## 问题定义

当前全局安装的 `pi-subagents@0.24.0`（`@mariozechner/*` peer deps）与本地 pi-core (`@earendil-works/pi-coding-agent@0.75.3`) 的 peer dependency scope 不一致。jwu 开发的 `@johnnywu/pi-subagents@1.5.0` 使用 `@earendil-works/*` peer deps，与当前 pi-core 完全兼容，且代码经过安全审查无风险。

需要将全局包从旧版替换为新版，并完成以下迁移：
1. 包引用更新（capabilities.yaml + settings.json）
2. settings.json 中 `subagents.agentOverrides` 迁移为新版 `.pi/agents/*.md` frontmatter 格式
3. 旧版提供的 skill 和 prompt 由新版 extension 内置能力替代
4. 旧版 skill 引用（当前 session 中的 `pi-subagents` skill）需要评估是否保留或替换

## 范围边界

### In Scope
- 替换 `npm:pi-subagents@0.24.0` → `npm:@johnnywu/pi-subagents@1.5.0`
- 更新 `.pi/capabilities.yaml` 中的 packages 和 settings 条目
- 更新 `~/.pi/agent/settings.json` 中的 packages 数组
- 将 `subagents.agentOverrides` 中的 6 个 agent 配置（context-builder, oracle, planner, researcher, reviewer, scout, worker）迁移为 `.pi/agents/*.md` 文件
- 移除旧版不再适用的 settings 配置
- 通过 `scripts/sync-pi-agent.sh` 同步到全局
- 验证新版 subagent tool 正常工作

### Out of Scope
- 新版不支持的旧版功能的替代实现（async/chain/parallel/slash commands）—— 这些是功能降级，用户已了解
- `~/.pi/agent/agents/unity-worker.md` 的修改（已存在的 agent 定义，保持不变）
- 其他 packages 的变更
- 新版 `allowedAgents`、`maxDepth`、`debug`、`skills` 等高级 frontmatter 字段的配置（按需后续添加）

## Capabilities

### New Capabilities
- `agent-file-definitions`: 将 agent 配置从 settings.json overrides 迁移为 .pi/agents/ 目录下的独立 .md 文件，使用新版 frontmatter 格式（name, description, tools, model, thinking, systemPrompt）

### Modified Capabilities
- `subagent-package`: 全局包从 npm:pi-subagents@0.24.0 替换为 npm:@johnnywu/pi-subagents@1.5.0，更新 capabilities.yaml 和 settings.json 中的引用
- `subagent-settings`: 移除 settings.json 中的 subagents.agentOverrides 配置，改由 agent .md 文件承载 agent 级别的 model/thinking/tools 配置

## Capabilities 待确认项

- [x] 能力清单已与用户确认 — 用户明确要求直接替换

## Impact

### 功能变化
| 能力 | 旧版 | 新版 | 影响 |
|------|------|------|------|
| subagent tool（单 agent） | ✅ | ✅ | 无变化 |
| agent 定义格式 | settings.json overrides + builtin | `.md` frontmatter | 迁移 |
| agent discovery | 多路径（builtin + user + project） | `~/.pi/agent/agents/` + `.pi/agents/` | 简化 |
| chain 执行 | ✅ | ❌ | 降级 |
| parallel 执行 | ✅ | ❌ | 降级 |
| async 后台执行 | ✅ | ❌ | 降级 |
| slash commands | `/run`, `/agents`, `/chain` 等 | ❌ | 降级 |
| 内置 agents | 8 个 builtin（scout, worker 等） | ❌ 需自行定义 | 需迁移 |
| 内置 skill | pi-subagents skill（详尽的编排指南） | ❌ | 需评估替代 |
| 内置 prompts | 6 个 prompt 模板 | ❌ | 需评估替代 |
| debug 支持 | ❌ | ✅ `debug: true` frontmatter | 增强 |
| skills frontmatter | ❌ | ✅ 按名称/通配符加载 | 增强 |

### 受影响文件
- `.pi/capabilities.yaml` — packages 和 settings 更新
- `.pi/settings.json` — 移除 subagents.agentOverrides
- `~/.pi/agent/settings.json` — packages 和 subagents 更新
- `.pi/agents/` — 新增 agent 定义文件（覆盖旧版 agentOverrides 中的所有 agent）
- `~/.pi/agent/agents/` — 同步后包含新 agent 定义
- 旧版 skill 注入点：当前 session 中的 `pi-subagents` skill 将不再可用

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：pi-mono extension API、capabilities.yaml、settings.json、.pi/agents/ 目录
