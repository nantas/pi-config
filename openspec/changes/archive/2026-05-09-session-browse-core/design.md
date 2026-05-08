# Design

## Context

历史 Pi session 以 JSONL 格式存储在 `~/.pi/agent/sessions/<project-hash>/` 下，也支持从 `.pi/sessions/` 的 HTML 导出文件读取。当前 Pi 生态缺少一个让 LLM Agent 自行检索历史 session 的工具层。

本 change 实现 session-browse extension 的核心后端：基于 SQLite FTS5 的 per-entry 索引引擎 + 三个检索 Tool。

参考实现：https://github.com/kaiserlich-dev/pi-session-search (MIT) — 仅参考架构设计，全部代码自主编写。

### 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│  Extension 入口 (index.ts)                                   │
│  ├── registerTool("session-search") → indexer.search()      │
│  ├── registerTool("session-expand") → expander.buildTurn()  │
│  └── registerTool("session-read")   → 直接读 JSONL / HTML   │
├──────────────────────────────────────────────────────────────┤
│  索引引擎 (indexer.ts)                                       │
│  ├── findSessionFiles() — JSONL + HTML 发现                 │
│  ├── updateIndex() — 增量索引                               │
│  ├── search() — FTS5 BM25 查询                              │
│  └── listRecent() — 最近 session 列表                       │
├──────────────────────────────────────────────────────────────┤
│  上下文展开 (expander.ts)                                    │
│  └── buildTurnFromEntryId() — turn 定位                     │
├──────────────────────────────────────────────────────────────┤
│  HTML 解析 (html-parser.ts)                                  │
│  └── parseHtmlExport() — base64 → entries                   │
├──────────────────────────────────────────────────────────────┤
│  SQLite: ~/.pi/session-browse/index.db                       │
│  └── sessions / session_fts / entries                        │
└──────────────────────────────────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**

- 实现 per-entry FTS5 全文索引，支持 JSONL 和 HTML 两种 session 文件格式
- 支持增量索引（基于文件 mtime），避免每次全量重建
- 提供 `session-search`、`session-expand`、`session-read` 三个 `registerTool`
- 索引查询延迟 < 1ms（FTS5 BM25），增量更新 < 200ms
- 内存足迹可控：索引始终在 SQLite 文件中，不驻留内存

**Non-Goals:**

- 不实现 UI 叠加层（Ctrl+Shift+F 搜索界面）— Change 2
- 不实现 Session Resume — Change 2
- 不实现 AI 摘要功能（无需 OpenRouter API key）
- 不索引 thinking blocks（含 ANSI codes，信噪比低）
- 不 fork pi-session-search 作为独立 package

## Decisions

### D1: 第一方 Extension (`.pi/extensions/session-browse/`) 而非独立 Package Fork

**理由**: pi-session-search 仅作为参考实现，最终代码 ~92% 是重写或新增。fork 的 GitHub 管理 + 迭代循环（commit → push → pi install -l）开销远大于收益。extension 子目录模式下 `/reload` 即可迭代。

### D2: 子目录模式（因 better-sqlite3 原生依赖）

```
.pi/extensions/session-browse/
├── package.json    (dependencies: better-sqlite3, @sinclair/typebox)
├── node_modules/
├── index.ts        (入口)
├── indexer.ts      (索引引擎)
├── expander.ts     (turn 展开)
├── html-parser.ts  (HTML 解析)
└── types.ts        (类型定义)
```

三种方案对比：

| 方案 | 原生模块支持 | 文件数量 | 依赖管理 |
|------|:-----------:|:--------:|:--------:|
| 单文件 (`.pi/extensions/session-browse.ts`) | ❌ | 1 | 无 |
| 子目录 + `package.json` | ✅ | 5 | npm |
| 独立 package fork | ✅ | ~10 | GitHub + npm |

**结论**: 子目录模式是唯一支持 `better-sqlite3` 且保持轻量的方案。

### D3: 全局去重 + session_shutdown 清标记

按照 pi-extension-dev 规范，extension 必须包含：

```typescript
const _key = "__pi_ext_session_browse_loaded";
if ((globalThis as any)[_key]) return;
(globalThis as any)[_key] = true;

pi.on("session_shutdown", () => {
  delete (globalThis as any)[_key];
});
```

防止扩展同时从项目 `.pi/extensions/` 和全局 `~/.pi/agent/extensions/` 加载时注册重复。

### D4: 索引位置 `~/.pi/session-browse/` 而非 `~/.pi-session-search/`

遵循 Pi 配置命名空间规范：`~/.pi/` 下的子目录由 Pi 自己管理（版本间保留），自定义索引放在独立子目录而非顶层。

### D5: HTMl 解析策略

大文件（2.6MB+ base64）使用 `indexOf()` + `slice()` 替代 `String.match()`，避免正则回溯性能问题：

```typescript
const start = html.indexOf('<script id="session-data"');
const contentStart = html.indexOf('>', start) + 1;
const contentEnd = html.lastIndexOf('</script>');
const base64 = html.slice(contentStart, contentEnd);
```

### D6: Turn 定位算法

```
输入: entry_id, session_path
1. 定位 entry → 查询 entries 表
2. 向前搜索最近的 user entry（按 timestamp 向前）
3. 向后遍历直到下一个 user entry（不含）
4. 输出: USER block + ASST text blocks + tool name references
```

**输出格式设计考量**: 不含 toolResult 内容，因为 turn 中的 assistant text blocks 天然包含了完整的决策摘要。用户需要 toolResult 全文时，可以再调用 `session-read`。这符合"渐进式上下文补充"的设计原则。

### D7: 未使用事件监听

本 extension 不监听任何 Pi 生命周期事件（`before_agent_start`、`context` 等），仅通过 `registerTool` 暴露能力。因此不存在事件处理器干扰 Pi 核心或与其他 extension 冲突的风险。

## Risks / Migration

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `better-sqlite3` 原生模块编译失败 | Extension 无法加载 | 本地 x86/ARM 架构下测试，如果失败考虑 `sql.js` 替代（纯 JS，无原生依赖，但性能降低 ~10x） |
| JSONL 行号定位失效 | session-read 返回错误行 | 使用 entry_id 而非 line_number 作为主定位键，line_number 仅作辅助校验 |
| FTS5 查询语法错误导致异常 | 搜索返回空或崩溃 | 实现 token 消毒函数 `sanitizeTokens()`，过滤特殊字符 |
| 索引目录权限不足 | ~/.pi/session-browse/ 无法写入 | 使用 `fs.mkdirSync({ recursive: true })`，包装 try/catch |
| 索引版本不兼容 | 旧版本索引被新代码读取 | 在 sessions 表中存储 schema_version，检测到旧版本时自动重建 |
| 增量索引并发写入 | 多个 session 同时更新 | SQLite WAL 模式天然支持多读单写；扩展加载时单线程执行 updateIndex |
