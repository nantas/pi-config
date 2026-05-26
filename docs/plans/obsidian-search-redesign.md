# Obsidian Search 工具重新设计

> 本文档基于 `openspec/changes/obsidian-search-redesign` 的最终方案摘要。
> 完整规范见 `specs/obsidian-search-tool/spec.md`（行为规范真源）。

---

## 背景

`obsidian_search` 工具在 my-wiki（5,195 markdown 文件）上表现严重失常：所有查询返回 0 hits 或边缘结果，核心 digest 文件完全不可见。详见 `docs/plans/obsidian-search-issue-report.md`。

根因诊断确认：
1. **上游 bug**: Obsidian CLI `search` 命令在 > ~2,700 文件的仓库中存在 race condition，静默返回空
2. **fallback 缺陷**: 扩展的 rg fallback 存在多关键词未分词、scope 路径解析错误、relevance 硬编码等问题

---

## 设计决策

### D1: 单一 rg 后端

移除 CLI search 代码路径和 two-tier fallback 设计。rg 成为唯一搜索后端。

**理由**: CLI search 上游 bug 无可靠修复时间表。维护两套代码路径增加复杂度却无收益。

### D2: Vault 根目录配置文件

`search-config.yaml` 放置在 vault 根目录，而非 `.obsidian/` 内部。

**理由**: 搜索配置是 Pi 工具专属产物，不是 Obsidian 设置。放在 vault 根目录可见且可编辑。

### D3: Intl.Segmenter 中文分词

使用 Node.js 内置的 `Intl.Segmenter('zh', {granularity: 'word'})` 进行中文分词，jieba 保留为配置扩展点。

**理由**: 零依赖、同步执行、分词精度对搜索场景足够（假分割优于未分割）。

### D4: 懒 frontmatter 检测

通过 rg 输出的行号和行内容判断匹配位置（frontmatter/heading/body），不解析完整 YAML。

**理由**: 只需识别匹配行是否在 frontmatter 区域以及字段名，无需提取字段值。

### D5: 并行 rg per scope

所有 default scope 并行搜索（每个 scope 一个 rg 子进程），全局合并后排序。

**理由**: 并行 rg 在 ~2,000 文件的场景下总耗时 < 2s，串行搜索会增加不必要的延迟。

### D6: 工具描述双语指导

将双语搜索指导嵌入工具的 `promptGuidelines`，替代硬编码同义词映射表。

**理由**: 利用 LLM 固有的翻译能力，更灵活且维护成本低。

---

## 架构变更

### 新增模块

| 文件 | 职责 |
|------|------|
| `search-config.ts` | `SearchConfig` 类型定义、YAML 解析、schema 校验、默认配置生成、`search:init` 处理 |

### 重写模块

| 文件 | 变更 |
|------|------|
| `search-tool.ts` | 完整重写：tokenize → resolveDirs → runRg（并行）→ merge → rank → generateSnippets → buildOutput |
| `index.ts` | 移除 `globalThis` guard，添加 `session_shutdown` 清理 |
| `raw-tool.ts` | 拦截 `search:init` 命令，本地处理而非透传 CLI |

### 清理模块

| 文件 | 移除内容 |
|------|---------|
| `cli-runner.ts` | `parseSearchJson`, `parseSearchContextJson`（CLI search 结果解析器不再需要）|
| `search-tool.ts` | `parallelRecall`, `ensurePreflight`（旧 CLI 探测）, `runFallbackSearch`, `parseRgOutput`, `expandPhase`, `shouldAutoUpgrade` |

---

## 配置文件 Schema

```yaml
search:
  scopes:
    - path: 10-wiki
      weight: 3.0
      default: true
    - path: 20-synthesis
      weight: 2.0
      default: true
    # ... 更多 scope

  ranking:
    filename_exact: 3.0
    filename_partial: 1.5
    match_position:
      frontmatter_title: 2.5
      frontmatter_tags: 2.0
      frontmatter_other: 1.5
      heading: 1.8
      body: 1.0
    content_density_max: 2.0
    file_size:
      min_kb: 1
      max_kb: 500

  tokenization:
    cn_min_chars: 4
    method: intl_segmenter

  runtime:
    max_results: 20
    rg_timeout_ms: 15000
    snippet_context_lines: 2
    snippet_preview_chars: 200
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `scopes` | 搜索范围列表。`default: true` 的 scope 在无显式 `scope` 参数时搜索。`weight` 影响排名分数。 |
| `ranking.filename_exact` | 查询词与文件名（不含扩展名）完全匹配时的乘数 |
| `ranking.filename_partial` | 查询词是文件名子串时的乘数 |
| `ranking.match_position.*` | 匹配位置奖励：frontmatter title 最高，heading 次之，body 基准 1.0 |
| `ranking.content_density_max` | 内容密度奖励上限。计算方式：`1.0 + (match_lines / total_lines) * (max - 1.0)` |
| `ranking.file_size` | 文件大小惩罚阈值。超出范围则分数 ×0.5 |
| `tokenization.cn_min_chars` | 触发中文分词的最小字符数 |
| `tokenization.method` | 分词方法：`intl_segmenter`（默认）或 `jieba`（预留）|
| `runtime.*` | 运行时参数：最大结果数、rg 超时、snippet 上下文行数、预览字符数 |

---

## 搜索流程

```
query → sanitize → tokenize (space + Intl.Segmenter) → escape regex
  → resolve dirs (default scopes or explicit scope)
  → spawn rg per scope in parallel (rg -n <pattern> <dir> --max-count 40)
  → parse rg output (path:line:text)
  → merge by file path (keep scope with most matches)
  → rank (directory_weight × filename_bonus × match_position × density × size_penalty)
  → generate snippets (fast: raw lines / deep: preview + context)
  → build output
```

### 排名模型

对每个文件计算复合分数：

```
score = directory_weight
      × filename_bonus      (exact: 3.0, partial: 1.5, none: 1.0)
      × match_position_bonus (frontmatter_title: 2.5, tags: 2.0, other: 1.5, heading: 1.8, body: 1.0)
      × content_density_bonus (1.0 ~ content_density_max)
      × file_size_penalty    (1.0 or 0.5)
```

---

## 验证结果

| 测试场景 | 结果 |
|---------|------|
| `obsidian_cli search:init` | ✅ 在 vault 根目录生成 `search-config.yaml` |
| `obsidian_search query="NeonAbyss"` | ✅ 返回 `NeonAbyss全景分析.md`，score 7.52 |
| `obsidian_search query="DBG 卡牌 synergy"` | ✅ 多 scope 命中（188 matches across 5 scopes）|
| `obsidian_search query="协同" scope="20-synthesis/digest/游戏分析"` | ✅ 仅返回该 scope 内结果 |
| fast / deep 模式 | ✅ fast 返回匹配行，deep 返回预览 + 上下文 |
| `/reload` 后工具注册 | ✅ 正常（globalThis guard 已移除）|

---

## 迁移影响

- **对现有用户**: 首次搜索前需运行 `obsidian_cli search:init` 生成配置文件。工具返回清晰错误提示引导用户执行。
- **对其他 CLI 命令**: `backlinks`, `links`, `properties` 等不受影响。
- **对 vault 结构**: vault 根目录新增 `search-config.yaml`，对 Obsidian 本身无影响。
