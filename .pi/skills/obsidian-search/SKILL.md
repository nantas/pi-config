---
name: obsidian-search
description: Intelligent Obsidian vault retrieval via obsidian_search and obsidian_cli tools
---

# obsidian-search

## 触发条件

### 何时触发 `obsidian_search`

当满足以下任意条件时，**应当**调用 `obsidian_search` 检索 vault 知识库：

1. **当前上下文缺失** — 用户提到的术语、项目名、概念不在当前对话上下文中
2. **用户要求检索** — 用户明确要求查找、定位 vault 中的内容
3. **引用 vault 实体** — 用户引用了一个 vault 中的特定实体（项目名、研究主题、文档引用）
4. **事实依赖 vault** — 回答问题的关键事实需要从 vault 获取，且不在当前上下文中

### 何时不触发

以下情况 **不应** 调用 `obsidian_search`：

- 答案完全在当前的对话上下文中（用户正在讨论刚才读取过的内容）
- 用户给出了完整、明确的文件路径并要求直接读取（此时应使用 `obsidian_cli read` 或文件系统工具）

---

## Query 优化

调用 `obsidian_search` 前，将用户的自然语言问题预处理为优化关键词：

1. **提取关键实体** — 项目名、模块名、概念名
2. **提取动作/行为词** — design, benchmark, pipeline, architecture, result
3. **组合为关键词串** — 不要保留完整的问句句式
4. **推断 scope** — 从问题上下文中推断子目录限定
5. **跨语言转换** — 当 vault 主语言与用户问题语言不同时，同时尝试英文关键词或同义词
   - 例如「牌组构筑」→ 英文 `deck building` / `deckbuilding`
   - 例如「任务追踪」→ 英文 `task tracking` / `tasks`
   - 例如「性能基准」→ 英文 `performance benchmark`

### 示例

| 用户问题 | 优化后 query | scope |
|---------|-------------|-------|
| "上次做的那个 Obsidian CLI benchmark 的结果是什么" | `Obsidian CLI benchmark 结果` | `30_研究/知识库` |
| "帮我找一下 OrbitOS 的项目首页" | `OrbitOS 项目首页` | `20_项目/OrbitOS` |
| "看看 Pipeline 模块有哪些接口" | `Pipeline 接口` | (自动推断) |

---

## 模式选择

### fast 模式

适用于：
- **定位型问题** — 已知某个页面存在，只需快速找到它
- **快速确认** — 检查某个术语或概念是否在 vault 中出现
- 平均耗时 ~3 秒

### deep 模式

适用于：
- **关联探索** — 需要了解某个页面的邻接上下文
- **决策链路追溯** — 追溯某个决策的 backlinks 和相关文档
- 平均耗时 ~5-8 秒

### 自动升级 (auto-upgrade)

当 fast 模式的前两名得分差距小于 0.15 时，`obsidian_search` **会自动升级到 deep 模式** 执行上下文扩展。因此你不需要在不确定时强行指定 deep 模式 — 系统会在低置信度时自动扩展。

---

## 结果消费

### 解读结果

1. **检查 `details.mode`** — `"fallback"` 表示置信度较低的结果（来自 ripgrep 文本搜索），`"cli"` 为正常 CLI 检索结果
2. **主候选** — `topk[0]` 是得分最高的结果，作为主要参考
3. **多候选呈现** — 当 topk 有多条高得分条目时，向用户展示排名列表
4. **深度阅读** — 如果 snippet 不足以回答用户问题，调用 `obsidian_cli` 或 `read` 读取完整文件内容

### 置信度判断

| 场景 | 行动 |
|------|------|
| `topk[0].score ≥ 0.8` | 高置信度，可直接作为答案呈现 |
| `topk[0].score 0.5-0.79` | 中等置信度，建议读取完整文件确认 |
| 全部分数 < 0.4 | 低置信度，告知用户并建议优化 query |
| mode 为 "fallback" | 结果来自文本搜索，不如 CLI 检索精确 |
| `topk` 为空（0 结果） | 先尝试英文/近义词重查一次；若仍为空，用 `obsidian_cli tags` 发现 vault 标签体系再重查 |
| mode="fallback" 且返回 0 结果 | 说明 query 在文件系统中也无匹配，换用完全不同的一组关键词 |

---

## 路由协作

`obsidian_search` 的检索结果可以串联到后续操作：

| 用户意图 | 工作流 |
|---------|--------|
| **retrieve**（检索） | 直接呈现结果，可选询问是否要读取完整文件 |
| **update**（更新） | 检索 → 确认目标 → 使用 `obsidian_cli` 或 `edit` 工具更新 |
| **summarize**（总结） | 检索 → 读取完整文件 → 生成摘要 |
| **archive**（归档） | 检索 → 确认 → 执行归档工作流 |

---

## 示例

### 示例 1: 定位项目页面并读取内容

**用户问题**: "帮我找一下 OrbitOS 的项目设计文档"

**Query 预处理**: 提取关键实体 → `"OrbitOS 设计"`，scope → `"20_项目/OrbitOS"`

**Tool 调用**:
```
obsidian_search({
  query: "OrbitOS 设计",
  scope: "20_项目/OrbitOS",
  mode: "fast"
})
```

**预期结果**: 返回 OrbitOS 项目目录下的设计文档，score ≥ 0.8

**后续行动**: 阅读 top 结果的完整内容 → 向用户呈现关键设计决策

---

### 示例 2: 追溯决策链路（deep 模式）

**用户问题**: "OrbitOS 的 CLI 融合工作流是怎么决定最终策略的"

**Query 预处理**: `"CLI 融合工作流 决策"`，范围涉及多个子目录

**Tool 调用**:
```
obsidian_search({
  query: "CLI 融合工作流 决策",
  mode: "deep"
})
```

**预期结果**:
- topk 返回核心决策文档
- related.backlinks 包含引用该决策的页面
- related.links_out 列出该页面引用的参考资料
- related.context 包含邻接上下文

**后续行动**:
1. 检查 backlinks 找到哪些团队/项目引用了该决策
2. 读取决策文档的完整内容
3. 按时间线组织呈现给用户

---

### 示例 3: 更新 vault 中的项目状态

**用户问题**: "把 Obsidian Tools extension 的状态改成已完成"

**Query 预处理**: `"Obsidian Tools extension 状态 项目"`

**Tool 调用**:
```
obsidian_search({
  query: "Obsidian Tools extension",
  mode: "fast"
})
```

**预期结果**: 找到项目状态页面/任务追踪文档

**后续行动**:
1. 读取完整文件确认内容
2. 使用 `obsidian_cli({ command: "read", params: { file: "路径" } })` 读取
3. 使用 `obsidian_cli({ command: "property:set", params: { file: "路径", key: "status", value: "已完成" } })` 更新状态
4. 确认更新结果并向用户报告

---

### 示例 4: 跨语言检索恢复（中文 query → 英文关键词 fallback）

**用户问题**: "牌组构筑游戏机制的相关解释"

**Query 预处理（第一次尝试）**: 提取中文关键词 → `"牌组构筑"`

**Tool 调用 1**:
```
obsidian_search({
  query: "牌组构筑",
  vault: "my-wiki",
  mode: "fast"
})
```

**结果**: `mode: "fallback"`, `topk` 为空（CLI search 和 rg fallback 均无命中）

**Query 预处理（跨语言重试）**: 将中文词转换为英文同义词 → `"deck building"` / `"deckbuilding"`

**Tool 调用 2**:
```
obsidian_search({
  query: "deckbuilding",
  vault: "my-wiki",
  mode: "fast"
})
```

**预期结果**: 返回 3 条结果，top1 = `car-05-deck-building.md`（score: 0.55）

**后续行动**:
1. 读取 `car-05-deck-building.md` 完整内容
2. 向用户呈现 Deck Building 机制概述、设计要点、示例游戏
3. 告知用户"牌组构筑"在 vault 中无直接中文匹配，但因内容实际是英文故改用 `deckbuilding` 找到对应文档
