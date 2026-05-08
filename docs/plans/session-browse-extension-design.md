# session-browse Extension — 设计方案与开发规划

> 日期: 2026-05-08
> 状态: 设计确认 (已审阅更新)
> 参考实现: https://github.com/kaiserlich-dev/pi-session-search (MIT)

## 1. 核心定位

**让 LLM Agent 能高效检索历史 Pi session 中的相关信息，渐进式补充到当前上下文中。**

核心交互模式：
1. Agent 调用 `session-search` 工具搜索关键词 → 获得 entry 级别的命中列表
2. 从命中列表判断哪条最相关 → 调用 `session-expand` 展开该 entry 所在的完整 user turn
3. 如需更多信息 → 调用 `session-read` 读取指定 entry 的完整原始内容

## 2. 数据源分析

### Pi Session 数据结构

Session 导出有两种格式：

| 格式 | 路径 | 说明 |
|------|------|------|
| `.jsonl` | `~/.pi/agent/sessions/<project-hash>/` | 原始格式，每行一个 JSON entry |
| `.html` | `.pi/sessions/` 或用户指定路径 | `/export` 产物，base64(JSON) 嵌入在 `<script id="session-data" type="application/json">` |

### JSONL Entry 类型

```
SessionEntry (type discriminant)
├── message (role: user | assistant | toolResult)
│   ├── user:      content[].text                          ← 最高检索价值
│   ├── assistant: content[thinking|text|toolCall]         ← text 高价值，toolCall 中等
│   └── toolResult: content[].text, toolCallId, toolName   ← 检索价值中等，但大输出需截断
├── model_change        (provider, modelId)                ← 低检索价值
├── thinking_level_change (thinkingLevel)                  ← 低检索价值
├── compaction          (summary, firstKeptEntryId)        ← 低频但可能有价值
├── label               (targetId, label)                  ← 书签标记
└── session_info        (name)                             ← 元信息
```

### 检索价值分析

| 字段 | 检索价值 | 索引策略 |
|------|----------|----------|
| user text | ⭐⭐⭐ 最高 | 全文索引 |
| assistant text | ⭐⭐⭐ 最高 | 全文索引 |
| toolCall name + arguments | ⭐⭐ 高 | 全文索引（bash 命令、grep pattern、read path 等） |
| toolResult text | ⭐ 中 | 截断 2000 字后索引 |
| thinking block | ⭐ 低 | 不索引（含 ANSI color codes，噪音大） |
| timestamp / entry_id | N/A | 作为 UNINDEXED 元数据存储 |
| parentId | N/A | 存 entries 元数据表，用于 turn 定位 |

### Turn 结构

一个 Turn = user message → 所有后续 assistant + toolResult entries → 下一个 user message

```
Turn 典型结构 (平均 ~24 entries):
  USER: "还有一个问题，在已知这个站点会有 rate limit..."
  ASST: thinking + text("好问题。让我检查...") + toolCall(read) + toolCall(read) + toolCall(ls)
  RESULT(read): "strategy.md content..."
  RESULT(read): "anti-crawl config..."
  RESULT(ls): "file listing..."
  ASST: thinking + toolCall(read)
  RESULT(read): "rate-limit-api.md content..."
  ASST: thinking + text("根因：多层架构缺口...")   ← 包含完整的分析结论
```

**关键发现**：每个 turn 的 assistant text blocks 天然包含了完整的决策摘要和结果汇报，足以
定位「用户问了什么，Agent 做了什么，结论是什么」。

## 3. Tool 设计

### Tool 1: `session-search`

关键词搜索，返回 entry 级别的命中列表。

```typescript
registerTool("session-search", {
  name: "session-search",
  description: "搜索历史 Pi session 中的相关条目。返回匹配的 entry 摘要列表。",
  parameters: Type.Object({
    query: Type.String({ description: "搜索关键词" }),
    session_path: Type.Optional(Type.String({ description: "指定 session 文件路径 (JSONL 或 HTML)" }))
  })
});
```

**输出格式**（每个 hit 一行）：
```
[2026-05-08T03:40:13] user id=e9ba7321 | 还有一个问题，在已知这个站点会有 rate limit 的情况下...
[2026-05-08T03:41:48] assistant id=c17685ea | 根因：多层架构缺口。这是一个策略配置与实现脱节的问题...
[2026-05-08T03:40:47] toolResult id=f2c741de | chrome-cdp-contract/spec.md:98: - **THEN** the error SHALL...
```

预估输出：搜索 "rate limit" 命中 26 条，~900 tokens。

### Tool 2: `session-expand`

展开命中 entry 所在的完整 user turn。

```typescript
registerTool("session-expand", {
  name: "session-expand",
  description: "展开指定 entry 所在的完整 user turn。输出: user text + 所有 assistant text + tool name 列表。",
  parameters: Type.Object({
    entry_id: Type.String({ description: "从 session-search 获得的 entry ID" }),
    session_path: Type.String({ description: "session 文件路径" })
  })
});
```

**输出格式**：
```
USER: 还有一个问题，在已知这个站点会有 rate limit 的情况下，为什么这部分没有在 site strategy 或 anti crawl 相关的策略里？

ASST: 好问题。让我检查一下当前架构中这些配置的位置：
  → called read(), read(), ls()

ASST: 这是当前架构的一个真实缺口。让我完整说明根因：
  → called read()

ASST: 根因：多层架构缺口
  这是一个策略配置与实现脱节的问题。实际情况比你看到的更严重...
```

预估输出：~850 tokens / turn。

### Tool 3: `session-read`

读取指定 entry 的完整原始内容。

```typescript
registerTool("session-read", {
  name: "session-read",
  description: "读取指定 entry 的完整内容（含 toolResult）。用于需要查看工具输出细节的场景。",
  parameters: Type.Object({
    entry_id: Type.String({ description: "entry ID" }),
    session_path: Type.String({ description: "session 文件路径" }),
    max_chars: Type.Number({ description: "截断长度", default: 5000 })
  })
});
```

## 4. 索引 Schema

### Per-entry FTS5 + 元数据表

> **索引存储路径：** `~/.pi/session-browse/index.db`

```sql
-- sessions 表（保持与 pi-session-search 兼容）
CREATE TABLE IF NOT EXISTS sessions (
    path TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    session_ts TEXT NOT NULL,
    mtime_ms INTEGER NOT NULL,
    first_user_message TEXT
);

-- per-entry FTS5 全文索引
CREATE VIRTUAL TABLE IF NOT EXISTS session_fts USING fts5(
    content,                -- 索引文本: user text + asst text + toolCall name+args + toolResult[:2000]
    session_path UNINDEXED,
    entry_id UNINDEXED,     -- entry.id，用于精确定位
    line_number UNINDEXED,  -- JSONL 行号，用于快速 seek
    role UNINDEXED,         -- "user" | "assistant" | "toolResult"
    tokenize='porter unicode61'
);

-- entries 元数据表（用于 expand 时的 turn 定位和上下文提取）
CREATE TABLE IF NOT EXISTS entries (
    session_path TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    parent_id TEXT,
    line_number INTEGER NOT NULL,
    role TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    has_text BOOLEAN DEFAULT 0,      -- assistant 是否有 text block
    tool_names TEXT,                  -- JSON array: ["bash","read","grep"]
    PRIMARY KEY (session_path, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_ts ON entries(session_path, timestamp);
```

### 索引大小估算

| 指标 | 值 |
|------|-----|
| 单个 session (440 entries) FTS rows | 419 |
| 单个 session 索引文本量 | ~544 KB |
| 100 sessions 估算 FTS rows | ~30,000 |
| 100 sessions 估算索引大小 | ~30 MB |
| 查询延迟 (FTS5 BM25) | < 1ms |

## 5. Expand 逻辑

### Turn 定位算法

```
1. 用 entry_id 在 entries 表查到 hit entry
2. 向前搜索：
   - 如果 hit 是 user → 这就是 turn 起点
   - 如果 hit 是 assistant/toolResult → 按时间戳向前找最近的 user entry
3. 向后搜索：
   - 从 turn 起点开始，直到遇到下一个 user entry（不含）
4. 输出：
   - USER: 完整 text
   - 每个 ASST entry: text block 全文 + "→ called tool1, tool2, ..."
   - 不包含 toolResult 内容
```

### HTML Export 支持

```
1. 检测到 .html 文件 → 正则匹配 <script id="session-data" type="application/json">(.+?)</script>
2. base64 decode → JSON parse → 得到 { header, entries, leafId, ... }
3. entries 走与 JSONL 相同的索引流程
4. HTML 文件不支持 resume
```

#### HTML Export 数据样本分析

样本文件：`pi-session-2026-05-08T01-49-38-946Z_019e0546-af01-730d-a729-0c0f7ecc9af4.html`（2.9MB）

**HTML 文件结构：**

```
<!DOCTYPE html>
<html>
<head>
  <style>...</style>                    ← ~1150 行 CSS（主题变量、布局）
  <script>marked.min.js</script>         ← vendored markdown 解析器
  <script>highlight.min.js</script>      ← vendored 代码高亮
</head>
<body>
  <div id="app">...</div>               ← DOM 骨架（空，由 JS 渲染）
  <script id="session-data" type="application/json">  ← ★ 核心数据
    eyJoZWFkZXIiOnsidHlwZSI6...        ← base64 编码的 JSON（单行，~2.6MB）
  </script>
  <script>                               ← 主渲染逻辑（~1800 行 JS）
    // 解码: atob(base64) → JSON.parse
    // 数据结构: { header, entries, leafId, systemPrompt, tools, renderedTools }
  </script>
</body>
</html>
```

**数据提取路径：**

```typescript
function parseHtmlExport(filePath: string): SessionData {
  const html = fs.readFileSync(filePath, 'utf-8');

  // Step 1: 提取 base64 字符串
  const match = html.match(
    /<script id="session-data" type="application\/json">(.+?)<\/script>/s
  );
  if (!match) throw new Error('session-data not found in HTML');

  // Step 2: base64 decode → UTF-8 JSON string
  const jsonStr = Buffer.from(match[1], 'base64').toString('utf-8');

  // Step 3: JSON parse → 与 JSONL entries 相同的结构
  return JSON.parse(jsonStr);
  // 返回: { header, entries[], leafId, systemPrompt, tools, renderedTools }
}
```

**HTML vs JSONL 差异：**

| 特性 | JSONL | HTML Export |
|------|-------|-------------|
| 文件大小 | 更小（纯 JSON 行） | ~2x（内嵌 CSS/JS + base64 膨胀 ~33%） |
| 数据位置 | 逐行解析 | 单行 base64 blob（可能 2.6MB+） |
| entry 结构 | 完全相同 | 完全相同 |
| 额外字段 | 无 | `systemPrompt`, `tools`, `renderedTools` |
| 解析性能 | ~50ms/2MB | ~100ms/2.9MB（base64 decode 额外开销） |
| 行号定位 | JSONL 行号直接 seek | 无行号概念，需遍历 entries 数组 |
| Resume 支持 | ✅ 原生支持 | ❌ 不支持 |
| 文件来源 | `~/.pi/agent/sessions/` | `.pi/sessions/` 或用户指定路径 |

**HTML 特有字段处理：**
- `systemPrompt` (21KB)：可选索引，一般不索引
- `tools` (11KB)：不索引
- `renderedTools` (dict)：预渲染 HTML，不索引，忽略

**大文件处理注意事项：**
- 2.6MB base64 字符串在单行上，`String.match()` 可能有效能问题
- 替代方案：用 `indexOf('<script id="session-data"')` 定位起止位置，`slice()` 提取
- `Buffer.from(str, 'base64')` 在 Node.js 中对大字符串效率良好
- entries 数组一次性全量解析（与 JSONL 逐行不同），对 440 条 entry 无压力

## 6. 参照策略

pi-session-search (https://github.com/kaiserlich-dev/pi-session-search, MIT) 用作**参考实现**，不作为 fork 源。

| 模块 | 参考来源 | 策略 | 说明 |
|------|----------|------|------|
| SQLite 连接管理 | indexer.ts getDb() / closeDb() | 📖 参考设计 | WAL 模式、meta 表结构参考，重新实现 |
| Session 文件发现 | indexer.ts findSessionFiles() | 📖 参考设计 | 扫描 .jsonl + 新增 .html 支持，增加项目 .pi/sessions/ 路径 |
| 项目名解析 | indexer.ts projectFromDir() | 📖 参考设计 | 适配不同项目目录结构 |
| 增量索引框架 | indexer.ts updateIndex() | 📖 参考设计 | mtime 增量 + 异步批量框架参考，替换提取和写入逻辑 |
| FTS5 Schema | indexer.ts CREATE TABLE | 🆕 自主设计 | per-chunk → per-entry，新增 entries 元数据表 |
| 内容提取 | indexer.ts extractContent() / extractContentAsync() | 🆕 自主重写 | per-entry 提取，保留 entry_id / line_number / role |
| FTS5 查询 | indexer.ts search() / buildFtsQuery() / sanitizeTokens() | 🆕 自主实现 | 返回 entry_id + entry-level snippet |
| Recent 列表 | indexer.ts listRecent() | 📖 参考设计 | 逻辑简单，参考后重新实现 |
| 重建索引 | indexer.ts rebuildIndex() | 🆕 自主实现 | 适配新 schema |
| Overlay UI | component.ts + screens/ | 🆕 自主实现 | 保留交互框架概念，UI 层全新实现 |
| Session Resume | resume.ts + index.ts switchSession | 🆕 自主实现 | 仅 JSONL，参考后重写 |
| Summarize | summarizer.ts | ❌ 不实现 | 不需要 OpenRouter 摘要 |
| Types | types.ts | 🆕 自主定义 | 按需求直接定义 |
| Extension 入口 | index.ts | 🆕 自主实现 | registerTool × 3，不含 command 体系 |
| HTML 解析 | 无 | 🆕 全新编写 | html-parser.ts |
| 上下文展开 | 无 | 🆕 全新编写 | expander.ts |

### 代码量估算

| 策略 | 文件数 | 行数 |
|------|-------|:----:|
| 🆕 自主实现/重写 | ~9 个文件 | ~1000 行 |
| 📖 参考设计后重写 | ~4 个函数 | ~200 行 |
| ❌ 不实现 | 1 个模块 | - |
| **总计** | ~10 个文件 | ~1200 行 |

> **架构决策**: 选择第一方 Extension 模式（.pi/extensions/session-browse/），而非 fork 独立 package。
> 原因：8% 代码参考率不值得 fork 的全生命周期管理；extension 模式迭代更快（/reload）。

## 7. 开发规划（2 Change 方案）

按独立验证能力合并为 2 个 openspec change：

### Change 1: session-browse-core

**范围**: 索引引擎 + 三个检索工具 + HTML 支持

```
1. 初始化子目录 + 安装依赖
   - .pi/extensions/session-browse/
   - npm init → package.json (better-sqlite3)
   - npm install

2. 填充类型定义 (types.ts)
   - SessionEntry / SearchResult / TurnData / ...

3. 实现索引引擎 (indexer.ts)
   - SQLite 连接管理 (WAL 模式)
   - Sessions / session_fts / entries 三表创建
   - findSessionFiles(): .jsonl + .html 发现
   - extractContent(): per-entry 提取
   - updateIndex(): 增量索引，按 mtime 判断
   - search(): FTS5 BM25 查询 + snippet
   - listRecent(): 最近 session 列表

4. 实现 HTML 解析器 (html-parser.ts)
   - extractBase64Payload(): 提取 session-data
   - parseHtmlExport(): base64 decode → JSON → entries[]
   - 融合到 indexer 的 extractContent 路径

5. 实现上下文展开 (expander.ts)
   - buildTurnFromEntryId(): turn 定位算法
   - 输出 user text + assistant text + tool name 列表

6. 实现 Extension 入口 (index.ts)
   - 全局自去重 + session_shutdown handler
   - on('resources_discover') → skill 注册（可选）
   - registerTool('session-search')
   - registerTool('session-expand')
   - registerTool('session-read')

7. 验证：pi -e .pi/extensions/session-browse/
   - 加载无报错
   - 搜索已有 session → 返回命中
   - Expand turn → 上下文准确
   - HTML export 可索引
```

### Change 2: session-browse-ui

**范围**: UI 叠加层 + Session Resume

```
1. 实现 UI overlay (component.ts + screens/)
   - 搜索屏幕: 显示搜索框 + 结果列表
   - 预览屏幕: 显示 turn 上下文
   - Ctrl+Shift+F 快捷键绑定

2. 实现 Session Resume
   - 选择 session 文件 → 恢复上次对话
   - 仅 JSONL 格式

3. 验证：
   - Ctrl+Shift+F 调出搜索界面
   - 搜索 → 选择结果 → 预览 turn
   - Resume 功能正常
```

> **设计原则**: Change 1 完成后即可在 LLM 层通过 `/session-search` 等工具完成检索工作流。
> Change 2 是增量增强，不改变 Change 1 的后端逻辑。

## 8. 文件结构

单文件模式不可行（依赖 better-sqlite3），使用子目录模式：

### Change 1 文件结构（核心后端）

```
.pi/extensions/session-browse/
├── package.json          (better-sqlite3)
├── node_modules/
├── index.ts              (入口: registerTool × 3 + lifecycle)
├── indexer.ts            (索引引擎: FTS5 + 增量更新 + 搜索)
├── expander.ts           (上下文展开: turn 定位)
├── html-parser.ts        (HTML 解析: base64 decode)
└── types.ts              (类型定义)
```

### Change 2 文件结构（UI + Resume，增量添加）

```
.pi/extensions/session-browse/
├── ...                   (Change 1 文件保持不变)
├── component.ts          (UI overlay: 搜索/预览屏幕)
├── resume.ts             (Session resume)
├── screens/
│   ├── search.ts         (搜索屏幕)
│   └── preview.ts        (预览屏幕)
└── lib/
    └── render-helpers.ts (UI 渲染辅助)
```

## 9. 约束与边界

- **不修改 `~/.pi/agent/settings.json`** — 通过 scripts/sync-pi-agent.sh 同步
- **不 fork pi-session-search** — 仅作为参考实现，所有代码自主编写
- **摘要功能不实现** — 不引入 OpenRouter/API key 依赖
- **thinking blocks 不索引** — 含 ANSI codes，信噪比低
- **HTML export 不支持 resume** — 无 JSONL 可恢复
- **索引位置**: `~/.pi/session-browse/index.db`（独立于 pi-session-search 的 `~/.pi-session-search/`，遵循 `~/.pi/` 下的命名空间规范）
