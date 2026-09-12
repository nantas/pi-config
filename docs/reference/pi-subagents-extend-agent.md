# Pi Subagents — Extending & Creating New Agents

> Reference for creating, configuring, and managing custom agents via the
> `@johnnywu/pi-subagents` extension (verified against installed v2.2.1:
> `~/.pi/agent/npm/node_modules/@johnnywu/pi-subagents/`).

## 1. Agent 文件规范

每个 agent 是一个 **Markdown 文件**，包含 YAML frontmatter 和 Markdown body（即 system prompt）。加载顺序：global 先读，project 后读，**同名时 project 覆盖 global**。

| 作用域 | 路径 | 说明 |
|--------|------|------|
| Global | `~/.pi/agent/agents/{name}.md` | 所有项目可用 |
| Project | `.pi/agents/{name}.md` | 仅当前仓库可用，优先级更高 |

只扫描 `.md` 文件。解析在扩展加载时完成；解析错误产生启动警告，但不阻塞其它 agent。

**行尾要求：文件必须使用 LF（Unix）行尾。** 解析器要求内容以 `---\n` 开头，CRLF 文件（`---\r\n`）会触发 `missing frontmatter` 警告且整个 agent 被跳过。仓库已通过 `.gitattributes`（`.pi/agents/** text eol=lf`）锁定。

## 2. Frontmatter 完整字段

以下为 v2.2.1 实际支持的全部字段（不在此列的键会被静默忽略）：

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `name` | **yes** | — | agent 唯一标识 |
| `description` | no | — | 人类可读摘要 |
| `tools` | no | _none_ | 工具白名单，逗号分隔（`read, write, bash, grep` 等） |
| `model` | no | parent's model | `provider/model-id`（如 `deepseek/deepseek-v4-flash`） |
| `thinking` | no | `off` | `off` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh` |
| `systemPrompt` | no | `append` | body 的应用方式（见第 4 节） |
| `skills` | no | _none_ | 注入的技能，逗号分隔，支持 `*` 和 `obsidian-*` 前缀通配 |
| `allowedAgents` | no | _all_ | 该 agent 可派生的子 agent 白名单 |
| `maxDepth` | no | `10` | 递归深度上限（`0` = 不可再派生） |
| `debug` | no | `false` | `true` 时导出运行时 system prompt 到 `debug-system-prompt.md` |

frontmatter 是逐行解析的简易 `key: value` 格式（非完整 YAML）：每行必须含 `:`，值可用引号包裹去除。不支持嵌套结构、列表、多行值。

### 示例

```markdown
---
name: config-auditor
description: 审计 Pi 配置文件的正确性与一致性
model: deepseek/deepseek-v4-flash
thinking: medium
tools: read, grep, find, ls
---

你是 Pi 配置审计员。……

## 审计结果
- ✅ 通过项
- ⚠️ 警告项
- ❌ 失败项
```

## 3. 创建方式

手动在 `.pi/agents/`（project）或 `~/.pi/agent/agents/`（global）下新建 `{name}.md`，参考第 2 节示例。保存后重启 pi 生效。

验证：

- 启动时无 agent 解析警告
- `/run {name} "你的任务"` 直接调用
- 自然语言委托由父 session 的 `subagent` 工具路由

## 4. Prompt 组装（`systemPrompt` 三模式）

| 模式 | 结果 |
|------|------|
| `append`（默认） | Pi 默认 system prompt + 项目上下文 + agent body |
| `replace` | agent body 替换 Pi 默认 prompt，**保留**项目上下文（AGENTS.md 等） |
| `replace-all` | agent body 替换 Pi 默认 prompt 且**跳过**项目上下文 |

在 `replace` / `replace-all` 模式下，运行时会自动注入工具说明块。

> v2 breaking change：v1 的 `replace`（完全替换、跳过项目上下文）在 v2 中改名为 `replace-all`；v2 的 `replace` 是新语义（保留项目上下文）。从 v1 迁移且需要跳过 AGENTS.md 的 agent 应使用 `replace-all`。

## 5. 递归控制

子 agent 的 `tools` 白名单含 `subagent` 时可继续派生，两层防护：

- **`maxDepth`** — 从最初 agent 起算的硬上限，默认 `10`
- **`allowedAgents`** — 父 agent 的白名单，子进程看不到白名单之外的 agent

控制变量通过环境变量传递（`PI_SUBAGENT_DEPTH`、`PI_SUBAGENT_MAX_DEPTH`、`PI_SUBAGENT_ALLOWED`）。

## 6. 已注册的项目 Agent（`.pi/agents/`）

| Agent | systemPrompt | 用途 |
|-------|--------------|------|
| `context-builder` | append | 构建需求/代码库上下文交接文档 |
| `image-reader` | replace-all | 视觉子代理，读图并返回结构化文本描述 |
| `oracle` | append | 方向审查与建议（advisory） |
| `planner` | append | 从已批准需求生成实施计划 |
| `researcher` | append | Web 调研，官方文档/规范/一手来源 |
| `reviewer` | append | 代码审查，按严重度输出证据化发现 |
| `scout` | append | 快速代码侦察与上下文交接 |
| `unity-worker` | replace-all | Unity 项目实现代理（Unity MCP + GitNexus） |
| `worker` | append | 执行已批准计划的目标代码修改 |

## 7. 已知限制（v2.2.1）

- 不存在 per-agent 覆写机制（无 `subagents.agentOverrides` 之类的 settings 键）；定制 builtin/已有 agent 的唯一方式是建同名文件覆盖。
- 不存在 `/agents` TUI 或 programmatic `create` action；agent 只能以 `.md` 文件创建。
- frontmatter 不支持完整 YAML 语法（见第 2 节）。
- 解析器只接受 LF 行尾（见第 1 节）。

## 8. 参考

- `pi-subagents` README：`~/.pi/agent/npm/node_modules/@johnnywu/pi-subagents/README.md`
- 解析器源码（字段与行为的最终依据）：`.../pi-subagents/extensions/agent-loader.ts`
- `pi-config` 项目 agent：`.pi/agents/*.md`
