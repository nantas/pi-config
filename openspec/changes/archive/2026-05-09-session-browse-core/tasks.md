# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `session-index-engine` 的 7 个 requirement（sqlite-schema-creation, jsonl-session-discovery, per-entry-content-extraction, incremental-indexing, full-text-search, recent-sessions-list, index-rebuild）的实现边界
- [x] 1.2 确认 `session-retrieval-tools` 的 4 个 requirement（session-search-tool, session-expand-tool, session-read-tool, tool-error-handling）的实现边界
- [x] 1.3 确认 `html-export-support` 的 5 个 requirement（html-file-discovery, html-data-extraction, html-entries-feed-into-index-engine, html-read-support, html-no-resume）的实现边界
- [x] 1.4 确认前置依赖：确认 `better-sqlite3` 在当前 Node 版本下可编译（`npm install` 测试）

## 2. 核心实现任务

### 2.1 项目结构初始化

- [x] 2.1.1 创建 `.pi/extensions/session-browse/` 目录及 `package.json`（含 `better-sqlite3`、`@sinclair/typebox` 依赖），运行 `npm install`
  - **覆盖**: design D2（子目录模式）
  - **验证**: `package.json` 存在，`node_modules/better-sqlite3` 存在，`npm install` 无错误

### 2.2 类型定义

- [x] 2.2.1 编写 `types.ts` — 定义 `SessionEntry`、`SearchResult`、`TurnData`、`SessionMeta` 等核心类型
  - **覆盖**: design D2
  - **验证**: 类型定义完整，TypeScript 编译无类型错误

### 2.3 索引引擎实现

- [x] 2.3.1 实现 SQLite 连接管理（`getDb()` / `closeDb()`），WAL 模式，创建 sessions / session_fts / entries 三表
  - **覆盖**: spec `session-index-engine` → `sqlite-schema-creation`
  - **验证**: 调用后 `~/.pi/session-browse/index.db` 存在且三表符合 schema

- [x] 2.3.2 实现 `findSessionFiles()` — 扫描 `~/.pi/agent/sessions/*.jsonl` + `.pi/sessions/*.html`，返回文件列表含 mtime
  - **覆盖**: spec `session-index-engine` → `jsonl-session-discovery`, spec `html-export-support` → `html-file-discovery`
  - **验证**: 在有/无 session 文件时分别测试，路径不存在时优雅降级

- [x] 2.3.3 实现 `extractEntriesFromJsonl()` — 逐行解析 JSONL，按 entry 类型提取索引文本（user text 全量、asst text 全量、toolCall name+args、toolResult 截断 2000）
  - **覆盖**: spec `session-index-engine` → `per-entry-content-extraction`
  - **验证**: 对已知 JSONL 文件提取后，索引文本中不含 thinking block，toolResult 不超过 2000 字符

- [x] 2.3.4 实现 `updateIndex()` — 增量索引：对比 mtime，对变更文件删除旧 entry → 插入新 entry；对新文件全量索引
  - **覆盖**: spec `session-index-engine` → `incremental-indexing`
  - **验证**: 首次索引后修改文件 mtime，再次索引应反映变更；未改动文件不重复索引

- [x] 2.3.5 实现 `search()` — FTS5 BM25 查询 + `sanitizeTokens()` 消毒，支持可选 `session_path` 过滤，返回 entry 级别结果（含 snippet）
  - **覆盖**: spec `session-index-engine` → `full-text-search`
  - **验证**: 搜索 "architecture" 返回正确命中；搜索特殊字符不报错；按 session_path 过滤有效

- [x] 2.3.6 实现 `listRecent()` — 返回 sessions 表按 timestamp 降序的全部记录
  - **覆盖**: spec `session-index-engine` → `recent-sessions-list`
  - **验证**: 返回结果按时间从新到旧排序

- [x] 2.3.7 实现 `rebuildIndex()` — 清空三表 + 全量发现并重新索引
  - **覆盖**: spec `session-index-engine` → `index-rebuild`
  - **验证**: 重建后搜索结果与重建前一致

### 2.4 HTML 解析

- [x] 2.4.1 实现 `parseHtmlExport()` — 提取 `<script id="session-data">` base64 字符串 → decode → JSON parse → 返回 `{ header, entries[], ... }`
  - **覆盖**: spec `html-export-support` → `html-data-extraction`
  - **验证**: 对已知 HTML export 文件正确解析出 entries 数组；对大文件使用 `indexOf()` + `slice()` 高效提取

- [x] 2.4.2 实现 `extractEntriesFromHtml()` — 将 HTML 解析结果映射到与 JSONL 相同的 entries 格式，供索引引擎统一处理
  - **覆盖**: spec `html-export-support` → `html-entries-feed-into-index-engine`
  - **验证**: HTML 文件的 entries 被写入同版本的 session_fts 表，搜索返回结果

### 2.5 上下文展开

- [x] 2.5.1 实现 `buildTurnFromEntryId()` — turn 定位算法：由 entry_id → 向前找最近的 user entry → 向后收集直到下一个 user entry → 格式化输出
  - **覆盖**: spec `session-retrieval-tools` → `session-expand-tool` (turn expansion algorithm)
  - **验证**: 对已知 turn 结构，返回的 turn 包含正确的 user + 所有 asst text + tool call 引用，不含 toolResult 内容

### 2.6 Extension 入口

- [x] 2.6.1 实现 `index.ts` — 全局去重标记 + `session_shutdown` handler
  - **覆盖**: design D3
  - **验证**: 两次 `/reload` 后无重复注册报错

- [x] 2.6.2 注册 `session-search` tool — 绑定 `search()`，格式化输出为 `[timestamp] role id=entry_id | snippet`
  - **覆盖**: spec `session-retrieval-tools` → `session-search-tool`, `tool-error-handling`
  - **验证**: `pi -e` 加载后，LLM 可调用该工具并返回格式化结果

- [x] 2.6.3 注册 `session-expand` tool — 绑定 `buildTurnFromEntryId()`，输出 user text + asst text + tool call 列表
  - **覆盖**: spec `session-retrieval-tools` → `session-expand-tool`, `tool-error-handling`
  - **验证**: 传入 session-search 返回的 entry_id，返回完整的 turn 上下文

- [x] 2.6.4 注册 `session-read` tool — 直接读原始 entry 内容（含 toolResult），支持 `max_chars` 截断，支持 HTML 文件
  - **覆盖**: spec `session-retrieval-tools` → `session-read-tool`, spec `html-export-support` → `html-read-support`
  - **验证**: 读取 toolResult entry 返回完整原始内容，截断生效

## 3. 收敛与验证准备

- [x] 3.1 整理验证 checkpoints：索引构建、增量更新、搜索准确性、turn 展开准确性、HTML 支持、错误处理
- [x] 3.2 标记 writeback 摘要：`session-browse` 扩展注册到 `global.extensions`，Change 1 新增 5 个文件

## 4. 验证与回写收敛

- [x] 4.1 `pi -e .pi/extensions/session-browse/` 加载验证 — 无启动错误，三个 tool 注册成功
- [x] 4.2 `/reload` 热重载验证 — 无重复注册错误
- [x] 4.3 端到端检索工作流验证: session-search → session-expand → session-read 完整调用
- [x] 4.4 HTML export 索引验证: 索引 HTML 文件 → 搜索返回命中 → session-read 可读
- [x] 4.5 生成 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.6 生成 writeback.md（绑定回写目标与字段映射）
- [x] 4.7 执行回写：更新 `.pi/capabilities.yaml` → `global.extensions` 添加 `session-browse`
- [x] 4.8 运行 `./scripts/sync-pi-agent.sh` 部署到全局
