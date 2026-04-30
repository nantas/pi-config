# Pi Subagents — Extending & Creating New Agents

> Reference for creating, configuring, and managing custom agents in the `pi-subagents` framework.
> Source: `pi-subagents` builtin agents + `pi-config` project agents.
> pi-subagents version: current installed.

## 1. Agent 文件规范

每个 agent 是一个 **Markdown 文件**，包含 YAML frontmatter 和 Markdown body（即 system prompt）。按优先级从低到高：

| 作用域 | 路径 | 说明 |
|--------|------|------|
| Builtin | `~/.pi/agent/npm/node_modules/pi-subagents/agents/` | 扩展自带的 8 个 agent |
| User | `~/.pi/agent/agents/{name}.md` | 全局可用 |
| Project | `.pi/agents/{name}.md` | 仅当前仓库可用，**最高优先级** |

同名 aget 时高优先级覆盖低优先级。Project 也兼容读取 `.agents/{name}.md`。

## 2. Frontmatter 完整字段

```yaml
---
name: my-agent                     # 必填，agent 名称
description: My custom agent       # 必填，展示给 LLM 的描述

# --- 模型与思考 ---
model: deepseek/deepseek-v4-flash  # 默认模型，支持 provider/id 或 bare id
fallbackModels: openai/gpt-5-mini  # 后备模型，逗号分隔
thinking: high                     # off | minimal | low | medium | high | xhigh

# --- 工具与扩展 ---
tools: read, grep, find, ls, bash, write, mcp:chrome-devtools
                                   # 内置工具 allowlist
                                   # mcp: 前缀 = MCP 直连工具（需 pi-mcp-adapter）
extensions:                        # 留空=正常扩展；空值=无扩展；路径列表=只加载指定扩展

# --- 行为控制 ---
systemPromptMode: replace          # replace（完全替换Pi基础prompt）| append（追加）
inheritProjectContext: true        # 是否继承项目 AGENTS.md/CLAUDE.md
inheritSkills: false               # 是否继承 Pi 技能目录
skills:                            # 直接注入技能，不受 inheritSkills 影响

# --- 输出与读取 ---
output: result.md                  # 默认输出文件路径
defaultReads: context.md           # chain/parallel 下默认先读取的文件
defaultProgress: true              # 是否维护 progress.md

# --- 其它 ---
interactive: true                  # 兼容保留字段，v1 未强制
maxSubagentDepth: 1                # 限制该 agent 的子代理嵌套深度
---
```

## 3. 三种创建方式

### 3.1 通过 `/agents` TUI（推荐）

1. 输入 `/agents` 或按 `Ctrl+Shift+A` 打开 Agents Manager
2. 按 `Alt+N` 选择模板：
   - **Scout** — 代码侦察模板
   - **Planner** — 计划生成模板
   - **Implementer** — 实现模板
   - **Code Reviewer** — 审查模板
   - **Blank Agent** — 空白模板
   - **Blank Chain** — 空白 chain 模板
3. 填写各字段和 system prompt
4. 保存后立即可用

### 3.2 手动创建 `.md` 文件

在 `.pi/agents/` 或 `~/.pi/agent/agents/` 下新建 `{name}.md`，参考：

```markdown
---
name: config-auditor
description: 审计 Pi 配置文件的正确性与一致性
model: deepseek/deepseek-v4-flash
thinking: medium
tools: read, grep, find, ls
systemPromptMode: replace
inheritProjectContext: true
inheritSkills: false
---

你是 Pi 配置审计员。

审计内容：
- `.pi/settings.json` 的字段完整性
- `openspec/` 与实现的一致性
- package 引入的安全性

输出格式：

## 审计结果
- ✅ 通过项
- ⚠️ 警告项
- ❌ 失败项

## 建议
...
```

### 3.3 通过 programmatic `create` action 创建

LLM 可调用 `subagent` 工具的 `create` action：

```ts
{ action: "create", config: {
  name: "my-agent",
  description: "...",
  scope: "project",              // "user" | "project"
  systemPrompt: "You are...",
  systemPromptMode: "replace",
  inheritProjectContext: true,
  inheritSkills: false,
  model: "deepseek/deepseek-v4-flash",
  thinking: "high",
  tools: "read, bash, write",
  skills: "",
  output: "result.md"
}}
```

## 4. 覆盖已有 Builtin Agent

不改文件，只在 settings.json 中覆写部分字段：

```json
{
  "subagents": {
    "agentOverrides": {
      "reviewer": {
        "model": "deepseek/deepseek-v4-pro",
        "thinking": "high",
        "inheritProjectContext": false
      }
    }
  }
}
```

支持覆写的字段：`model`、`fallbackModels`、`thinking`、`systemPromptMode`、`inheritProjectContext`、`inheritSkills`、`disabled`、`skills`、`tools`、`systemPrompt`。

也可通过 `/agents` 进入内置 agent 详情 → 按 `e` 编辑 → 选择 user/project 作用域保存。

## 5. Prompt 组装规则

| `systemPromptMode` | `inheritProjectContext` | 结果 |
|-------------------|------------------------|------|
| `replace` (默认) | `true` | 纯 agent prompt + 项目指令块 |
| `replace` | `false` | 纯 agent prompt，无上下文继承 |
| `append` | `true` | Pi 基础 prompt + agent prompt + 项目指令块 |
| `append` | `false` | Pi 基础 prompt + agent prompt |

## 6. 已注册的项目 Agent

| Agent | 文件 | 用途 |
|-------|------|------|
| `code-writer` | `.pi/agents/code-writer.md` | 仓库本地编码任务实现 |
| `dispatch-planner` | `.pi/agents/dispatch-planner.md` | dispatch 流中的规划委托 |

## 7. 验证

创建后可在 Pi 中验证：

- `/agents` 列表是否出现新 agent
- 自然语言："使用 {name} 帮我检查..."
- `/run {name} "你的任务"`

## 8. 参考

- `pi-subagents` README：`~/.pi/agent/npm/node_modules/pi-subagents/README.md`
- 内置 agent 示例：`~/.pi/agent/npm/node_modules/pi-subagents/agents/*.md`
- `pi-config` 项目 agent：`.pi/agents/*.md`
