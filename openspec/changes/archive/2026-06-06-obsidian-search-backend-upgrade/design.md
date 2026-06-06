# Design

## Context

obsidian-tools 扩展的 `obsidian_search` 工具当前使用 `Intl.Segmenter` 进行中文分词 + `spawnSync("rg", args)` 作为搜索后端。这两个组件存在根本性缺陷：

1. **Intl.Segmenter** 对游戏设计领域常见的 2 字复合词（如 `构筑`、`牌组`、`桌游`）全部误拆为单字，在 OR 搜索下产生大量噪声匹配
2. **rg** 每次搜索启动子进程（fork/exec 开销），无预索引，依赖外部工具

在 my-wiki vault（5565 文件）上的对比测试已确认：
- **jieba** 分词质量正确，每次分割 ~0.02ms（首次字典加载 ~240ms）
- **FFF `multiGrep()`** 搜索 6-45ms（vs rg 1-3s），SIMD Aho-Corasick 多模式匹配语义等价

相关 specs: `specs/obsidian-search-tool/spec.md`, `specs/obsidian-search-config/spec.md`, `specs/obsidian-tools-extension/spec.md`

## Goals / Non-Goals

**Goals:**
- 将中文分词从 `Intl.Segmenter` 替换为 jieba（持久化 Python worker）
- 将搜索后端从 `rg` 子进程替换为 FFF `FileFinder.multiGrep()`（进程内预索引搜索）
- 保留两级回退链：jieba → Intl.Segmenter、FFF → rg
- `package.json` 添加 `@ff-labs/fff-node` 依赖
- `search-config.yaml` 的 `tokenization.method` 默认值改为 `"jieba"`
- `runtime` 配置新增 `fff_timeout_ms`（默认 5000）和 `fff_page_size`（默认 200）
- 新增 `tokenizer-worker.py`（jieba 持久化 worker 子进程）
- 保持工具参数接口、排名模型、snippet 生成完全不变

**Non-Goals:**
- 不引入全新外部能力 ID
- 不修改 vault-resolver.ts
- 不修改排名/排序算法
- 不修改 snippet 生成逻辑
- 不修改工具参数 schema

## Decisions

### D1: jieba 通过持久化 Python worker 集成

**决定**：在 `session_start`（惰性——首次搜索需要中文分词时）spawn 一个 `python3` 子进程，运行 `tokenizer-worker.py`。该 worker 通过 stdin/stdout JSON 行协议通信：stdin 读入待分词文本，stdout 输出分词结果数组。扩展退出时 `worker.kill()`。

**理由**：
- jieba 默认模式（HMM 开启）的游戏设计复合词分割质量远优于 Intl.Segmenter
- 持久化 worker 消除首次字典加载后，每次分割 ~0.02ms
- 支持自定义词典扩展（`jieba.add_word()`）
- JSON 行协议已在测试中验证工作正常

**影响**：
- 新增文件 `tokenizer-worker.py`（扩展同级目录）
- 环境约束：需 `python3` + `pip install jieba`
- 启动失败回退到 `Intl.Segmenter`（当前实现）

### D2: FFF multiGrep 替换 rg

**决定**：将搜索后端从 `spawnSync("rg", args)` 替换为 `FileFinder.multiGrep()`。通过 `@ff-labs/fff-node` 包初始化预索引，搜索时调用 `finder.multiGrep(tokens, { pageSize, timeout })`。

**理由**：
- 进程内搜索，零子进程开销
- 预索引（惰性扫描），后续搜索 6-45ms
- SIMD Aho-Corasick 多模式匹配与 tokenized OR 语义天然匹配
- 同节点上的 `@ff-labs/pi-fff` 扩展已证实在当前环境中可用

**影响**：
- `package.json` 添加 `"@ff-labs/fff-node": "^0.9.1"` 依赖
- 移除 `resolveRgPath()`、`runRgSearch()`
- FFF 不可用时回退到 rg（`FileFinder.isAvailable()` 预检）
- scope 机制改为全 vault 搜索 + 后置路径过滤（FFF 预索引下性能可接受）

### D3: 惰性初始化，searchToolExecute 中触发

**决定**：FFF `FileFinder` 和 Python worker 的初始化不在 `session_start` 事件中立即执行，而是在 `searchToolExecute` 首次调用时惰性触发。

**理由**：
- 避免非搜索 session（如配置管理）的无效初始化开销
- `searchToolExecute` 是唯一需要这两个资源的入口点，在那里触发最合理
- 通过 `if (!_finder) _finder = await initializeFinder(vaultPath)` 模式实现

**影响**：
- `search-tool.ts` 顶部新增模块级变量 `_finder` 和 `_tokenizerWorker`
- `resetSessionState()` 扩展为同时清理 FFF 和 worker

### D4: scope 改为全 vault 搜索 + 后置过滤

**决定**：FFF 后端不做多 scope 并行搜索。改为搜索整个 vault 根目录的 FFF 索引，然后在结果上按 `scope` 路径前缀过滤。

**理由**：
- FFF 预索引下全 vault 搜索（6-45ms）性能远超 rg 的多 scope 并行（~1-3s 合计）
- 后置过滤比多索引管理更简单，避免 FFF 的多实例开销
- rg 回退路径仍然保留多 scope 并行模式（scope 逻辑不变）

### D5: 排序模型不变

**决定**：`rankResults()`、`computeMatchPositionBonus()`、`mergeRgResults()`（及 FFF 版本的输出结构适配）、`generateSnippet()` 等排序/输出逻辑保持完全不变。

**理由**：排序模型与搜索后端解耦。FFF 返回的 `GrepMatch` 结构（`{ filePath, lineNum, lineNumber, text, ... }`）与 rg 产出的 `RgMatch` 结构在所需字段上兼容。

### D6: 命名转换

**决定**：对现有搜索流程中的变量/函数做最小重命名，使其反映新的双后端架构。核心排序/输出函数保持不变（避免回归风险），搜索函数从 `runRgSearch()` 改为 `executeSearch()`。

## Risks / Migration

### Risk 1: jieba 环境缺失
**Mitigation**: 捕获 Python worker 启动错误，回退到 `Intl.Segmenter`。在回退时 `console.warn` 记录日志。

### Risk 2: FFF native addon 加载失败
**Mitigation**: `FileFinder.isAvailable()` 预检 + try-catch。失败时 `console.warn` 并回退到 rg。FFF 的架构限制包括 darwin/linux/windows 预编译，仅 arm64/x64。

### Risk 3: FFF 预索引扫描延迟
**Mitigation**: `FileFinder` 初始化在首次搜索时同步进行（含 `await finder.scan()`）。5565 文件的 vault 扫描在上次测试中约 200-500ms，是可接受的首次搜索延迟。FFF 的 `waitForIndexReady(5000)` 可确保索引就绪。

### Risk 4: FFF 索引内存消耗
**Mitigation**: `disableWatch: true` 禁用文件变化监听，减少资源消耗。单个 `FileFinder` 实例在 session 内复用。

### Risk 5: jieba 字典首次加载延迟
**Mitigation**: 首次分词请求 ~240ms（字典加载），后续 ~0.02ms。仅在第一个需要中文分词的查询中支付此成本。这是可接受的 cold-start 延迟。

### Risk 6: 回退路径的正确性
**Mitigation**: rg 回退路径复用现有代码逻辑（`runRgSearch`），已验证正确。Intl.Segmenter 回退路径同样复用现有 `tokenizeQuery` 逻辑。
