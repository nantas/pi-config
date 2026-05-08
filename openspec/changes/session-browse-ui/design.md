# Design

## Context

Change 1 (`session-browse-core`) 提供了三个 LLM Tool（session-search/expand/read）作为后端基础设施。Change 2 在此基础上为**人类用户**添加交互入口。

关键约束：
- `/browse` 已被 `browse-session-tree.ts` 注册（session tree 导航）
- `/resume` 已被占用（来源待确认）
- `setEditorComponent()` 无冲突风险但语义不匹配（编辑器替换而非搜索 overlay）
- 所有后端能力通过 Change 1 暴露的 API 消费，不新增后端逻辑

## Goals / Non-Goals

**Goals:**

- 注册 `/sb` 命令：交互式 session 搜索/展开/读取工作流
- 注册 `/sr` 命令：session 列表 → 恢复对话
- 注册快捷键 `Cmd+Shift+F` → `/sb` 和 `Cmd+Shift+R` → `/sr`
- 全终端交互（无需自定义 Editor overlay）

**Non-Goals:**

- 不修改 Change 1 的后端文件（indexer.ts, expander.ts, html-parser.ts, types.ts）
- 不新增后端数据能力
- 不使用 `setEditorComponent()` 创建 UI overlay
- 不支持 HTML resume

## Decisions

### D1: 终端交互而非 Editor Overlay

三种方案对比：

| 方案 | 实现复杂度 | 与其他扩展冲突 | 用户体验 |
|------|:---------:|:-------------:|:--------:|
| `setEditorComponent` overlay | ⭐⭐⭐ 高 | 独占 Editor | 沉浸式 |
| `ctx.ui.custom()` 模态 UI | ⭐⭐⭐ 高 | 不冲突 | 模态，适合 tree |
| 终端命令交互 | ⭐ 低 | 不冲突 | 行内列表，实用 |

**结论**: 终端命令交互最适配 `registerCommand` 模式，实现简单、无冲突风险、充分利用 Pi 已有的终端输入范式。`/sb` 的搜索→选择→展开流程完全可以在终端内完成。

### D2: 命令命名（避开已占用名称）

| 原计划 | 冲突 | 替代名 | 理由 |
|--------|:----:|--------|------|
| `/browse` | ✅ browse-session-tree | `/sb` | session browse 缩写，简短 |
| `/resume` | ✅ (来源待确认) | `/sr` | session resume 缩写，简短 |

### D3: 快捷键

| 快捷键 | 命令 | 效果 |
|--------|------|------|
| `Cmd+Shift+F` | `/sb` (预填充) | 用户按下后输入框出现 `/sb `，直接输入查询 |
| `Cmd+Shift+R` | `/sr` | 直接执行，列表立即出现 |

### D4: 文件拆分

```
browser.ts — /sb 命令处理器
  - handleSbInput(args): 主入口
  - doSearch(query): 搜索 + 格式化结果列表
  - showTurnPreview(entryId, sessionPath): 展开 turn
  - showRawEntry(entryId, sessionPath): 读原文
  - promptLoop(results, currentIndex): 交互循环

resumer.ts — /sr 命令处理器
  - handleSrInput(args): 主入口
  - listRecentSessions(): 格式化 session 列表
  - resumeSession(sessionId): 调用 switchSession
```

两个文件都不需要额外 npm 依赖 (仅 `better-sqlite3` 已有的 db 连接)，通过 `registerCommand`/`registerShortcut` 在 `index.ts` 中挂载。

### D5: 复用 Change 1 API 而非重复

以下 API 直接从 Change 1 的模块导入，不重复实现：

- `indexer.search(query, sessionPath?)` — 搜索
- `indexer.listRecent()` — 列 session
- `indexer.getDb()` — DB 连接（用于 expander）
- `expander.buildTurnFromEntryId(db, entryId, sessionPath)` — 展开 turn
- `expander.formatTurn(turn)` — 格式化输出
- `html-parser.readHtmlEntry(filePath, entryId)` — 读 HTML entry
- `indexer.getDb()` + JSONL 解析 — 读 JSONL entry

### D6: 自动索引触发

当用户第一次使用 `/sb` 或 `/sr` 时，如果索引尚未初始化（`listRecent()` 返回空），自动触发 `updateIndex()`。复用 Change 1 已有的 `ensureIndexed()` 模式。

## Risks / Migration

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `Cmd+Shift+F` 被系统或其他扩展占用 | 快捷键失效 | Pi 的注册冲突会在加载时抛出 warning；考虑提供后备 `/sb` 命令（已有） |
| 大量搜索结果（100+）的终端展示 | 输出过长，终端滚动 | 限制显示 30 条，提示 "显示 X 条中的前 30 条，缩小搜索词以获取更精确结果" |
| `switchSession()` 切换后当前命令上下文丢失 | 无法返回命令 | `switchSession` 是终局操作，切换后旧 session 不可恢复，属预期行为 |
