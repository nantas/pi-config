# Verification — obsidian-tools

## 验证范围

本 verification 覆盖 `openspec/changes/obsidian-tools` 下全部 capabilites 的 spec 实现与 task 完成度。

## 已验证交付物

### Capability: obsidian-vault-resolver

| Spec Requirement | 实现位置 | 覆盖情况 |
|----------------|---------|---------|
| Explicit Vault Parameter Takes Priority | `vault-resolver.ts:resolveExplicitVault()` | ✅ 优先匹配 known vaults，失败时按 preload 状态报错或接受 |
| CWD-Based Vault Detection | `vault-resolver.ts:resolveVaultFromCwd()` | ✅ 向上遍历 .obsidian/，realpath 归一化 |
| Error When No Vault Can Be Resolved | `vault-resolver.ts L85` | ✅ 描述性错误消息 |
| Known Vaults Preloading | `vault-resolver.ts:preloadKnownVaults()` | ✅ session_start 时调用，解析 name→path 映射 |
| Vault Path Normalization | `vault-resolver.ts:normalizePath()` | ✅ realpath + resolve |
| CLI Unavailable During Preloading | `vault-resolver.ts` | ✅ 优雅降级，继续 via .obsidian/ 检测 |

### Capability: obsidian-cli-tool

| Spec Requirement | 实现位置 | 覆盖情况 |
|----------------|---------|---------|
| Tool Registration | `raw-tool.ts` — TypeBox schema + promptSnippet + promptGuidelines | ✅ |
| Input Validation | `raw-tool.ts:validateInput()` — regex `/^[a-z0-9:_-]+$/i` | ✅ |
| Dangerous Command Blocking | `raw-tool.ts` — Set of eval/dev:cdp/dev:debug/restart | ✅ |
| Command Execution | `raw-tool.ts` → `cli-runner.ts:runCli()` → spawn | ✅ |
| Vault Resolution | `raw-tool.ts` → `vault-resolver.ts:resolveVault()` | ✅ |
| Timeout and Cancellation | `cli-runner.ts` — SIGTERM + AbortSignal | ✅ |

### Capability: obsidian-search-tool

| Spec Requirement | 实现位置 | 覆盖情况 |
|----------------|---------|---------|
| Tool Registration | `search-tool.ts` — TypeBox schema + promptSnippet + promptGuidelines | ✅ |
| Input Sanitization | `search-tool.ts:sanitizeQuery()` — trim, truncate 200, regex | ✅ |
| Vault Resolution | `search-tool.ts` → `vault-resolver.ts` | ✅ |
| Preflight Caching | `search-tool.ts:ensurePreflight()` — 首次调用检查，session 级复用 | ✅ |
| Parallel Recall | `search-tool.ts:parallelRecall()` — Promise.all | ✅ |
| Dedup by Path | `search-tool.ts:deduplicate()` — 保留高 score | ✅ |
| Deterministic Scoring & Ranking | `search-tool.ts:scoreAndRank()` (D7) | ✅ |
| Automatic Upgrade to Deep Mode | `search-tool.ts:shouldAutoUpgrade()` — gap < 0.15 (D8) | ✅ |
| Context Expansion | `search-tool.ts:expandPhase()` — search:context + backlinks + links | ✅ |
| Fallback Search (rg) | `search-tool.ts:runFallbackSearch()` | ✅ |
| Output Structure | `search-tool.ts:buildOutput()` — content md + details structured | ✅ |
| Timeout and Cancellation | `cli-runner.ts` + `search-tool.ts` — 60s hard limit via AbortSignal | ✅ |

### Capability: obsidian-search-skill

| Spec Requirement | 实现位置 | 覆盖情况 |
|----------------|---------|---------|
| Skill File Registration | `.pi/skills/obsidian-search/SKILL.md` — frontmatter name + description | ✅ |
| Trigger Conditions | SKILL.md — 触发/不触发条件 | ✅ |
| Query Optimization Guidance | SKILL.md — 关键词提取与 scope 推断 | ✅ |
| Mode Selection Guidance | SKILL.md — fast vs deep + auto-upgrade | ✅ |
| Result Consumption Guidance | SKILL.md — 置信度判断与行动表 | ✅ |
| Routing Collaboration | SKILL.md — retrieve/update/summarize/archive 工作流 | ✅ |
| Usage Examples (≥3) | SKILL.md — 定位、追溯、更新三个场景 | ✅ |

## 验证修复项（基于实机测试，2026-05-01）

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| 9.1 | Vault 列表命令错误 | `obsidian vault list` 不存在 → 返回单 vault 元数据（path/files/folders/size） | `["vaults", "verbose"]` + parseVaultListTable 增加 metadata 字段防御性过滤 |
| 9.2 | `parseSearchJson` 全线格式错误 | 假设 CLI `format=json` 返回 `{title,path,snippet,relevance}[]`，实际 search 返回 `string[]` | 重写：支持 `string[]`、`{file,matches}[]`、`{file}[]`、纯文本四种格式 |
| 9.3 | `links format=json` 不生效 | `links` 命令不支持 format=json，返回纯文本 | 去掉 `format=json` 参数，用 `parseTextPathLines` 逐行解析 |
| 9.4 | 搜索 0 结果时不触发 rg fallback | 中文 query 在英文 vault 中 CLI search 返回 0 结果，rg 降级仅针对 CLI 不可用 | dedup 后过滤掉非路径条目（如 "No matches found."），`validResults.length === 0` 时自动触发 rg fallback |
| 9.6 | rg fallback 找不到二进制 | `spawnSync("rg")` 未继承完整用户 PATH，`rg` 在 `~/.pi/agent/bin/rg` | 添加 `resolveRgPath()` 从 4 个候选路径查找 |
| 9.5 | Vault 名被 metadata 字段污染 | `parseVaultListTable` 将 `path/files/folders/size` 作为 vault 名解析 | 添加 `isMetadataField()` 拒绝非 vault 名的 key |

## Task 完成度

| Task Group | 合计 | 已完成 |
|-----------|------|--------|
| 1. Extension 脚手架 | 3 | 3 |
| 2. cli-runner 实现 | 4 | 4 |
| 3. vault-resolver 实现 | 4 | 4 |
| 4. obsidian_search tool 实现 | 12 | 12 |
| 5. obsidian_cli tool 实现 | 5 | 5 |
| 6. Extension 入口连接 | 2 | 2 |
| 7. obsidian-search skill 实现 | 7 | 7 |
| 8. 验证与回写收敛 | 3 | 3 |
| 9. 测试验证修复 | 6 | 6 |
| 10. Skill 跨语言/0结果恢复指导 | 3 | 3 |
| **总计** | **49** | **49/49** |

## 新增文件清单

| 文件 | 状态 |
|------|------|
| `.pi/extensions/obsidian-tools/package.json` | ✅ 已创建 |
| `.pi/extensions/obsidian-tools/index.ts` | ✅ 已创建 |
| `.pi/extensions/obsidian-tools/cli-runner.ts` | ✅ 已创建 |
| `.pi/extensions/obsidian-tools/vault-resolver.ts` | ✅ 已创建 |
| `.pi/extensions/obsidian-tools/search-tool.ts` | ✅ 已创建 |
| `.pi/extensions/obsidian-tools/raw-tool.ts` | ✅ 已创建 |
| `.pi/skills/obsidian-search/SKILL.md` | ✅ 已创建 |

## 验证结论

| 10.3 | SKILL.md 示例 4 | 中文 query → 英文关键词 fallback 完整工作流 | ✅ 已添加 |

**状态**: 全部 49/49 任务完成。所有 P0 级 bug（vault 解析命令错误、search JSON 格式全线不匹配、links format=json 无效）和 P1/P2 级缺陷（0结果降级、vault名保护、rg 路径解析、Skill 跨语言指导缺失）均已修复并通过实机验证。
