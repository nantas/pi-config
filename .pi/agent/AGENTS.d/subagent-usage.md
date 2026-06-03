# Subagent 自动委派指南

> 本文档定义 agent **何时**以及**如何**自主使用 `subagent()` 工具进行任务委派。
> Agent 定义位于 `.pi/agents/*.md`（项目级）和 `~/.pi/agent/agents/*.md`（全局）。
> 可用 agent 列表在 pi session 启动时自动发现并注入到 system prompt。

---

## 1. 新版 API 概览

`@johnnywu/pi-subagents@1.5.0` 提供简化的 subagent tool：

```typescript
subagent({
  agent: "scout",      // 必填：agent 名称
  task: "探索任务描述",  // 必填：委派给 agent 的任务
  cwd: "/path/to/dir"  // 可选：工作目录
})
```

**与旧版的差异**：
- ✅ 保留：单 agent 执行、agent 配置（model/thinking/tools/frontmatter）
- ❌ 移除：`chain`（链式管道）、`tasks`（并行）、`async`（后台）、`action`（管理操作）、`output`、`context`、`concurrency`
- ❌ 移除：slash commands（`/run`、`/agents`、`/chain` 等）
- ❌ 移除：内置 agents 和内置 skill（需自行定义 `.md` 文件）

如需并行执行，主 agent 在一个 turn 中发起多次 `subagent()` 调用。

---

## 2. 自动触发规则

以下场景中 agent **必须自动**使用 subagent 委派，不得在主 session 中自行执行：

| 场景 | 触发条件 | 委派动作 |
|------|---------|----------|
| **代码探索** | 需要追踪跨文件调用链、搜索代码模式、分析多处代码结构 | `scout` |
| **MCP/gitnexus 重操作** | 调用 `gitnexus_query/context/impact`、Xcode、浏览器等返回大量数据的工具 | `scout` |
| **Git 溯源调研** | 需要用 `git log/blame/diff/bisect` 追溯功能变更史或 bug 引入点 | `scout` |
| **外部资料调研** | 需要搜索外部文档、API 文档、生态信息 | `researcher` |
| **编辑后审查** | 实施完成、验证通过后 | `reviewer` × N（多次调用） |

### 2.1 代码探索 — 自动触发判断

| 如果你打算… | 应该 delegate 吗？ |
|-------------|-------------------|
| 用 `lsp definition` 查一个符号定义 | ❌ 轻量操作，直接做 |
| 用 `grep` 搜一个简单模式 | ❌ 轻量操作，直接做 |
| 追踪一条 3+ 步的调用链 | ✅ delegate to `scout` |
| 跨 3+ 文件分析代码模式 | ✅ delegate to `scout` |
| 同时搜索代码 + 查文档 | ✅ 依次 delegate to `scout` + `researcher` |
| 调用 `gitnexus_query` + `context` + `impact` 组合 | ✅ delegate to `scout` |
| 在大型仓库中搜索多个不相关模式 | ✅ delegate to `scout`（一次任务覆盖多方向） |
| 用 `git log` 追溯某功能的提交历史 | ✅ delegate to `scout` |
| 用 `git diff` / `git bisect` 找 bug 引入点 | ✅ delegate to `scout` |

**判断原则**：如果操作需要 3+ 步工具调用才能得出一个结论，就应该 delegate。

### 2.2 MCP/gitnexus 重操作

MCP 工具返回的数据通常很大，会快速膨胀主 session context。

| 场景 | 操作 |
|------|------|
| 单次小结果 `gitnexus_query` | 可以直接做 |
| `gitnexus_context` + `gitnexus_impact` 组合 | delegate to `scout` |
| 多个独立的 gitnexus 查询 | delegate to `scout`（一次任务包含多查询） |

---

## 3. Agent 选择矩阵

| 任务类型 | Agent | 模型 | Thinking | Tools |
|---------|-------|------|----------|-------|
| 代码库侦察 | `scout` | glm-5.1 | minimal | read, grep, find, ls, bash, write, intercom, gitnexus_* |
| 外部资料调研 | `researcher` | kimi-for-coding | high | read, write, web_search, fetch_content, intercom, gitnexus_query |
| 编辑后审查 | `reviewer` | kimi-for-coding | high | 全量（无白名单限制） |
| 实施执行 | `worker` | glm-5.1 | low | read, grep, find, ls, bash, edit, write, contact_supervisor, gitnexus_* |
| 实施计划制定 | `planner` | deepseek-v4-flash | high | 全量 |
| 上下文构建 | `context-builder` | deepseek-v4-flash | high | read, grep, find, ls, bash, write, web_search, intercom, gitnexus_* |
| 方向审阅 | `oracle` | deepseek-v4-flash | medium | 全量 |

> `scout` 没有 `edit` 工具，对于只读探索是优势——不会误改代码。
> `worker` 有完整的编辑工具 + `contact_supervisor`，实施时可按需向上级请求决策。
> "全量"表示该 agent 不设 tools 白名单，可使用 pi 默认的完整工具集。

---

## 4. 多任务编排

新版不支持 `tasks: []` 并行或 `chain: []` 链式。编排策略：

### 4.1 串行依赖任务

主 agent 依次调用，将前一步结果作为后一步的 task 描述输入：

```
步骤 1: subagent({ agent: "scout", task: "探索 auth 模块..." })
→ 主 agent 读取结果，提取关键信息

步骤 2: subagent({ agent: "planner", task: "基于以下探索结果制定计划：<粘贴关键发现>..." })
→ 主 agent 读取计划，确认后委派实施

步骤 3: subagent({ agent: "worker", task: "实施以下计划：<粘贴计划摘要>..." })
```

### 4.2 独立任务（伪并行）

独立任务可在同一个 turn 中发起多次 `subagent()` 调用：

```
subagent({ agent: "scout", task: "探索方向 A：auth 模块结构..." })
subagent({ agent: "scout", task: "探索方向 B：数据库查询模式..." })
subagent({ agent: "researcher", task: "调研 OAuth 2.1 最新规范..." })
```

pi 运行时会依次执行（非真正并行）。如需真正并行，等待未来版本支持。

### 4.3 实施后审查

```
subagent({ agent: "reviewer", task: "审查当前 diff 的正确性和回归风险。直接检查变更文件，返回文件/行号级别的发现。" })
subagent({ agent: "reviewer", task: "审查当前 diff 的测试覆盖和可维护性。直接检查变更文件。" })
```

主 agent 综合审查结果后，决定是否需要 `worker` 修复。

---

## 5. 结果综合规则

subagent 完成后，主 agent **自动综合**结果到回复中：

### 5.1 综合格式

```
## 探索结果综合

### 方向 A: auth 模块结构
- scout 发现：...（关键文件行号引用）

### 方向 B: OAuth 流程
- scout 通过 gitnexus 追踪到：...（调用链）

### 综合判断
- 基于以上信息，建议...
```

### 5.2 子结果引用

综合时**必须附带** subagent 返回的关键发现：
- 关键文件路径 + 行号
- 调用链摘要 / commit hash
- 置信度评估
- 需要进一步确认的疑点

---

## 6. 编排工作流

### 6.1 完整工作流（实施 + 审查）

```
用户请求
  │
  ├── 需要代码探索/Git 溯源/MCP？ → scout
  ├── 需要外部调研？ → researcher
  │
  ├── 综合结果 → 回复用户
  │
  ├── 需要实施？
  │   ├── planner 制定计划（可选）
  │   └── worker 实施
  │
  └── 实施完成 → reviewer × N
       → 综合审查反馈
       → worker 应用修复（如需）
       → 验证 → 完成
```

### 6.2 轻量工作流（仅调研）

```
用户提问
  │
  ├── 简单问题（< 3 步） → 直接做
  ├── 复杂问题 → scout + 可选 researcher
  │
  └── 综合 → 回复
```

---

## 7. Task Prompt 编写指南

给 subagent 的 task 要遵循 **紧凑契约** 风格：

### 好例子

```
"用 gitnexus 查询 UserService.findByEmail 的调用链，输出 key files + 行号"
"grep 搜索 src/auth/ 下所有 'permission' 相关代码，列出关键函数和文件"
"用 git log 追溯 feature-X 的完整提交史，输出每个 commit 的 hash + 标题 + 改动文件"
```

### 避免

```
"审查所有代码"（太模糊）
"请帮我理解一下这个代码库，然后...然后..."（太长）
```

### 紧凑契约模板

```
Goal: <具体产出>
Context: <关键路径/决策/约束>
Validation: <如何验证产出正确>
Output: <期望的格式>
```

---

## 8. 底线约束

### 必须 delegate

- **涉及 3+ 跨文件的分析** → scout
- **调用返回大量数据的 MCP/gitnexus 工具** → scout
- **Git 多步溯源（log + blame + diff 组合）** → scout
- **外部资料调研** → researcher
- **实施完成后** → reviewer

### 不要 delegate

- 单次 `lsp definition` / `references` 查询
- 单次 grep 搜索
- 简单文件读取
- 用户直接要求的单步操作
- 需要在主 session 上下文中才能准确判断的决策

### 其他约束

- **写操作单线程**：修改必须串行，通过 worker 执行
- **subagent 不能嵌套 subagent**：所有编排在主 agent
- **决策权在主 agent**：综合、判断、回复由主 agent 完成
- **每次 subagent 调用只传 agent + task**：无 action/output/context/concurrency 参数
