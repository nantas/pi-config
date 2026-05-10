# Subagent 自动委派指南

> 本文档定义 agent **何时**以及**如何**自主使用 `subagent()` 工具进行任务委派。
> 详细 API 参考（参数 schema、错误处理）见 `pi-subagents` 内置 skill（运行时自动发现）。
> 以下 agent 名称均来自 `subagent({action:"list"})` 可执行列表，配置来源于 `.pi/settings.json` 中的 `subagents.agentOverrides`。

---

## 1. 自动触发规则

以下场景中 agent **必须自动**使用 subagent 委派，不得在主 session 中自行执行：

| 场景 | 触发条件 | 委派动作 |
|------|---------|----------|
| **代码探索** | 需要追踪跨文件调用链、搜索代码模式、分析多处代码结构 | `scout`（fresh context） |
| **MCP/gitnexus 重操作** | 调用 `gitnexus_query/context/impact`、Xcode、浏览器等返回大量数据的工具 | `scout`（fresh context） |
| **Git 溯源调研** | 需要用 `git log/blame/diff/bisect` 追溯功能变更史或 bug 引入点 | `scout`（fresh context） |
| **并行调研** | 多个独立方向需要同时探索（如 gitnexus + Git 溯源 + 代码 grep） | parallel `scout` × N |
| **编辑后审查** | 实施完成、验证通过后（参见编排工作流） | parallel `reviewer` × 3（fresh context） |

### 1.1 代码探索 — 自动触发判断

当你需要**自己动手**进行以下操作时，先停下来判断是否应 delegate：

| 如果你打算… | 应该 delegate 吗？ |
|-------------|-------------------|
| 用 `lsp definition` 查一个符号定义 | ❌ 轻量操作，直接做 |
| 用 `grep` 搜一个简单模式 | ❌ 轻量操作，直接做 |
| 追踪一条 3+ 步的调用链（`definition` → `references` → …） | ✅ delegate to `scout` |
| 跨 3+ 文件分析代码模式 | ✅ delegate to `scout` |
| 同时搜索代码 + 查文档 + 调 MCP | ✅ 并行 delegate to `scout` + `researcher` |
| 调用 `gitnexus_query` + `gitnexus_context` + `gitnexus_impact` 组合 | ✅ delegate to `scout` |
| 在大型仓库中搜索多个不相关模式 | ✅ 并行 delegate to `scout` |
| 用 `git log` 追溯某个功能的提交历史 | ✅ delegate to `scout` |
| 用 `git blame` 定位某行代码的最后修改人 | ✅ 单文件轻量操作可直接做；多文件 delegate to `scout` |
| 用 `git diff` / `git bisect` 找 bug 引入点 | ✅ delegate to `scout` |
| 组合多个 git 命令溯源（log → blame → diff → log） | ✅ delegate to `scout` |

**判断原则**：如果操作需要 3+ 步工具调用才能得出一个结论，就应该 delegate。

### 1.2 MCP/gitnexus 重操作 — 自动触发

MCP 工具（含 gitnexus）返回的数据通常很大，会快速膨胀主 session context。
**原则**：除非是单次、小结果查询，否则 delegate。

| 场景 | 操作 |
|------|------|
| 单次 `gitnexus_query` 查询一个概念 | 可以直接做；结果过大时停止并 delegate to `scout` |
| `gitnexus_context` + `gitnexus_impact` 组合分析 | delegate to `scout` |
| 通过 MCP 调 Xcode 或浏览器 | delegate to `scout` |
| 多个独立的 gitnexus 查询 | 并行 delegate to `scout` |

### 1.3 Git 溯源调研 — 自动触发

Git 命令（`log`/`blame`/`diff`/`bisect`/`show`）的调用输出通常包含大量 commit hash、diff 上下文和提交信息，会快速膨胀主 session。
**原则**：超过 1 条 git 命令或涉及跨文件溯源时直接 delegate。

| 场景 | 操作 |
|------|------|
| 单次 `git blame <单个文件>` 查一行责任人 | 可以直接做 |
| 单次 `git log --oneline -5` 看最近提交 | 可以直接做 |
| 追溯某功能的完整提交历史（`git log` → `git show` → `git diff`） | delegate to `scout` |
| 用 `git bisect` 定位 bug 引入点 | delegate to `scout` |
| 组合溯源：先 git log 找到改动 → blame 定位行 → diff 看变更内容 | delegate to `scout` |
| 跨多个文件的 git blame/diff 分析 | delegate to `scout` |

---

## 2. Subagent 选择矩阵

以下 agent 均有 `agentOverrides` 配置，可直接使用：

| 任务类型 | 使用 agent | Context | 模型 | Thinking |
|---------|-----------|---------|------|----------|
| 代码库侦察 | `scout` | fresh | glm-4.5-air | minimal |
| Git 溯源调研 | `scout` | fresh | glm-4.5-air | minimal |
| MCP/gitnexus 重操作 | `scout` | fresh | glm-4.5-air | minimal |
| 外部资料调研 | `researcher` | fresh | glm-5.1 | high |
| 编辑后审查 | `reviewer` | fresh | glm-5.1 | high |
| 实施执行 | `worker` | fork | glm-5.1 | low |
| 实施计划制定 | `planner` | fork | deepseek-v4-flash | high |
| 上下文构建 | `context-builder` | fresh | deepseek-v4-flash | high |
| 方向审阅 | `oracle` | fork | deepseek-v4-flash | medium |

> `scout` 除 bash + write 外，现支持 `gitnexus_query/context/impact/list_repos`，可独立完成代码库结构查询。
> 它没有 `edit` 工具，但对于只读探索是优势——不会误改代码。
>
> `context-builder` 也支持 `gitnexus_query/context/impact`，综合代码结构分析 + 外部调研。
> `worker` 支持 `gitnexus_query/context`，实施时按需查询代码结构。
> `researcher` 支持 `gitnexus_query`，调研时可交叉比对代码库证据。

---

## 3. 并行执行规则

### 3.1 何时并行

**只要任务间无数据依赖，默认并行**。具体来说：

| 场景 | 并行策略 |
|------|---------|
| 同时探索代码 + 调研外部文档 | parallel `scout` + `researcher` |
| 多个独立的 gitnexus 查询 | parallel `scout`（每个查询一个任务）|
| 代码探索 + Git 溯源（无依赖） | parallel `scout` + `scout` |
| 多仓库的 Git 溯源 | parallel `scout`（每个仓库一个任务）|
| 3 个方向的 code review | parallel `reviewer` × 3（concurrency: 3）|
| MCP 调用 + 代码分析（无依赖） | parallel `scout` + `scout` |
| 链式依赖（先探索后计划） | chain（串行 + 并行组） |

### 3.2 并行模式模板

```typescript
// 通用并行探索（全部用 scout）
subagent({
  tasks: [
    { agent: "scout", task: "探索方向 A：...", output: "explore-a.md" },
    { agent: "scout", task: "方向 B：调用 gitnexus 查询...", output: "explore-b.md" },
    { agent: "scout", task: "方向 C：git 溯源调研...", output: "explore-c.md" }
  ],
  concurrency: 3,
  context: "fresh"
})

// 编辑后的 review 并行（reviewer 有 edit 工具但 review 模式下不改代码）
subagent({
  tasks: [
    { agent: "reviewer", task: "审查当前 diff 的正确性和回归风险...", output: false },
    { agent: "reviewer", task: "审查当前 diff 的测试覆盖...", output: false },
    { agent: "reviewer", task: "审查当前 diff 的可维护性...", output: false }
  ],
  concurrency: 3,
  context: "fresh"
})
```

### 3.3 Chain 中的并行组

对于依赖链（如"先并行探索 → 再综合"），使用 chain + parallel：

```typescript
subagent({
  chain: [{
    parallel: [
      { agent: "scout", task: "探索 auth 模块...", output: "auth.md" },
      { agent: "scout", task: "通过 gitnexus 查询 OAuth 流程...", output: "oauth.md" },
      { agent: "researcher", task: "调研最新 OAuth 最佳实践...", output: "research.md" }
    ]
  },
  { agent: "context-builder", task: "基于 {previous} 综合三方面探索结果，产出实施计划..." }
  ]
})
```

---

## 4. 结果综合规则

### 4.1 综合方式（自动，无需用户确认）

subagent 完成后，主 agent **自动综合**结果到回复中：

```
综合格式：
┌─────────────────────────────────────────┐
│ ## 探索结果综合                          │
│                                          │
│ ### 方向 A: auth 模块结构                │
│ - scout 发现：...（关键文件行号引用）      │
│                                          │
│ ### 方向 B: OAuth 流程                   │
│ - scout 通过 gitnexus 追踪到：...（调用链）│
│                                          │
│ ### 方向 C: Git 溯源                      │
│ - scout 追溯提交历史：...（commit hash）    │
│                                          │
│ ### 综合判断                             │
│ - 基于以上信息，建议...                    │
└─────────────────────────────────────────┘
```

### 4.2 子结果引用

综合时**必须附带** subagent 返回的关键发现，包括：
- 关键文件路径 + 行号（如果 subagent 返回了）
- 调用链摘要 / commit hash
- 置信度评估
- 需要进一步确认的疑点

### 4.3 冲突处理

如果多个 subagent 返回冲突信息：
1. 在综合中标注冲突点
2. 自行判断哪个更可信（如 gitnexus 结构查询 > grep 文本匹配）
3. 如需用户决策，用 `ask_user` 快速确认

---

## 5. 编排工作流

### 5.1 完整工作流（实施 + 审查）

```
用户请求
  │
  ├── 需要代码探索/Git 溯源/MCP？ → parallel scout(s)
  ├── 需要外部调研？ → researcher
  │
  ├── 综合结果 → 回复
  │
  ├── 需要实施？ → 先 planner（可选）→ worker（fork context）实施
  │
  └── 实施完成 → parallel reviewer × 3（fresh context）
       → 综合 review 反馈
       → worker 应用修复
       → 验证 → 完成
```

### 5.2 轻量工作流（仅调研）

```
用户提问（涉及代码理解）
  │
  ├── 单方向简单问题 → 直接探索（无需 delegate）
  ├── 复杂问题 → parallel scout(s) + 可选 researcher
  │
  └── 综合 → 回复
```

### 5.3 快速判断

```
用户请求 →
  是否简单（< 3 步工具调用可得结论）？
  ├── 是 → 直接做
  └── 否 →
      需要代码探索 / Git 溯源 / MCP？
      ├── 是 → delegate to scout(s) [并行]
      └── 否 → 主 session 执行
      └── 综合 → 回复
```

---

## 6. Task Prompt 编写指南

给 subagent 的 task 要遵循 **紧凑契约** 风格：

### 好例子

```
"用 gitnexus 查询 UserService.findByEmail 的调用链，输出 key files + 行号"
"grep 搜索 src/auth/ 下所有 'permission' 相关代码，列出关键函数和文件"
"用 git log --all --grep='feature-X' 追溯该功能的完整提交史，输出每个 commit 的 hash + 标题 + 改动文件"
"用 git bisect 定位引入 bug#1234 的 commit：起点 main~50，终点 main，复现命令为 npm test test/specific"
"并行探索：方向 A = repo A 的 auth 流程，方向 B = repo B 的 token 验证"
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

## 7. 底线约束

### 必须 delegate

- **涉及 3+ 跨文件的分析** → scout
- **调用返回大量数据的 MCP/gitnexus 工具** → scout
- **Git 多步溯源（log + blame + diff 组合）** → scout
- **多个独立方向同时探索** → parallel
- **实施完成后** → parallel review

### 不要 delegate

- 单次 `lsp definition` / `references` 查询
- 单次 grep 搜索
- 简单文件读取
- 用户直接要求的单步操作
- 需要在主 session 上下文中才能准确判断的决策

### 其他约束

- **写操作单线程**：review 可以并行，修改必须串行
- **subagent 不能嵌套 subagent**：所有编排在主 agent
- **决策权在主 agent**：综合、判断、回复由主 agent 完成
- **不要轮询 async 子 agent**：启动 async 后立即结束当前回合
