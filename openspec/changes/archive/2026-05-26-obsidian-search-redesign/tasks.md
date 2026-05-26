# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认所有 spec requirements 均有对应实现任务（见下方 2.x）
- [x] 1.2 确认 my-wiki vault 根目录可写，rg 可执行

## 2. 核心实现任务

### 2.1 Extension 生命周期修复（spec: obsidian-tools-extension）

- [x] 2.1.1 移除 `index.ts` 中的 `globalThis[_key]` dedup guard，替换为基于 `session_start`/`session_shutdown` 事件的工具注册/清理
  - **验证**: `/reload` 后 `obsidian_search` 和 `obsidian_cli` 工具正常可用

- [x] 2.1.2 更新 preflight 逻辑：首次 `obsidian_search` 调用时探测 CLI search 可用性，若不可用则将会话标记为 `rg-primary`，后续搜索直接走 rg 路径
  - **spec ref**: `obsidian-tools-extension` → MODIFIED "Preflight Logic"
  - **验证**: 在 my-wiki vault 中启动 Pi，首次 search 后日志显示 `mode: rg-primary`，不出现 CLI search 调用

- [x] 2.1.3 注册 `search:init` 命令到 `obsidian_cli` 工具
  - **spec ref**: `obsidian-tools-extension` → MODIFIED "Search Init Command Registration"
  - **验证**: `obsidian_cli command=search:init` 在 vault 根目录生成 `search-config.yaml`

### 2.2 配置文件管理（spec: obsidian-search-config）

- [x] 2.2.1 创建 `search-config.ts` 模块：定义 `SearchConfig` TypeScript 类型（scopes, ranking, tokenization, runtime）
  - **spec ref**: `obsidian-search-config` → "Config Schema — Scopes", "Ranking", "Tokenization", "Runtime"

- [x] 2.2.2 实现 `loadSearchConfig(vaultPath)`：读取 `search-config.yaml`，YAML 解析，schema 校验
  - **spec ref**: `obsidian-search-config` → "Config File Loading"
  - **验证**: 有效 config 返回解析结果；缺失、无效 YAML、缺字段均返回明确错误

- [x] 2.2.3 实现默认 config 生成器：包含所有 scope 默认值、ranking 权重（见 design D2 配置）、tokenization 默认值（cn_min_chars=4, method=intl_segmenter）、runtime 默认值
  - **spec ref**: `obsidian-search-config` → "Search Init Command"
  - **验证**: 生成的 YAML 文件可通过 `loadSearchConfig` 的 schema 校验

- [x] 2.2.4 实现 `search:init` handler：写入默认 config → 返回成功消息路径；文件已存在时警告（`--overwrite` 覆盖）
  - **spec ref**: `obsidian-search-config` → "Search Init Command" scenarios

### 2.3 搜索执行（spec: obsidian-search-tool）

- [x] 2.3.1 实现 `tokenizeQuery(query, config)`：空格分词 + Intl.Segmenter 中文分词（≥ cn_min_chars 阈值），转义 rg 特殊字符
  - **spec ref**: `obsidian-search-tool` → "Query Tokenization" 全部场景
  - **验证**: `"DBG deck building synergy"` → `DBG|deck|building|synergy`; `"卡牌设计"` (cn_min_chars=4) → 分词; `"卡牌"` (cn_min_chars=4) → 不分词

- [x] 2.3.2 实现 `resolveSearchDirs(vaultPath, config, explicitScope?)`：根据 config scopes 或 explicit scope 确定搜索目录列表
  - **spec ref**: `obsidian-search-tool` → "Search Scope Resolution"
  - **验证**: 无 scope 时返回 default=true 的目录列表；有 scope 时返回单个目录

- [x] 2.3.3 实现 `runRgSearch(dir, pattern, timeoutMs)`：spawn rg 子进程 `rg -n <pattern> <dir> --max-count 40`
  - **spec ref**: `obsidian-search-tool` → "Search Execution"
  - **验证**: rg 输出正确解析为 `{file, lineNum, text}[]`；超时时返回部分结果

- [x] 2.3.4 实现 `mergeRgResults(results[])`：多 scope 结果按文件路径去重，保留匹配行最多的条目
  - **spec ref**: `obsidian-search-tool` → "Result Deduplication"

- [x] 2.3.5 实现 `rankResults(entries, config, searchPathMap)`：按 design D4/D5 的复合分数模型排序
  - 对每个结果计算：`directory_weight * filename_bonus * match_position_bonus * content_density_bonus * file_size_penalty`
  - Match position 通过行号和行内容判断（frontmatter 区域 + 字段名、heading、正文）
  - Content density = `1.0 + (matches / total_lines) * (max - 1.0)`
  - **spec ref**: `obsidian-search-tool` → "Ranking Model"
  - **验证**: 文件 `NeonAbyss全景分析.md` 查询 `NeonAbyss` → 获得 filename_exact ×3.0 + directory_weight ×2.0

- [x] 2.3.6 实现 `generateSnippet(filePath, matches, mode, config)`：
  - fast 模式：直接用 rg 匹配行文本作为 snippet
  - deep 模式：读文件获取首段（跳过 frontmatter 后前 200 字）+ 最佳匹配区域 ±2 行上下文
  - **spec ref**: `obsidian-search-tool` → "Snippet Generation"

- [x] 2.3.7 重写 `searchToolExecute`：串联 tokenize → resolveDirs → runRg（并行） → merge → rank → generateSnippets → buildOutput
  - 使用配置中的 `max_results` 和 `rg_timeout_ms`
  - **spec ref**: `obsidian-search-tool` → "Search Execution" → "Tool Parameter Compatibility"

- [x] 2.3.8 更新 `searchToolDefinition` 的 `promptGuidelines`：加入双语言搜索建议、scope 使用指导、0 结果时的 retry 策略
  - **spec ref**: `obsidian-search-tool` → "Tool Description Guidance"

### 2.4 代码清理

- [x] 2.4.1 从 `search-tool.ts` 移除：`parallelRecall`、`ensurePreflight`（CLI search 探测逻辑）、`runFallbackSearch`、`parseRgOutput`、`expandPhase`、`shouldAutoUpgrade`
  - **spec ref**: `obsidian-search-tool` → REMOVED requirements

- [x] 2.4.2 从 `cli-runner.ts` 移除：`parseSearchJson` 中的 CLI search 路径解析（保留 `parseTextPathLines`、`runCli`）

- [x] 2.4.3 保留 `vault-resolver.ts`（vault 检测和解析逻辑不变）

## 3. 收敛与验证准备

- [x] 3.1 在 my-wiki vault 中运行完整搜索流程，确认：
  - `obsidian_cli search:init` 生成 config ✓
  - `obsidian_search query="NeonAbyss"` 返回 `NeonAbyss全景分析.md`（score 7.52 ≥ 6.0）✓
  - `obsidian_search query="DBG 卡牌 synergy"` 返回相关结果（多 scope 共 188 matches）✓
  - `obsidian_search query="协同" scope="20-synthesis/digest/游戏分析"` 仅返回该 scope 内结果 ✓
  - fast 模式返回路径+匹配行，deep 模式返回完整 snippet ✓

- [x] 3.2 确认 `search-tool.ts` 中不再有 `obsidian search` CLI 调用 ✓

- [x] 3.3 确认 `/reload` 后工具正常注册（globalThis guard 已移除，session_shutdown 清理状态）✓

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`（目标、字段映射、前置条件）
- [x] 4.3 执行 `writeback.md` 中定义的回写目标：
  - [x] 更新 `docs/plans/obsidian-search-issue-report.md` 结论章节
  - [x] 创建 `docs/plans/obsidian-search-redesign.md`
  - [x] 在 my-wiki 创建 `docs/design/obsidian-search-tool-design.md`
