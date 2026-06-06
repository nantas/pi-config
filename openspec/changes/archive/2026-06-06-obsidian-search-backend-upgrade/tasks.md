# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认所有 spec requirements 均有对应实现任务（见下方 2.x）
- [x] 1.2 确认环境满足前置条件：`python3` 已安装、`pip install jieba` 可执行、目标架构支持 FFF native addon
- [x] 1.3 确认 `@ff-labs/fff-node` 的 API 接口（`FileFinder.multiGrep()` 返回结构、`GrepMatch` 类型字段名）

## 2. 核心实现任务

### 2.1 jieba 持久化 Python worker（新增文件）

- [x] 2.1.1 创建 `tokenizer-worker.py`：实现 stdin/stdout JSON 行协议循环，接收 `["待分词文本1","待分词文本2",...]` 数组，返回 `[["词1","词2",...],...]` 数组。使用 jieba 默认模式（HMM 开启）。异常时返回 `{"error": "..."}` 响应。
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Query Tokenization" — jieba worker persistence scenario
  - **验证**: 启动子进程后发送 `["牌组构筑","引擎构筑"]`，收到 `[["牌组","构筑"],["引擎","构筑"]]`

### 2.2 package.json 依赖

- [x] 2.2.1 在 `obsidian-tools/package.json` 的 `dependencies` 中添加 `"@ff-labs/fff-node": "^0.9.1"`
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Search Execution" — FFF primary search scenario
  - **验证**: 安装依赖后 `require("@ff-labs/fff-node")` 返回有效的 `FileFinder` 类

### 2.3 search-config.ts — 配置默认值与新增字段

- [x] 2.3.1 修改 `validateTokenization()`：`method` 默认值从 `"intl_segmenter"` 改为 `"jieba"`
  - **spec ref**: `obsidian-search-config` → MODIFIED "Config Schema — Tokenization" — jieba as default method
- [x] 2.3.2 修改 `RuntimeConfig` 类型和 `validateRuntime()`：新增 `fff_timeout_ms`（默认 5000）和 `fff_page_size`（默认 200）字段
  - **spec ref**: `obsidian-search-config` → MODIFIED "Config Schema — Runtime" — runtime parameters for FFF backend
- [x] 2.3.3 更新 `generateDefaultConfig()`：tokenization.method 默认输出 `jieba`；runtime 新增 fff_timeout_ms 和 fff_page_size
  - **验证**: 生成的默认配置中 `tokenization.method: jieba`，`runtime` 含 `fff_timeout_ms: 5000` 和 `fff_page_size: 200`

### 2.4 search-tool.ts — 搜索后端替换（主修改）

- [x] 2.4.1 新增模块级 session 变量：`_finder: FileFinder | null`、`_tokenizerWorker: ChildProcess | null`。扩展 `resetSessionState()` 以清理它们（kill worker，release finder）
  - **spec ref**: `obsidian-tools-extension` → MODIFIED "Extension Lifecycle Management"
- [x] 2.4.2 实现 `initializeFinder(vaultPath): Promise<FileFinder>`：惰性创建 `new FileFinder({ rootDir: vaultPath, disableWatch: true })`，调用 `await finder.scan()` 和 `await finder.waitForIndexReady(5000)`
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Search Execution" — FFF primary search
- [x] 2.4.3 实现 `startTokenizerWorker(): ChildProcess`：惰性 spawn `python3 tokenizer-worker.py`（路径相对于扩展目录），建立 JSON 行协议通信
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Query Tokenization" — jieba worker persistence
- [x] 2.4.4 实现 `tokenizeWithJieba(text: string): string[]`：通过 worker 的 stdin 发送分词请求，await stdout 响应。超时或错误时回退到现有 `tokenizeQuery`（Intl.Segmenter）逻辑
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Query Tokenization" — jieba fallback scenario
- [x] 2.4.5 修改 `tokenizeQuery()`：当 `config.tokenization.method === "jieba"` 时，对中文部分调用 `tokenizeWithJieba()` 而非 `Intl.Segmenter`
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Query Tokenization" — Chinese tokenization with jieba
- [x] 2.4.6 移除 `resolveRgPath()` 和 `runRgSearch()`。替换为 `executeSearch(dir, pattern, config, vaultPath)`，内部使用 FFF `multiGrep(tokens, { pageSize, timeout })`。FFF 不可用时回退到 rg。
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Search Execution" — FFF primary + fallback scenarios
- [x] 2.4.7 修改 `resolveSearchDirs()`：FFF 模式下返回 vault root 作为单一搜索目录（后置过滤），rg 回退模式保留多 scope 并行搜索
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Search Execution" — parallel scope with FFF
- [x] 2.4.8 实现 FFF→RgMatch 的适配函数 `fffMatchesToRgMatches(fffResults, vaultPath)`：将 FFF 返回的 `GrepMatch[]` 转换为 `{ file, lineNum, text }[]` 格式，使其与现有 `mergeRgResults()` / `rankResults()` / `generateSnippet()` 兼容
  - **spec ref**: `obsidian-search-tool` → MODIFIED "Result Deduplication" — unchanged merge logic
- [x] 2.4.9 更新 `searchToolExecute` 主流程：在 tokenize + search 步骤前调用 `initializeFinder()` 和 `startTokenizerWorker()`（惰性初始化）；选择 FFF / rg 后端；构建输出时 mode 字段区分 `"fff"` / `"rg"`

### 2.5 index.ts — 生命周期事件更新

- [x] 2.5.1 `session_shutdown` 事件处理：确保 `resetSessionState()` 正确清理 FFF finder 和 Python worker（search-tool.ts 已实现，index.ts 保持调用即可）
  - **spec ref**: `obsidian-tools-extension` → MODIFIED "Extension Lifecycle Management" — session shutdown cleanup

## 3. 收敛与验证准备

- [x] 3.1 在 my-wiki vault 中运行完整搜索流程，确认：
  - 无 config 时 FFF 搜索正常（tokenization.method=jieba 默认值生效）
  - 中英文混合查询返回相关结果（如 `"协同效应"`、`"卡牌 synergy"`）
  - scope 参数正确过滤结果
  - fast / deep 模式 snippet 差异正确
  - 回退路径验证：移除 `@ff-labs/fff-node` 后自动使用 rg 搜索
- [x] 3.2 验证 `/reload` 后工具正常注册，session_shutdown 清理正确
- [x] 3.3 确认 `search-tool.ts` 中不再有 `resolveRgPath()` 和 `runRgSearch()`（仅保留在回退路径内作为 `executeSearch` 的内部逻辑）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence 映射）
- [x] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`（目标、字段映射、前置条件）
- [x] 4.3 执行 `writeback.md` 中定义的回写目标：
  - 更新 `repo://my-wiki/docs/design/obsidian-search-backend-upgrade.md` 添加实现状态结论
  - 按需更新 `.pi/capabilities.yaml`
