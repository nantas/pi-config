# Obsidian Search 工具问题报告

> 报告生成时间：2026-05-26  
> 触发场景：在 `my-wiki` 仓库执行 DBG 肉鸽卡牌 synergy 设计的信息检索任务  
> 仓库特征：中文内容为主，中英混合术语密集，结构化目录（`20-synthesis/digest/游戏分析/<game>/`）

---

## 1. 搜索过程原始记录

### 第一轮并行查询（3 个 deep 模式查询）

| 查询关键词 | 模式 | 返回 hits | 预期命中文件 | 实际命中文件 | 结果 |
|-----------|------|----------|-------------|-------------|------|
| `DBG deck building roguelike synergy` | deep | **0** | `vampire-crawlers/系统全景分析.md`, `NeonAbyss全景分析.md` | 无 | ❌ 未命中 |
| `Neon Abyss vampire crawlers 卡牌` | deep | 2 | `neonabyss/NeonAbyss全景分析.md`, `vampire-crawlers/系统全景分析.md` | `directive/game-creation-philosophy.md` ×2 | ⚠️ 边缘命中 |
| `卡牌 synergy 设计 游戏设计模式` | deep | **0** | `game-design-pattern/*.md` | 无 | ❌ 未命中 |

### 第二轮并行查询（4 个 deep 模式查询）

| 查询关键词 | 模式 | 返回 hits | 预期命中文件 | 实际命中文件 | 结果 |
|-----------|------|----------|-------------|-------------|------|
| `game-design-pattern 卡牌 deck card` | deep | **0** | `game-design-pattern/index.md` | 无 | ❌ 未命中 |
| `Neon Abyss 游戏分析` | deep | 6 | `neonabyss/NeonAbyss全景分析.md` | `digest/index.md`, `naming-conventions.md`, `my-wiki-capabilities.md` 等边缘文件 | ❌ 未命中核心文件 |
| `vampire survivors 游戏分析` | deep | 2 | `vampire-crawlers/系统全景分析.md` | `复用已有类型认知的底层玩法逻辑.md`, `my-wiki-capabilities.md` | ❌ 未命中核心文件 |
| `roguelike 设计 模式` | deep | 8 | Isaac 分析、pattern-language | Isaac 分析、pattern-language、讲座等 | ✅ 部分命中 |

### 第三轮：切换到 `find` 工具枚举文件

由于 obsidian_search 连续未命中核心文件，切换至 `find` 工具才定位到：
- `20-synthesis/digest/游戏分析/neonabyss/NeonAbyss全景分析.md`
- `20-synthesis/digest/游戏分析/vampire-crawlers/系统全景分析.md`
- `20-synthesis/digest/游戏分析/vampire-crawlers/攻击卡弹道模式与数值设计.md`

**工具 fallback 说明**：当搜索工具无法命中高价值文件时，开发者会本能转向更"暴力"的文件枚举，这不是理想工作流。

---

## 2. 问题分类与根因分析

### 问题 1：中英文混合关键词的语义鸿沟（严重）

**现象**：包含英文术语的查询（`DBG`, `synergy`, `deck building`）在中文为主的仓库中返回 0 hits。

**根因**：
- 仓库内对应概念使用中文表达：`synergy` → `协同/联动/连携`，`deck building` → `牌组构筑/DBG`，`card` → `卡牌`
- Obsidian search 的语义索引似乎未建立中英文术语的跨语言映射
- deep 模式的向量/语义匹配对跨语言查询的桥接能力有限

**影响**：用户用英文提问（或中英混合提问）时，搜索工具无法定位到仓库内中文内容中对应的概念。

---

### 问题 2：核心 digest 文件在搜索排序中不可见（严重）

**现象**：`Neon Abyss 游戏分析` 返回 6 个 hits，但排名第一的是 `digest/index.md`，真正的目标文件 `NeonAbyss全景分析.md` 完全未出现。所有返回结果的 score 均为 **0.55**，排序区分度为零。

**根因推测**：
- 文件名/路径中的关键词（`NeonAbyss`, `全景分析`）权重可能过低
- 内容匹配可能受 frontmatter 结构或 Markdown 格式干扰
- 搜索索引可能未覆盖 `20-synthesis/digest/游戏分析/` 子目录下的深层文件

**关键对比**：`find` 工具在 `20-synthesis/digest/游戏分析/` 目录下立即枚举到了 `neonabyss/` 和 `vampire-crawlers/` 两个子目录，说明文件物理存在且路径清晰。

---

### 问题 3：搜索结果缺乏内容上下文摘要

**现象**：obsidian_search 返回的只有文件路径 + 截断的内容片段 + score。无法判断"这个文件内部是否包含我需要的具体信息"。

**对比**：`grep` 工具返回的是匹配行 + 前后上下文（`-C`），可以快速判断相关性。obsidian_search 返回的片段往往只是 frontmatter 或无关段落。

---

### 问题 4：搜索模式选择缺乏指导

**现象**：我全部使用了 `deep` 模式，但实际上：
- `deep` 模式（~5-8s）在多次 0 hits 时显得浪费
- `fast` 模式（~3s）对于"已知文件存在但不确定路径"的场景可能更直接
- 两种模式的具体差异（除了速度）在实际使用中不明显

---

### 问题 5：特定子目录的搜索隔离失效

**现象**：即使使用 `scope` 参数（如 `scope: 20-synthesis/digest/游戏分析`），搜索仍未命中该目录下的核心文件。说明问题不是全库噪声过大，而是该子目录的索引覆盖本身存在问题。

---

## 3. 优化建议

### 短期可实施

| 优先级 | 优化项 | 说明 |
|--------|--------|------|
| P0 | **提升文件名/路径匹配权重** | `NeonAbyss全景分析.md` 的文件名直接包含查询词，应获得更高排序权重 |
| P0 | **修复 digest 深层目录的索引覆盖** | 确认 `20-synthesis/digest/游戏分析/` 子目录是否被完整索引 |
| P1 | **增加搜索结果上下文片段** | 返回匹配关键词所在的具体段落（3-5 行），类似 grep 的 `-C 3` |
| P1 | **改善 score 区分度** | 当前所有结果 score 均为 0.55，没有排序意义 |

### 中期需规划

| 优先级 | 优化项 | 说明 |
|--------|--------|------|
| P2 | **建立中英游戏设计术语映射表** | `synergy↔协同/联动`, `deck building↔牌组构筑`, `roguelike↔肉鸽`, `pattern↔模式/模式` |
| P2 | **0 hits 时返回"您是否想找"建议** | 如搜索 `synergy` 时建议中文对应词 `协同` |
| P2 | **明确 fast/deep 模式的使用场景指导** | 在工具描述或 AGENTS.md 中补充：fast 用于文件定位，deep 用于概念关联 |

### 长期架构

| 优先级 | 优化项 | 说明 |
|--------|--------|------|
| P3 | **目录结构感知的分层搜索** | 对于 `游戏分析/<game>/` 这类结构化目录，优先在子目录内搜索 |
| P3 | **基于 frontmatter 的类型过滤** | 支持 `type:synthesis` 或 `tags:domain/game-design` 的过滤搜索 |

---

## 4. 本次检索的效率损失量化

| 维度 | 实际发生 | 理想情况 | 损失 |
|------|---------|---------|------|
| 工具调用次数 | 10+ 次（3 轮 search + 3 轮 find + 4 轮 read） | 3-4 次（1 轮 search 命中核心文件 + read） | **~3x 冗余** |
| 搜索延迟 | ~15-20s（3 轮 deep 模式，每轮 5-8s） | ~3-5s（1 轮 fast 命中） | **~4x 延迟** |
| 文件读取延迟 | 额外读取 5+ 个边缘文件确认相关性 | 直接读取目标文件 | 信息噪声高 |

---

## 5. 附录：关键未命中文件清单

以下文件在本次搜索任务中**本应被命中但最终未命中**，请重点检查这些文件的索引状态：

| 文件路径 | 文件大小 | 内容特征 | 未命中查询 |
|---------|---------|---------|-----------|
| `20-synthesis/digest/游戏分析/neonabyss/NeonAbyss全景分析.md` | ~30KB | 含 "synergy/协同/道具套装/武器锚定" 等关键词 | `Neon Abyss`, `roguelike`, `DBG`, `卡牌` |
| `20-synthesis/digest/游戏分析/vampire-crawlers/系统全景分析.md` | ~25KB | 含 "DBG/deckbuilder/进化/Combo/颜色轮转" 等关键词 | `vampire crawlers`, `DBG`, `卡牌`, `synergy` |
| `20-synthesis/digest/游戏分析/vampire-crawlers/攻击卡弹道模式与数值设计.md` | ~15KB | 含 "攻击卡/弹道/进化/Amount/Damage" 等关键词 | `DBG`, `卡牌设计` |
| `20-synthesis/game-design-pattern/index.md` | ~1KB | 索引页，含 "游戏设计模式" | `游戏设计模式` |

---

## 6. 结论

本次检索的核心问题不是**排序不佳**，而是**找不到**——最相关的文件（两份 digest 主文档 + 攻击卡子文档）在前两轮搜索中完全未出现。这指向的是：

1. **索引覆盖范围不足**：`20-synthesis/digest/游戏分析/` 深层目录可能未被完整索引
2. **跨语言查询解析失败**：英文术语无法映射到仓库内的中文表达
3. **文件名/路径权重过低**：文件名直接包含查询词的文件未获得优先排序

修复上述问题后，预计可将同类检索任务的工具调用次数从 10+ 次缩减至 3-4 次，响应速度提升 3-4 倍。

---

## 7. 补充：代码审查与 CLI 诊断报告（Session 调研追加）

> 调研时间：2026-05-26（本 session）
> 调研范围：`.pi/extensions/obsidian-tools/` 源码 + my-wiki 实际 CLI 测试

### 7.1 关键发现：Obsidian CLI `search` 命令完全失效

**这是本次调研最核心的发现，直接解释了问题报告中所有 "0 hits" 的根本原因。**

#### 7.1.1 测试环境

| 项目 | 状态 |
|------|------|
| Obsidian 版本 | 1.12.7 (CFBundleShortVersionString) |
| CLI 已启用 | ✅ (`obsidian.json` 中 `"cli": true`) |
| my-wiki 已打开 | ✅ (`obsidian.json` 中 `"open": true`) |
| my-wiki 规模 | **5,195** markdown 文件 / **10,796** 总文件 |
| Obsidian 应用运行中 | ✅ (PID 41257) |

#### 7.1.2 CLI search 全面失效证据

无论查询什么内容，`obsidian search` 均返回**完全空输出**（stdout 为空，stderr 为空，exit code = 0）：

```bash
# 所有以下命令均返回空
obsidian vault=my-wiki search query="游戏" format=json      # → (空)
obsidian vault=my-wiki search query="NeonAbyss" format=json # → (空)
obsidian vault=my-wiki search query="分析" format=json      # → (空)
obsidian vault=my-wiki search query="index" format=json     # → (空)
obsidian vault=my-wiki search query="攻击卡弹道模式与数值设计" format=json  # → (空)
obsidian vault=my-wiki search:context query="NeonAbyss" limit=3 format=json # → (空)
obsidian vault=my-wiki search query="NeonAbyss" total format=json           # → (空)
```

**交叉验证**：在另一个 vault (`obsidian-mind`, 1,214 md 文件) 上执行同样的命令，**同样返回空**。

**但以下命令正常工作**：
- `obsidian vaults verbose` → 返回 vault 列表
- `obsidian vault=my-wiki backlinks path="..." format=json` → 返回 backlinks
- `obsidian vault=my-wiki links path="..."` → 返回 outgoing links
- `obsidian vault=my-wiki search:open query="NeonAbyss"` → 返回 "Opened search: NeonAbyss"

#### 7.1.3 根因：Obsidian 1.12.x 已知 Bug（大仓库 race condition）

通过搜索 Obsidian 官方论坛，确认这是 **Obsidian 1.12.x 的已知 bug**。

**论坛帖子**：[Search CLI returns nothing with large vault - not even 'no results'](https://forum.obsidian.md/t/search-cli-returns-nothing-with-large-vault-not-even-no-results/112519)

> 该帖子精确描述了我们遇到的情况：
> - 仓库含 ~2,700+ 文件时，CLI `search` 返回空输出，exit code 0
> - 小仓库（1-20 文件）正常工作
> - GUI 搜索正常工作
> - `search total` 也返回空（不是 "0"）
> - 通过 JavaScript API (`eval`) 可确认搜索引擎本身正常，只是 CLI 命令有 race condition

**官方回复**（Obsidian 团队 WhiteNoise）：
> "We have made some changes to the way the CLI works and I am unable to reproduce. When Obsidian 1.12.7 is released, download and reinstall Obsidian."

**但我们的环境已经是 1.12.7，问题仍然存在。** 这表明：
1. 官方声称的修复可能未覆盖所有场景
2. my-wiki (5,195 md 文件) 的规模远超帖子中测试的 ~2,700 文件，可能触发更严重的 race condition
3. 这是一个上游 Obsidian bug，扩展层无法直接修复

**Reddit 帖子**：[Obsidian CLI 1.12 has 13 silent failures](https://www.reddit.com/r/ObsidianMD/comments/1r3ljxz/obsidian_cli_112_has_13_silent_failures_i_made_an/)
> "the CLI silently returns empty/wrong data in a bunch of common scenarios — and the commands all exit with code 0"

### 7.2 Fallback rg 机制的代码级缺陷

由于 CLI `search` 完全失效，扩展的 fallback 机制（`runFallbackSearch` → `rg`）成为唯一可用的搜索路径。但代码审查发现 fallback 实现存在多个严重缺陷：

#### 7.2.1 根因 B：rg 多关键词查询未分词（严重）

**位置**：`.pi/extensions/obsidian-tools/search-tool.ts:512-516`

```typescript
const result = spawnSync(
  rgPath,
  ["-n", query, searchDir, "--max-count", "20"],
  { timeout: 15_000, signal },
);
```

`query` 直接作为 rg 的 pattern 参数，进行**完整字符串字面匹配**。

当用户查询 `"DBG deck building roguelike synergy"` 时，rg 搜索的是包含这整个字符串的行——这在任何文件中都不可能存在。因此 fallback 也返回 0 hits。

**验证**：
```bash
rg -n "Neon Abyss 游戏分析" --max-count 20 .  # → (空) — 完整字符串搜索失败
rg -n "Neon Abyss" --max-count 20 .             # → 大量命中 — 单关键词成功
```

**结论**：这是问题报告中 **"所有英文/混合查询都返回 0 hits"** 在 fallback 路径上的直接代码原因。

#### 7.2.2 根因 C：Fallback rg 的 scope 路径解析错误（严重）

**位置**：`.pi/extensions/obsidian-tools/search-tool.ts:501` + `parseRgOutput`

当 `scope` 参数存在时：
```typescript
const searchDir = scope ? resolve(vaultPath, scope) : vaultPath;
// searchDir = "/Users/.../my-wiki/20-synthesis/digest/游戏分析" (绝对路径)
```

rg 从绝对路径子目录搜索时，输出路径是**相对于该子目录**的：
```
neonabyss/NeonAbyss全景分析.md:21:...
```

而 `parseRgOutput` 中的解析逻辑：
```typescript
const fullPath = resolve(match[1].trim());  // resolve("neonabyss/NeonAbyss全景分析.md")
// → /Users/.../my-wiki/neonabyss/NeonAbyss全景分析.md (丢失前缀!)
```

**结果**：`relative(vaultPath, fullPath)` 得到 `neonabyss/NeonAbyss全景分析.md`，丢失了 `20-synthesis/digest/游戏分析/` 前缀。导致：
1. `isChildPath(entry.path, scope)` 返回 `false`（路径前缀不匹配）
2. scope boost（×1.3）无法应用
3. 后续 `read` 工具无法正确找到文件

#### 7.2.3 根因 D：Relevance 全部硬编码，无区分度

**位置**：`.pi/extensions/obsidian-tools/cli-runner.ts:133-137`

```typescript
return parsed.map((path: string) => ({
  title: pathToTitle(path),
  path,
  snippet: "",
  relevance: 0.5,  // ← 硬编码！
}));
```

CLI 结果全部 `relevance: 0.5`，fallback rg 结果全部 `relevance: 0.3`。

`scoreAndRank` 仅做简单 boost：
- `.md` 文件 ×1.1 → **0.55**（问题报告中观察到的全部 0.55 的来源）
- scope match ×1.3
- 日记/JSON 文件 ×0.6

**缺失**：没有基于查询词与**文件名**、**路径**、**内容**的匹配度进行动态打分。例如 `NeonAbyss全景分析.md` 的文件名直接包含 `NeonAbyss`，应该获得显著更高的 relevance。

#### 7.2.4 根因 E：Snippet 内容质量差

**CLI search 结果**：`snippet: ""`（空字符串）

**Fallback rg 结果**：仅包含匹配行本身，无前后上下文：
```typescript
snippet: match[3].trim().slice(0, 200),
```

问题报告期望的是 `grep -C 3` 式的上下文片段，能快速判断相关性。

### 7.3 其他代码级问题

#### 7.3.1 根因 F：全局 `globalThis` dedup 标记违反 Pi 规范

**位置**：`.pi/extensions/obsidian-tools/index.ts:14-16`

```typescript
if ((globalThis as any)[_key]) return;
(globalThis as any)[_key] = true;
```

`pi-extension-dev` skill 明确禁止：
> **Do NOT add `globalThis` dedup guards** — they can silently disable extensions when the factory is re-invoked without a prior `session_shutdown` (e.g., reload, settings change).

这会导致 `/reload` 后扩展**静默失效**。

#### 7.3.2 根因 G：Query 正则过于严格

**位置**：`.pi/extensions/obsidian-tools/search-tool.ts:193`

```typescript
const QUERY_REGEX = /^[\p{L}\p{N}\s:_\-.]+$/u;
```

排除了 `+`, `/`, `*`, `?`, `()`, `[]` 等字符。用户无法使用 rg 的正则语法进行高级搜索，也排除了中英文混合的标点（如 `"卡牌" + "设计"` 中的 `+`）。

### 7.4 问题报告各条目的根因映射（修正版）

| 问题报告条目 | 原始推测根因 | **修正后根因** | 说明 |
|-------------|------------|-------------|------|
| 所有查询 0 hits | 索引覆盖不足 / 跨语言解析失败 | **A（上游 bug）** | Obsidian CLI search 在大仓库上完全失效，不是索引问题 |
| 中英文混合查询 0 hits | 跨语言语义鸿沟 | **A + B** | 上游 bug 导致 CLI 失效 + fallback rg 未分词 |
| 核心 digest 文件不可见 | 文件名权重过低 / 索引覆盖不足 | **A + C** | 上游 bug 导致 CLI 失效 + scope 路径解析错误 |
| 所有 score = 0.55 | relevance 硬编码 | **D** | CLI 硬编码 0.5 + md_boost 1.1 = 0.55 |
| 缺乏内容上下文 | snippet 截断 | **E** | CLI snippet 为空，rg snippet 只有单行 |
| fast/deep 差异不明显 | 模式定义模糊 | **D** | 分数无区分度，auto-upgrade 判断（gap < 0.15）几乎总是触发 |
| scope 隔离失效 | 索引覆盖问题 | **C** | 路径解析错误导致 scope 匹配失败 |

### 7.5 根因优先级重排

| 优先级 | 根因 | 问题 | 修复可控性 |
|--------|------|------|-----------|
| **P0** | **根因 A** | Obsidian CLI search 在大仓库上完全失效 | ❌ 上游 bug，扩展层无法修复 |
| **P0** | **根因 B** | Fallback rg 多关键词未分词 | ✅ 扩展层可修复 |
| **P0** | **根因 C** | Fallback rg scope 路径解析错误 | ✅ 扩展层可修复 |
| **P1** | **根因 D** | Relevance 硬编码无区分度 | ✅ 扩展层可修复 |
| **P1** | **根因 E** | Snippet 无上下文 | ✅ 扩展层可修复 |
| **P1** | **根因 F** | globalThis dedup 违反规范 | ✅ 扩展层可修复 |
| **P2** | **根因 G** | Query 正则过于严格 | ✅ 扩展层可修复 |

### 7.6 修复策略建议

#### 针对根因 A（上游 bug）

由于这是 Obsidian 1.12.x 的已知 bug，扩展层无法直接修复，只能**加强 fallback 机制**：

1. **在 preflight 阶段检测 CLI search 是否可用**：尝试一次已知有结果的搜索（如搜索仓库中必然存在的词），如果返回空，则标记 CLI search 为不可用，全程使用 fallback
2. **fallback 路径不应被视为"降级"，而应成为主要搜索路径**，直到上游修复
3. **跟踪上游修复进度**：Obsidian 1.12.7 声称修复了该问题，但实际未完全解决。需要关注后续版本

#### 针对根因 B（rg 未分词）

将多关键词查询拆分为 OR 模式：
```typescript
// 将 "DBG deck building synergy" → "DBG|deck|building|synergy"
const rgPattern = query.split(/\s+/).filter(Boolean).join("|");
// 或使用 rg 的 --regexp 多模式
```

#### 针对根因 C（scope 路径解析）

修复 `parseRgOutput`，在 scope 模式下使用 `searchDir` 而非 `vaultPath` 作为 relative 的基准：
```typescript
const relPath = relative(searchDir, fullPath);
// 然后手动拼接 scope 前缀
const finalPath = scope ? join(scope, relPath) : relPath;
```

#### 针对根因 D（relevance 硬编码）

实现基于查询词匹配的动态 relevance 计算：
- 文件名完全匹配 → relevance ×2.0
- 文件名部分匹配 → relevance ×1.5
- 路径匹配 → relevance ×1.3
- 内容匹配 → relevance ×1.0（基准）

#### 针对根因 E（snippet 上下文）

rg 添加 `-C 2` 参数获取前后 2 行上下文，解析后合并为 snippet。

### 7.7 结论修正

原始问题报告的结论将根因指向"索引覆盖不足"和"跨语言解析失败"，但本次 session 的代码审查和 CLI 诊断揭示：

> **真正的根因是 Obsidian CLI `search` 命令在大仓库上存在已知 bug（race condition），导致其完全失效。** 扩展的所有 0 hits 结果本质上都来自这个上游 bug，而非索引或语义问题。
>
> 在此基础上，扩展的 fallback `rg` 机制又存在**未分词**和**路径解析错误**等实现缺陷，使得 fallback 也无法有效补偿 CLI 的失效。
>
> **修复路径**：
> 1. 短期：修复 fallback rg 的分词、路径解析、relevance 计算和 snippet 质量（P0-P1，扩展层可控）
> 2. 中期：在上游 bug 修复前，将 fallback 提升为主要搜索路径，并优化其性能
> 3. 长期：跟踪 Obsidian 上游修复，CLI search 恢复后回归主要路径

---

## 8. 修复结论（变更完成）

> **变更**: `openspec/changes/obsidian-search-redesign`
> **完成时间**: 2026-05-26
> **状态**: ✅ 全部实现任务已完成，验证通过

### 8.1 根因确认

本次变更确认了问题报告中的根因分析：

1. **根因 A（上游 bug）已确认**: Obsidian CLI `search` 命令在大于 ~2,700 文件的仓库中存在 race condition，静默返回空（exit code 0）。my-wiki 的 5,195 个 markdown 文件完全触发此 bug。
2. **根因 B/C/D/E（fallback 缺陷）已修复**: 扩展的 fallback rg 机制存在多关键词未分词、scope 路径解析错误、relevance 硬编码、snippet 无上下文等问题，已全部修复。
3. **根因 F（globalThis）已修复**: `globalThis[_key]` dedup guard 已移除，替换为基于 `session_start`/`session_shutdown` 的生命周期管理。

### 8.2 修复方案摘要

本次变更对 `obsidian_search` 工具进行了**完整重新设计**：

- **以 rg 为唯一后端**：移除 CLI search 代码路径和 two-tier fallback 设计，所有搜索直接通过 rg 执行
- **Vault 级配置文件**：引入 `search-config.yaml`，支持可配置的搜索范围、排名权重、分词参数和运行时设置
- **`search:init` 命令**: 通过 `obsidian_cli search:init` 自动生成默认配置文件
- **多关键词分词**: 英文按空格分词，中文使用 `Intl.Segmenter` 分词（可配置阈值），生成 rg OR 模式
- **匹配位置感知排名**: frontmatter 字段（title/tags/other）、heading、正文分别赋予不同权重
- **复合评分模型**: `directory_weight × filename_bonus × match_position_bonus × content_density_bonus × file_size_penalty`
- **Rich snippet**: fast 模式返回匹配行，deep 模式返回首段预览 + 最佳匹配上下文
- **双语搜索指导**: 工具描述中指导 agent 使用中英文关键词和 scope  narrowing

### 8.3 验证结果

| 测试项 | 结果 |
|-------|------|
| `obsidian_cli search:init` 生成 config | ✅ 通过 |
| `obsidian_search query="NeonAbyss"` 返回目标文件 | ✅ score 7.52 ≥ 6.0 |
| `obsidian_search query="DBG 卡牌 synergy"` 多 scope 命中 | ✅ 188 matches across 5 scopes |
| `obsidian_search query="协同" scope="20-synthesis/digest/游戏分析"` 隔离 | ✅ 仅返回该 scope 内结果 |
| fast / deep snippet 差异 | ✅ 符合设计 |
| `/reload` 后工具正常注册 | ✅ globalThis 已移除 |

### 8.4 参考文档

- 完整设计文档: `openspec/changes/obsidian-search-redesign/design.md`
- 行为规范真源: `openspec/changes/obsidian-search-redesign/specs/obsidian-search-tool/spec.md`
- 实现代码: `.pi/extensions/obsidian-tools/search-tool.ts` (重写), `search-config.ts` (新增)

