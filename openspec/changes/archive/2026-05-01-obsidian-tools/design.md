# Design

## Context

本次 change 在 pi-config 仓库内新建一个 Pi extension (`obsidian-tools`) 和配套 skill (`obsidian-search`)，两者共同替代 `repo://orbitos/.agents/skills/obsidian-cli/`（纯 skill 方案）和社区包 `@haispeed/pi-obsidian`（薄 tool 透传方案）。

设计输入：
- `specs/obsidian-search-tool/spec.md` — `obsidian_search` tool 行为规范
- `specs/obsidian-cli-tool/spec.md` — `obsidian_cli` tool 行为规范
- `specs/obsidian-search-skill/spec.md` — 配套 skill 行为规范
- `specs/obsidian-vault-resolver/spec.md` — vault 解析行为规范
- `docs/reference/pi-obsidian-cli-tool-layer-analysis.md` — 社区包调研与 tool-vs-skill 对比
- `repo://orbitos/30_研究/知识库/Obsidian_CLI.md` — Official CLI 研究文档与 benchmark 结论

## Goals / Non-Goals

**Goals:**
- 单 `obsidian_search` tool call 完成原本 3-6 次 bash/LLM 往返的检索流程
- Tool 内部并行召回 + 确定性排序 + 自动扩展 + 输出截断，无 LLM 参与编排
- 提供 `obsidian_cli` 透传 tool 覆盖 create/append/property:set/tasks 等非检索操作
- Vault 自动探测：显式 → cwd 向上遍历 → 报错三段式
- Session 级 preflight 缓存

**Non-Goals:**
- 不实现 query 自动改写引擎（由 LLM 预处理）
- 不修改 `@haispeed/pi-obsidian`
- 不修改 Obsidian CLI 二进制
- 不支持 Windows（仅 macOS/Linux fallback path 为 macOS 硬编码；Linux 依赖 PATH 中的 `obsidian`）

## Decisions

### D1: Subdirectory file organization

```
.pi/extensions/obsidian-tools/
├── index.ts         # export default, 注册两个 tool + session_start handler
├── cli-runner.ts    # spawn("obsidian") wrapper: timeout, fallback path, abort
├── vault-resolver.ts # vault 三级解析 + known vaults 缓存
├── search-tool.ts   # obsidian_search execute 实现
├── raw-tool.ts      # obsidian_cli execute 实现
└── package.json     # { pi: { extensions: ["./index.ts"] } }
```

**理由**：两个 tool 共享 CLI runner 和 vault resolver，拆分模块避免单文件膨胀。不需要 npm install（无外部依赖）。

### D2: No external npm dependencies

`package.json` 仅声明 `pi.extensions` 入口。所有实现使用 Node.js built-in：
- `node:child_process` (spawn)
- `node:path` (path resolution)
- `node:fs` (check .obsidian/ existence)

### D3: Preflight in session_start

```typescript
pi.on("session_start", async () => {
  // 1. 预加载 known vaults — 正确命令为 vaults (复数) verbose
  const vaultList = await runObsidian(["vaults", "verbose"]);
  knownVaults = parseVaultListTable(vaultList.stdout);

  // 2. 探测 CLI 可用性
  cliAvailable = true;
});
```

Tool execute 中不再重复 preflight。如果 session_start 的 `vaults verbose` 失败，cliAvailable 标记为 false，后续调用走降级。

> ⚠ 勘误：初始实现误用了 `vault list`，该子命令不存在。实际 Obsidian CLI 的 vault 列举命令为 `obsidian vaults`（复数），`vaults verbose` 返回 `name\tpath` 形式。

### D4: Vault resolution algorithm

```
function resolveVault(explicitVault?, cwd):
  // Step 1: explicit parameter wins
  if explicitVault:
    match against knownVaults (by name or path)
    if match → return matched vault name
    else → throw "Vault not found"

  // Step 2: cwd walk-up
  current = resolve(cwd)
  while current != root:
    if exists(current/.obsidian/):
      vaultPath = realpath(current)
      match against knownVaults (by path)
      if match → return matched vault name
    current = parent(current)

  // Step 3: cannot resolve
  throw "vault parameter required: current directory is not inside an Obsidian vault"
```

### D5: CLI runner encapsulation (`cli-runner.ts`)

```typescript
export async function runCli(
  vault: string,
  args: (string | [string, string])[],
  signal?: AbortSignal,
  timeoutMs = 25_000
): Promise<{ stdout: string; stderr: string; code: number | null }>
```

- 构建完整参数数组：`["vault=<vault>", ...args]`
- 先尝试 `obsidian` (PATH)
- ENOENT 时 fallback 到 `/Applications/Obsidian.app/Contents/MacOS/obsidian`
- 超时 + AbortSignal 支持

### D6: Parallel recall in search-tool

```typescript
const results = await Promise.all([
  runCli(vault, ["search", ["query", query], ["limit", "20"]]),
  scope ? runCli(vault, ["search", ["query", query], ["path", scope], ["limit", "20"]]) : null,
].filter(Boolean));
```

去重逻辑：合并两个结果集，按 path 去重，保留更高 CLI relevance score 的条目。

### D7: Scoring algorithm

```typescript
function scoreAndRank(results, scope, limit):
  for r in results:
    s = r.cliRelevance ?? 0.5
    if isChildPath(r.path, scope): s *= 1.3     // scope boost
    if r.path.endsWith(".md"):     s *= 1.1     // .md boost
    if /\.json$/.test(r.path) || r.path.includes("10_日记/"): s *= 0.6  // noise
    if r.path.includes("Reports/"): s *= 0.7     // aggregation
    r.adjustedScore = s

  results.sort((a, b) => b.adjustedScore - a.adjustedScore)
  return results.slice(0, limit)
```

`isChildPath` 实现：归一化 path + scope，检查 path 是否以 `scope/` 开头。

### D8: Upgrade trigger

```typescript
const needExpand = mode === "deep" ||
  (topk.length >= 2 && (topk[0].adjustedScore - topk[1].adjustedScore) < 0.15);
```

### D9: CLI output parsing

Obsidian CLI 的 `format=json` 输出格式因命令而异。经验证的实际格式：

1. **`search`** — `string[]`（纯路径数组）：
   ```json
   ["path/to/file1.md", "path/to/file2.md"]
   ```
   提取 path，title 从文件名推导，snippet 为空，relevance 默认 0.5

2. **`search:context`** — `{file, matches: [{line, text}]}[]`：
   ```json
   [{"file":"path.md","matches":[{"line":45,"text":"..."}]}]
   ```
   提取 file → path，matches[0].text → snippet，relevance 默认 0.5

3. **`backlinks`** — `{file: "path.md"}[]`：
   ```json
   [{"file":"path/to/linked.md"}]
   ```
   提取 file → path，snippet 为空，relevance 默认 0.5

4. **`links`** — **不支持 `format=json`**，返回纯文本（每行一个路径）：
   ```
   path/to/link1.md
   path/to/link2.md
   ```
   逐行解析

> ⚠ 勘误：初始实现假设 `search format=json` 返回 `{title, path, snippet, relevance}[]`，实际返回 `string[]`。`links format=json` 也不生效（返回纯文本）。解析器需统一处理多种格式。

### D10: Fallback to rg

```typescript
function runFallback(query, vaultPath, scope):
  const searchDir = scope ? join(vaultPath, scope) : vaultPath
  const result = spawnSync("rg", ["-n", query, searchDir, "--max-count=20"])
  return parseRgOutput(result.stdout, vaultPath)
```

### D11: Content formatting for LLM

不返回 raw JSON。`content` 字段是 markdown 格式的摘要：

```markdown
## Obsidian Search Results
**Query:** "OrbitOS benchmark" | **Mode:** cli (deep) | **Vault:** obsidian-mind
47 total hits, returning top 3

1. **20_项目/OrbitOS/Benchmark_v2.md** (score: 0.91)
   > ...snippet...
   _title_match + path_scope_

2. **30_研究/知识库/Obsidian_CLI.md** (score: 0.72)
   > ...snippet...
   _keyword match_

3. ...
```

`details` 字段保留结构化数据供下游程序化消费。

### D12b: Zero-result fallback to rg

当 CLI search 返回 0 条结果时（query 在 vault 中无匹配），自动触发 rg fallback：

```typescript
const cliResults = await parallelRecall(vault, effectiveQuery, scope, signal);
if (cliResults.length === 0) {
  return runFallbackSearch(effectiveQuery, vault, scope, limit, startTime, signal);
}
```

理由：CLI search 依赖 Obsidian 内置索引，对跨语言查询（如中文 query 在英文 vault 中）或非索引内容覆盖不足。rg 文件系统搜索可弥补此空白。

### D13: Dedup marker for global deployment

```typescript
export default function (pi: ExtensionAPI) {
  const _key = "__pi_ext_obsidian_tools_loaded";
  if ((globalThis as any)[_key]) return;
  (globalThis as any)[_key] = true;

  pi.on("session_shutdown", () => {
    delete (globalThis as any)[_key];
  });
  // ... rest of extension
}
```

### D14: Skill guidance for zero-result recovery

Based on real-world testing, when `obsidian_search` returns empty results:

1. **Cross-language retry**: The LLM should try English/synonym equivalents before giving up. Many vaults are primarily English; Chinese queries will fail even with rg fallback.
2. **Tag discovery**: If synonyms also fail, the LLM should use `obsidian_cli tags` to discover the vault's tag taxonomy, then retry with tag-relevant keywords.
3. **Example 4** in SKILL.md demonstrates this full recovery workflow.

## Risks / Migration

| Risk | Mitigation |
|------|-----------|
| Obsidian CLI `format=json` 输出格式变更 | 设计 D9 包含 JSON 解析失败降级为文本行解析 |
| `obsidian vaults verbose` 失败 | 设计 D4 回退到 cwd .obsidian/ 存在性检查，不依赖 vault list |
| `search format=json` 只返回路径数组而非对象数组 | 设计 D9 按实际 CLI 输出格式拆解四种解析 |
| `links` 命令不支持 format=json | 设计 D9 对 links 使用逐行文本解析 |
| 跨语言搜索（中文 query 在英文内容中）无命中 | 设计 D12b 当 CLI search 返回 0 结果时自动触发 rg fallback |
| 与 `repo://orbitos/.agents/skills/obsidian-cli/` 冲突 | 全局启用后需在该仓库禁用旧 skill（移除 `.agents/skills/obsidian-cli/` 或在 settings 中排除） |
| Linux 上无 `/Applications/Obsidian.app/...` | 需要 `obsidian` 在 PATH 中；设计 D5 的 ENOENT fallback 仅在 macOS 有效 |
| CWD 不在 vault 内导致频繁报错 | 报错消息明确指引用户传 vault 参数；skill 也会指导 LLM 在有歧义时显式传参 |
