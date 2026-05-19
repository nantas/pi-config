# Subagent 精确工具委派设计

> 将 GitNexus 知识图谱探索与全文搜索分离，通过 toolset 约束避免 subagent 降级到 CLI/npx 路径。

## 1. 背景

### 1.1 问题

在 neonspark 项目中，主 agent 使用 `subagent({ agent: "scout" })` 委托 GitNexus 知识图谱查询时，`scout` 虽然通过 `agentOverrides` 获得了 `gitnexus_query/context/impact/list_repos` 等工具，但其工具集中同时包含 `bash`、`grep`、`find`。这导致 subagent 在实践中选择了 CLI 路径：

```
subagent 有 gitnexus_query 工具可用
  → 但实际上用了 bash + npx -y @veewo/gitnexus@latest query
  → 原因：skill 文件中的 gitnexus_query({...}) 文本格式被解释为需要 CLI
  → 结果：query 关键词污染（"platform visibility" 漂移到 FMOD Platform 类）
```

**具体现象**：scout subagent 反馈 "通过 gitnexus query 无法找到 UIHudModeSelect"，但主 agent 直接用 `gitnexus_query()` 立刻就找到了。

### 1.2 根因

| 层面 | 问题 |
|------|------|
| 工具集 | scout 有 bash/grep/find，提供了降级路径 |
| query 构造 | task 中的描述性词（"platform visibility"）被混入 query |
| repo 名称 | task 中写了 neonspark-core（不存在），浪费多次调用 |
| 超时 | 两次 subagent 均被 SIGTERM 杀死（exit 143） |

## 2. 方案设计

### 2.1 核心思路

**知识图谱发现与全文验证分离**：

```
主 session（编排 + 合成）
  ├── explore-gitnexus: 纯 gitnexus 工具 + read
  │    当需要 grep 时 → 格式化手写需求交回主 session
  └── explore: 纯 grep/find/read/ls
       主 session 接收后合成
```

### 2.2 Agent 定义

#### explore-gitnexus —— 纯知识图谱探索

| 属性 | 值 |
|------|-----|
| 工具 | `read`, `gitnexus_list_repos`, `gitnexus_query`, `gitnexus_context`, `gitnexus_impact`, `gitnexus_cypher`, `gitnexus_unity_ui_trace`, `gitnexus_detect_changes` |
| 模型 | `zhipuai-coding-plan/glm-5.1` |
| 约束 | 严禁使用 bash/grep/find/npx |
| 输出 | 结构化发现 + "需要全文验证"格式 |

#### explore —— 通用文本搜索

| 属性 | 值 |
|------|-----|
| 工具 | `read`, `grep`, `find`, `ls` |
| 模型 | `zhipuai-coding-plan/glm-5.1` |
| 约束 | 严禁使用 bash/edit/write/gitnexus 工具 |
| 输出 | 精确文件:行号匹配 |

### 2.3 关键设计决策

#### 决策 1：工具声明在 frontmatter 还是 settings？

```
❌ tools 写在前置元数据中（agent .md 文件的 tools: 字段）
   → pi-subagents 将该 allowlist 作为 --tools CLI 参数传给子进程
   → MCP 后端工具（gitnexus_*）无法通过 CLI 参数传递
   → 子进程只有 read 等原生工具可用

✅ tools 写在 agentOverrides 中（settings.json）
   → pi-subagents 通过内部机制注入工具
   → MCP 后端工具可以正确传递
```

**结论**：agent 定义文件（`.md`）中**不写 `tools` 字段**，工具通过 `settings.json` 的 `subagents.agentOverrides.<name>.tools` 声明。

#### 决策 2：行为约束怎么保障？

去掉 `tools` 字段后，子进程将继承父 session 的完整工具集（含 bash/grep/find）。约束变为纯 prompt 驱动：

- agent 的 system prompt 中明确列出可用/禁用工具
- 输出格式模板化（`## 需要全文验证`）
- 无工具集层面的硬隔离

**为什么可以接受**：scout 原本有 gitnexus 工具但选择 CLI 路径的根本原因不是工具可用性，而是 skill 文件中的表述方式被误解释。通过明确的 prompt 规则和 "query 关键词净化" 约束可以从根本上解决问题。

## 3. 文件清单

| 文件 | 作用 | 位置 |
|------|------|------|
| Agent 定义 | explore-gitnexus 知识图谱 agent | `neonspark/.pi/agents/explore-gitnexus.md` |
| Agent 定义 | explore 文本搜索 agent | `neonspark/.pi/agents/explore.md` |
| 项目配置 | agentOverrides 声明工具 | `neonspark/.pi/settings.json` |
| 项目 AGENTS.md | subagent 委派规则覆盖 | `neonspark/AGENTS.md` |

### 3.1 `.pi/settings.json` 结构

```json
{
  "subagents": {
    "agentOverrides": {
      "explore-gitnexus": {
        "tools": [
          "read",
          "gitnexus_list_repos",
          "gitnexus_query",
          "gitnexus_context",
          "gitnexus_impact",
          "gitnexus_cypher",
          "gitnexus_unity_ui_trace",
          "gitnexus_detect_changes"
        ]
      },
      "explore": {
        "tools": [
          "read",
          "grep",
          "find",
          "ls"
        ]
      }
    }
  }
}
```

### 3.2 Agent 定义文件（frontmatter 无 tools）

```yaml
---
name: explore-gitnexus
description: GitNexus 知识图谱探索 —— 纯 gitnexus 工具 + read，不执行全文搜索
model: zhipuai-coding-plan/glm-5.1
thinking: low
systemPromptMode: replace
inheritProjectContext: true
inheritSkills: false
output: context.md
defaultProgress: true
maxSubagentDepth: 0
---
```

## 4. 与全局 AGENTS.md 的兼容

### 4.1 层级关系

```
~/.pi/agent/AGENTS.d/subagent-usage.md（全局）
  └── 规定: gitnexus → scout, grep → 直接做

neonspark/AGENTS.md（项目级，覆盖）
  └── 规定: gitnexus → explore-gitnexus
            grep/find → explore（可委派）
            其他代码侦察 → scout（不变）
```

### 4.2 覆盖规则

- `gitnexus_query` / `gitnexus_context` / `gitnexus_impact` → `explore-gitnexus`（替换 scout）
- `grep` / `find` / `ls` 精确搜索 → `explore`（全局规则中 grep 直接做，但对大型项目可委派）
- 其他场景（非 gitnexus 的代码侦察、Git 溯源等）→ 仍按全局规则用 `scout`

## 5. 编排模式

```
主 session（编排 + 合成）

步骤1: explore-gitnexus
  task: "用 gitnexus_query 查 X 的执行流和上下文"
  返回:
    ## GitNexus 发现
    - Symbol: X @ Assets/.../X.cs:35
    - 关键调用链: A → B → C

    ## 需要全文验证
    - [ ] grep 模式: "IsOpen" 在 "Assets/**/*.cs"

步骤2: （如果需要）explore
  task: "用 explore 搜 'IsOpen' 在 Assets/NEON/Code/Game/**/*.cs"
  返回:
    ModeManager.cs:28-32 — 编译指令控制的 IsOpen

步骤3: 主 session 合成
  - 根因: ModeManager.IsOpen 在 Editor 外始终为 false
  - 修复方向: 确认 NS/PS5 平台的行为
```

## 6. 关键约束

### 6.1 Query 关键词净化

```diff
- ❌ gitnexus_query({query: "UIHudModeSelect ui_modeSelect_hint platform visibility"})
  → 关键词 "platform" 漂移到 FMOD Platform 类

+ ✅ gitnexus_query({query: "UIHudModeSelect", repo: "neonspark"})
  → 精确命中 UIHudModeSelect
```

### 6.2 禁止 CLI 降级

subagent 的 `bash` + `npx` 路径已被系统 prompt 明确禁止。如违反，主 agent 在综合结果时应识别并拒绝接受 CLI 输出。

### 6.3 失败路径

当 gitnexus 查询返回空/ambiguous 结果时：
1. 尝试 `uid` 缩小范围
2. 尝试 `file_path` 参数 disambiguate
3. 尝试不同 query 变体
4. 均失败 → 如实报告 + 格式化文本搜索需求

## 7. Fail Fast 模式

### 7.1 动机

subagent 在工具不可用时不应自我补偿。实践中出现过以下问题：

- `gitnexus_query` 不可用时，explore-gitnexus 尝试 `read ~/.gitnexus/config.json`、`read .gitnexus/state.json`、`read .gitnexus/index` 来寻找替代信息
- gitnexus 查询返回空结果时，agent 尝试通过项目目录结构来推测代码内容
- 这些补偿行为既浪费 token，又可能产生误导性输出

### 7.2 Preflight 检查

**第一个 tool call 必须是 preflight**，在任何其他操作之前：

#### explore-gitnexus preflight

```
1. 调用 gitnexus_list_repos()
   → 失败 → 立即 ## 快速失败
2. 调用 gitnexus_query({query: "UIHudModeSelect", repo: "neonspark"})
   → 失败 → 立即 ## 快速失败
```

#### explore preflight

```
1. 调用 ls(".") 检查 ls 是否可用
2. 调用 grep({pattern: "test", path: "."}) 检查 grep 是否可用
   → 失败 → 立即 ## 快速失败
```

### 7.3 快速失败输出格式

```markdown
## ⚠️ 快速失败

### 失败原因
<具体原因>

### 尝试了什么
- [工具调用 1]：<结果>
- [工具调用 2]：<结果>

### 未尝试
- 没有使用 grep/find 搜索代码（explore-gitnexus）
- 没有读取 .gitnexus/ 目录文件
- 没有调用 npx CLI
- 没有猜测代码内容
- 没有使用 bash 代替 grep (explore)
- 没有调用 gitnexus 工具 (explore)

### 建议
<主 session 应如何处理这个失败>
```

### 7.4 触发条件

| 条件 | explore-gitnexus | explore |
|------|-----------------|---------|
| gitnexus_list_repos 不可用 | ✅ 立即 FF | N/A |
| gitnexus_query 不可用 | ✅ 立即 FF | N/A |
| gitnexus_context 不可用 | ✅ 立即 FF | N/A |
| grep 不可用 | N/A | ✅ 立即 FF |
| find 不可用 | N/A | ✅ 立即 FF |
| ls 不可用 | N/A | ✅ 立即 FF |
| read gitnexus://… 误触发 | ✅ 立即 FF | N/A |
| 任务要求修改代码/写入 | ✅ 立即 FF | ✅ 立即 FF |
| 任务要求 gitnexus 操作 | N/A | ✅ 立即 FF |
| 所有 query 变体返回空 | ✅ 输出"需要全文验证"后 FF | N/A |
| 搜索返回 0 结果 | N/A | ✅ 报告"未找到匹配" |

### 7.5 禁止行为

- 工具不可用时读配置/索引文件寻找替代信息
- 用 CLI（npx）替代原生工具
- 用 bash 替代 grep
- 用 `read` 替代 gitnexus 查询
- 完成目标后追加无关操作

## 8. 局限与后续

| 局限 | 说明 | 后续方向 |
|------|------|----------|
| 行为约束依赖 prompt | 无工具集级隔离，subagent 仍能调用 bash/grep | 等待 pi-subagents 支持 `deniedTools` 或 `restrictTools` |
| 编排在主 session | 主 agent 需要自行调度两个 agent | 可封装为 chain 定义（`.chain.md`）标准化流程 |
| 项目级生效 | 仅 neonspark 下可用，其他项目需复制配置 | 考虑提取为通用 skill 或 pi-subagents 插件 |

## 9. 验证方式

```text
# 在 neonspark 目录下
/agents list
# 预期: explore-gitnexus (project), explore (project) 可见

# 测试知识图谱查询
用 explore-gitnexus 查 UIHudModeSelect 的结构和调用链
# 预期: gitnexus 工具可用，返回结构化发现

# 测试文本搜索
用 explore 搜 "IsOpen" 在 Assets/NEON/Code/Game/Managers/
# 预期: 返回精确文件:行号
```
