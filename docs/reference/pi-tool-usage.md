# pi 工具（Tool）使用逻辑

## 两层结构：注册 vs 激活

pi 的工具系统分两层：

```
┌─ _toolRegistry（注册层）      ── 所有"存在"的工具定义
│  - 内置：read, bash, edit, write, grep, find, ls
│  - 扩展：通过 registerTool() 注册的自定义工具
│
└─ agent.state.tools（激活层）  ── 当前会话真正可调用的工具
   - 这是发送给 LLM API 的 tools 参数
   - LLM 只能调用这一层的工具
```

## System Prompt 中的工具信息（非约束）

System prompt 只是一个 "温馨提示"，不影响 LLM 实际能调用什么：

```
Available tools:               ← 仅列出有 promptSnippet 的内置工具
- read: Read file contents...
- bash: Execute bash commands...

In addition to the tools above,
you may have access to other custom tools...  ← 暗示可能有扩展工具

Guidelines:                    ← 所有活跃工具的 promptGuidelines 合并
- Use bash for file ops...
- Do NOT include an 'Other' option...（ask 工具的 guideline）
```

**真正的工具约束是 `agent.state.tools`，通过 API 的 function calling 协议发送。**

## 内置工具

| 工具 | 默认注册 | 默认激活 | promptSnippet |
|------|---------|---------|---------------|
| read | ✅ | ✅ | ✅ |
| bash | ✅ | ✅ | ✅ |
| edit | ✅ | ✅ | ✅ |
| write | ✅ | ✅ | ✅ |
| grep | ✅ | ❌ | ✅ |
| find | ✅ | ❌ | ✅ |
| ls | ✅ | ❌ | ✅ |

默认活跃列表硬编码为 `["read", "bash", "edit", "write"]`。

## 扩展工具（Extension Tools）

通过 `pi.registerTool()` 注册：

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "my_tool",
    description: "...",
    promptSnippet: "可选的 prompt 摘要文本",
    promptGuidelines: ["Use my_tool when ..."],
    parameters: Type.Object({}),
    async execute() {
      return { content: [{ type: "text", text: "done" }], details: {} };
    },
  });
}
```

扩展工具的行为：

| 特性 | 行为 |
|------|------|
| 注册即激活 | `_refreshToolRegistry` 发现新工具 → 自动加入活跃列表 |
| 不提供 promptSnippet | 不会出现在 system prompt 的 "Available tools" 中 |
| 提供 promptSnippet | 出现在 "Available tools" 中（类似内置工具） |
| 提供 promptGuidelines | 合并到 system prompt 的 "Guidelines" 中 |

> **注意：目前没有 "注册但不激活" 的机制。** 扩展一旦注册，就会自动激活。

## 关键方法

### setActiveToolsByName(toolNames)

每次调用做两件事：

```
setActiveToolsByName(["read", "bash"])
  │
  ├─ ① agent.state.tools = [read, bash]    ← LLM 能调用的工具
  │
  └─ ② _rebuildSystemPrompt(["read","bash"])  ← 重建 system prompt
        ├─ "Available tools": 只有 read, bash
        ├─ "Guidelines": 只有 read, bash 的 guideline
        └─ 重新计算 hasGrep/hasFind/hasLs 等条件分支
```

**不是增量修改，是完整重建。**

### registerTool() → _refreshToolRegistry()

扩展注册工具后的完整链路：

```
registerTool({ name: "ask", promptSnippet: "...", promptGuidelines: [...] })
  │
  ▼
_refreshToolRegistry()
  │
  ├─ 构建 _toolRegistry（内置 + 扩展）
  ├─ 构建 _toolPromptSnippets（所有提供 promptSnippet 的工具）
  ├─ 构建 _toolPromptGuidelines（所有提供 promptGuidelines 的工具）
  │
  ├─ 发现新工具 "ask" 不在 previousRegistryNames 中
  │   → nextActiveToolNames.push("ask")
  │
  └─ setActiveToolsByName([...read, bash, edit, write, ask])
        ├─ ① agent.state.tools 包含 ask
        └─ ② system prompt 重建，包含 ask 的 guideline
```

## 白名单机制

### `_allowedToolNames`（硬白名单）

- 如果设置：不在白名单中的工具**连 registry 都进不了**
- 如果未设置（默认）：无限制

入口有两个：

```bash
# CLI
pi --tools read,bash,edit,write
```

```markdown
# agent frontmatter
---
name: sub-agent
tools: read, grep, find, ls, bash
---
```

两者最终都走到 `sdk.js`：

```js
const allowedToolNames = options.tools  // 同时充当白名单 + 初始活跃列表
```

### 没有白名单时的默认行为

```
_allowedToolNames = undefined
  → 所有内置工具 + 扩展工具都能注册
  → 基础活跃：["read", "bash", "edit", "write"]
  → 扩展工具自动加入活跃
```

### 有白名单时的行为

```
_allowedToolNames = {read, bash, grep}
  → 只注册白名单内的工具
  → 扩展工具不在白名单中 → 过滤掉，完全不注册
  → 白名单内的全部激活
```

## 常见场景

### 场景 1：默认启动（无任何参数）

```bash
pi
```

```
活跃工具: read, bash, edit, write + 所有扩展工具
```

### 场景 2：CLI 白名单

```bash
pi --tools read,bash,edit,write
```

```
活跃工具: read, bash, edit, write
扩展工具: 全部排除（不在白名单）
grep/find/ls: 排除（不在白名单）
```

### 场景 3：CLI 白名单 + 包含扩展

```bash
pi --tools read,bash,edit,write,ask
```

```
活跃工具: read, bash, edit, write, ask
扩展工具 ask: 在白名单中 → 注册并激活
其他扩展工具: 排除
```

### 场景 4：CLI 白名单 + 启用内置但未默认激活的工具

```bash
pi --tools read,bash,grep,find,ls
```

```
活跃工具: read, bash, grep, find, ls
edit/write: 排除（不在白名单）
扩展工具: 排除（不在白名单）
```

### 场景 5：Subagent frontmatter

```markdown
---
name: my-agent
tools: read, grep, find, ls, bash
---
```

```
该 agent 中：
  活跃工具: read, grep, find, ls, bash
  扩展工具: 全部排除（不在白名单）
  edit/write: 排除（不在白名单）

父会话不受影响，各自独立。
```

### 场景 6：Subagent frontmatter 不写 tools

```markdown
---
name: my-agent
# 不写 tools
---
```

```
该 agent 中：
  活跃工具: read, bash, edit, write + 所有扩展工具（和默认启动一样）
```

### 场景 7：同时启动多个扩展，想排除某个

```bash
pi --tools read,bash,edit,write,ask
# 假设同时安装了 ask 和 my_tool 两个扩展
# my_tool 不在白名单 → 被排除
```

## 如何让扩展工具 "默认不激活，按需启用"

目前 pi 没有原生支持，推荐方案：

**方案：正常注册，用 `--tools` 在默认会话中排除**

```bash
# 默认会话 —— 白名单排除自定义工具
alias pi="pi --tools read,bash,edit,write"
# 或者写到 shell 配置里
```

```markdown
# subagent 中 —— 按需包含
---
name: special-agent
tools: read,bash,edit,write,my_tool
---
```

## System Prompt 中的 Guidelines 分支逻辑

```js
// system-prompt.js
const hasBash = tools.includes("bash");
const hasGrep = tools.includes("grep");
const hasFind = tools.includes("find");
const hasLs = tools.includes("ls");

if (hasBash && !hasGrep && !hasFind && !hasLs) {
    addGuideline("Use bash for file operations like ls, rg, find");
} else if (hasBash && (hasGrep || hasFind || hasLs)) {
    addGuideline("Prefer grep/find/ls tools over bash...");
}

// 扩展的 promptGuidelines 直接追加
for (const guideline of promptGuidelines ?? []) {
    addGuideline(guideline);
}
```

这意味着：

- 只激活 read, bash, edit, write → "Use bash for file operations"
- 额外激活了 grep, find, ls → 自动切换为 "Prefer grep/find/ls tools over bash"
- 扩展工具的 guideline 始终追加
