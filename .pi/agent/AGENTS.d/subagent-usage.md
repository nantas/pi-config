# subagent() 一次性委派指南

> 本文档定义 `subagent()` 工具的**唯一边界**：只用于拿一次性结果，以及不在 hc 环境时的降级。
> 角色分工总则在 [AGENTS.md](./AGENTS.md) 的「角色分工与任务委派」；
> 需要保留上下文、需要按验收反馈继续改的执行工作走 hc worker，见 [hc-delegation.md](./hc-delegation.md)。
> Agent 定义位于 `.pi/agents/*.md`（项目级）和 `~/.pi/agent/agents/*.md`（全局）。

---

## 1. 适用范围（先读这一节）

`subagent()` 的价值是 **token 屏障**：一次问答式调用，主 agent 只留摘要。
它**不是**实施通道——子 agent 的上下文在返回时就消失了，无法继续追问、无法按验收意见续改。

| 任务形态 | 用 `subagent()`？ |
|----------|------------------|
| 一次性检索/探索，产出结论摘要 | ✅ |
| 按固定脚本/流程跑一遍并回报结果 | ✅ |
| 单次外部资料调研，产出报告 | ✅ |
| 只需静态判断的审查报告（不需要后续修复协作） | ✅ |
| 当前不在 hc 环境（无 `hc` CLI）下的执行类工作 | ✅ 降级 |
| 多文件实现改动 | ❌ hc worker（`grunt`/`workhorse`） |
| 需要构建/测试循环、反复试错 | ❌ hc worker |
| 可能要根据验收反馈继续改 | ❌ hc worker（上下文要留住） |
| 长任务、并行任务 | ❌ hc worker |
| 1-2 步精确检索、已知文件路径 | ❌ 主 agent 直接做 |

判断标准一句话：**结果交回来就结束、后面不需要再和它对话** → `subagent()`；
**要它继续改、要留上下文到验收通过** → hc worker。

---

## 2. API 概览

`@johnnywu/pi-subagents@2.3.1` 提供的 subagent tool：

```typescript
subagent({
  agent: "worker",     // 必填：agent 名称
  task: "任务描述",      // 必填：一次性任务
  cwd: "/path/to/dir", // 可选：工作目录
  session: "none"       // 可选："none"（默认，全新子 session）或 "fork"（从当前会话分叉，任务依赖当前对话历史时用）
})
```

**能力边界**：
- ✅ 保留：单 agent 执行、agent 配置（model/thinking/tools/frontmatter）、session 分叉
- ❌ 没有：`chain`、`tasks`、`async`、`action`、`output`、`context`、`concurrency`
- ❌ 没有：slash commands（`/run`、`/agents`、`/chain`）

需要并行时，主 agent 在同一个 turn 里发起多次 `subagent()` 调用（运行时逐个执行）。

---

## 3. 触发场景（一次性结果）

| 场景 | 触发条件 | 委派动作 |
|------|---------|----------|
| **代码探索** | 追踪跨文件调用链、跨 3+ 文件找模式，只要结论 | `worker`（task 内声明只读） |
| **重数据工具** | 返回大量数据的只读工具组合调用 | `worker`（task 内声明只读） |
| **Git 溯源** | `git log/blame/diff/bisect` 追功能变更史或 bug 引入点 | `worker`（task 内声明只读） |
| **外部资料调研** | 搜外部文档、API 规范、生态信息 | `researcher` |
| **静态审查** | 实施完成后要一份独立的审查报告 | `reviewer`（可多次调用取不同角度） |

不需要委派：

| 你打算做的事 | 为什么自己做 |
|-------------|-------------|
| 单次 `grep` / `find` / `lsp definition` | 轻量，一次调用就有结果 |
| 读一个已知路径的文件 | 直接 `read` |
| 1-2 步就能确认的事实 | 委派开销大于收益 |
| 需要完整原始数据才能判断的决策 | 摘要会丢信息 |

---

## 4. Agent 选择矩阵

| 任务类型 | Agent | 模型 | Thinking | Tools |
|---------|-------|------|----------|-------|
| 外部资料调研 | `researcher` | `magpie/group/workhorse` | medium | read, grep, find, ls, bash, write, webfetch |
| 审查报告 | `reviewer` | `magpie/group/grunt` | low | read, grep, find, ls, bash, write |
| 一次性执行/检索 | `worker` | `magpie/group/grunt` | low | read, grep, find, ls, bash, edit, write |

> 模型是 Magpie 路由分组，分组内实际模型由 Magpie 配置决定；thinking 级别与 `~/.pi/agent/models.json` 中各分组的 thinkingLevelMap 对齐。
> 三个角色均启用 `systemPrompt: replace` 与 `maxDepth: 0`：替换 Pi 默认提示词、保留项目与全局 `AGENTS.md` 及运行时工具块，并从配置层禁止嵌套子代理。
> `worker` 具备完整编辑工具；用它做只读探索时，task 里必须写明「只读，不要修改任何文件」。

---

## 5. 多任务编排

### 5.1 串行依赖

把前一步结果作为后一步的 task 输入：

```
步骤 1: subagent({ agent: "worker", task: "只读探索 auth 模块，输出关键文件+行号，不要修改文件" })
→ 主 agent 提取结论

步骤 2: subagent({ agent: "worker", task: "基于以下结论检查 X：<粘贴关键发现>" })
```

链式改成两步一次性调用后，如果第二步会演变成「反复改到通过」，
就不要再堆 `subagent()`，按 [hc-delegation.md](./hc-delegation.md) 开一个 hc worker。

### 5.2 独立任务（伪并行）

同一 turn 内发起多次调用：

```
subagent({ agent: "worker", task: "只读探索方向 A：auth 模块结构..." })
subagent({ agent: "worker", task: "只读探索方向 B：数据库查询模式..." })
subagent({ agent: "researcher", task: "调研 OAuth 2.1 最新规范..." })
```

运行时依次执行（非真正并行）。需要真正并行的实施工作 → hc 多 worker。

### 5.3 审查

```
subagent({ agent: "reviewer", task: "审查当前 diff 的正确性和回归风险。直接检查变更文件，返回文件/行号级别发现。" })
subagent({ agent: "reviewer", task: "审查当前 diff 的测试覆盖和可维护性。直接检查变更文件。" })
```

审查返回的是报告。需要按报告继续修 → hc worker（或主 agent 自己改小改动），
不要靠一串新的 `subagent()` 调用来「接力修改」。

---

## 6. 结果综合

subagent 返回后，主 agent 负责综合：

```
## 结果综合

### 方向 A: auth 模块结构
- worker 发现：...（关键文件行号引用）

### 方向 B: OAuth 流程
- 追踪到：...（调用链 / commit hash）

### 判断
- 基于以上证据，建议...
```

综合时必须带上的内容：关键文件路径 + 行号、调用链摘要或 commit hash、置信度、
仍需确认的疑点。**没有亲眼验证的结果不写成已通过。**

---

## 7. Task Prompt 写法

一次性 task 用紧凑契约风格（Goal / Context / Validation / Output）：

```
Goal: 查 UserService.findByEmail 的调用链，输出关键文件 + 行号
Context: 只读，不要修改任何文件
Validation: 每个结论附带文件路径与行号
Output: 列表，按调用层级排序
```

避免：

```
"审查所有代码"                                    （太模糊）
"请理解这个代码库，然后...然后..."                  （需要多轮，不适用）
```

---

## 8. 底线约束

### 必须 `subagent()`

- 涉及 3+ 跨文件分析且只要结论 → `worker`（只读）
- 返回大量数据的只读工具组合调用 → `worker`（只读）
- 多步 Git 溯源（log + blame + diff）→ `worker`（只读）
- 外部资料调研 → `researcher`
- 一次性审查报告 → `reviewer`

### 不要 `subagent()`

- 实施类改动（多文件编辑、构建/测试循环、按反馈迭代）→ hc worker
- 长任务与并行工作 → hc worker / `hc run --bg`
- 单次 `lsp` / `grep` / 文件读取 → 自己做
- 需要主 session 上下文才能准确判断的决策 → 自己做
- 已经是被委派的子终端 → 守范围，不再开 agent（见 AGENTS.md 反递归护栏）

### 其他约束

- **不嵌套子 agent**：一次性调用不做编排，编排全部在主 agent。
- **决策权在主 agent**：综合、判断、回复由主 agent 完成。
- **每次调用只传 `agent` + `task`**（+ 可选 `cwd`）：没有 action/output/context/concurrency。
- **并行写文件**：不在 `subagent()` 层面并行改同一工作区；需要并行实施时用 hc worker + `$worktrunk-isolation`。
