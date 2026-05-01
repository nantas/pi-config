# Tasks

## 1. Extension 脚手架

- [x] 1.1 创建 `.pi/extensions/obsidian-tools/package.json`，声明 `pi.extensions: ["./index.ts"]`
- [x] 1.2 创建 `.pi/extensions/obsidian-tools/index.ts`，含 globalThis dedup marker + session_shutdown cleanup（参考设计 D12）
- [x] 1.3 在 index.ts 注册 `session_start` handler：预加载 known vaults、标记 cliAvailable（参考设计 D3，覆盖 spec vault-resolver "Known Vaults Preloading"）

## 2. cli-runner 实现

- [x] 2.1 创建 `.pi/extensions/obsidian-tools/cli-runner.ts`，实现 `runCli(vault, args, signal?, timeoutMs?)`（参考设计 D5）
- [x] 2.2 实现 ENOENT → `/Applications/Obsidian.app/Contents/MacOS/obsidian` fallback（覆盖 spec obsidian-cli-tool "Command Execution"）
- [x] 2.3 实现超时 SIGTERM + AbortSignal 支持（覆盖 spec obsidian-search-tool "Timeout and Cancellation"）
- [x] 2.4 实现 JSON stdout 解析辅助函数（覆盖设计 D9）

## 3. vault-resolver 实现

- [x] 3.1 创建 `.pi/extensions/obsidian-tools/vault-resolver.ts`，实现 `resolveVault(explicitVault?, cwd)` 三级解析（参考设计 D4）
- [x] 3.2 实现 `preloadKnownVaults()` —— 调用 `obsidian vault list` 并解析 name→path 映射（覆盖 spec vault-resolver "Known Vaults Preloading"）
- [x] 3.3 实现 cwd 向上遍历 `.obsidian/` 检测 + realpath 归一化（覆盖 spec vault-resolver "CWD-Based Vault Detection" 和 "Vault Path Normalization"）
- [x] 3.4 实现 vault 不存在/未解析时的错误消息（覆盖 spec vault-resolver "Error When No Vault Can Be Resolved"）

## 4. obsidian_search tool 实现

- [x] 4.1 创建 `.pi/extensions/obsidian-tools/search-tool.ts`，定义 TypeBox 参数 schema + promptSnippet + promptGuidelines（覆盖 spec obsidian-search-tool "Tool Registration"）
- [x] 4.2 实现 query sanitization（trim + truncate 200 chars + regex 验证，覆盖 spec "Input Sanitization"）
- [x] 4.3 实现 vault resolution 调用（覆盖 spec "Vault Resolution"）
- [x] 4.4 实现 preflight 检查（首次调用 check → cache cliAvailable；覆盖 spec "Preflight Caching"）
- [x] 4.5 实现 parallel recall：Promise.all([search, scope? search with path])（覆盖 spec "Parallel Recall"，参考设计 D6）
- [x] 4.6 实现结果去重（按 path，保留高 score）
- [x] 4.7 实现 scoring & ranking（base → scope boost → .md boost → noise penalty → aggregation penalty；覆盖 spec "Deterministic Scoring and Ranking"，参考设计 D7）
- [x] 4.8 实现 auto-upgrade 判定（mode="deep" || top1-top2 gap < 0.15；覆盖 spec "Automatic Upgrade to Deep Mode"，参考设计 D8）
- [x] 4.9 实现 expand phase：并行 search:context + backlinks + links（覆盖 spec "Context Expansion"）
- [x] 4.10 实现 fallback search：rg（覆盖 spec "Fallback Search"，参考设计 D10）
- [x] 4.11 实现 output 构建：content markdown summary + details structured（覆盖 spec "Output Structure"，参考设计 D11）
- [x] 4.12 实现 timeout 硬限制（60s 总超时）和 AbortSignal 取消（覆盖 spec "Timeout and Cancellation"）

## 5. obsidian_cli tool 实现

- [x] 5.1 创建 `.pi/extensions/obsidian-tools/raw-tool.ts`，定义 TypeBox 参数 schema（覆盖 spec obsidian-cli-tool "Tool Registration"）
- [x] 5.2 实现 input validation（command/flags 正则 /^[a-z0-9:_-]+$/i；覆盖 spec "Input Validation"）
- [x] 5.3 实现 dangerous command 门禁（eval/dev:cdp/dev:debug/restart 需要 allowDangerous=true；覆盖 spec "Dangerous Command Blocking"）
- [x] 5.4 实现 command 构建 → runCli → output wrap（覆盖 spec "Command Execution"）
- [x] 5.5 实现 vault resolution 调用

## 6. Extension 入口连接

- [x] 6.1 在 index.ts 调用 `pi.registerTool` 注册 `obsidian_search`（引用 search-tool.ts 的 schema + execute）
- [x] 6.2 在 index.ts 调用 `pi.registerTool` 注册 `obsidian_cli`（引用 raw-tool.ts 的 schema + execute）

## 7. obsidian-search skill 实现

- [x] 7.1 创建 `.pi/skills/obsidian-search/SKILL.md`，含 frontmatter（name + description；覆盖 spec obsidian-search-skill "Skill File Registration"）
- [x] 7.2 编写「触发条件」章节（覆盖 spec "Trigger Conditions"）
- [x] 7.3 编写「Query 优化」章节（覆盖 spec "Query Optimization Guidance"）
- [x] 7.4 编写「模式选择」章节（fast vs deep 指南 + auto-upgrade 说明；覆盖 spec "Mode Selection Guidance"）
- [x] 7.5 编写「结果消费」章节（覆盖 spec "Result Consumption Guidance"）
- [x] 7.6 编写「路由协作」章节（覆盖 spec "Routing Collaboration"）
- [x] 7.7 编写「示例」章节：至少 3 个端到端检索场景（覆盖 spec "Usage Examples"）

## 8. 验证与回写收敛

- [x] 8.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 8.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 8.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）

## 9. 测试验证修复

- [x] 9.1 vault-resolver: `preloadKnownVaults()` 命令改为 `obsidian vaults verbose`（设计 D3 ⚠勘误）
- [x] 9.2 cli-runner: `parseSearchJson()` 完整重写——支持 `string[]`、`{file,matches}[]`、`{file}[]`、纯文本四种实际 CLI 格式（设计 D9 ⚠勘误）
- [x] 9.3 search-tool: `expandPhase()` 中 `links` 命令去掉 `format=json`，改用逐行解析（设计 D9 ⚠勘误）
- [x] 9.4 search-tool: 当 CLI search 返回 0 结果时自动触发 rg fallback（设计 D12b）
- [x] 9.5 vault-resolver: `parseVaultListTable()` 增加防御性验证，拒绝 metadata 字段名作为 vault 名
- [x] 9.6 search-tool: `resolveRgPath()` 从 4 个候选位置查找 rg，解决 spawnSync 路径继承问题

## 10. Skill 跨语言/0结果恢复指导

- [x] 10.1 Query 优化追加「跨语言转换」步骤（覆盖 spec "Query Optimization Guidance" faq/scenario: Chinese query needs English fallback）
- [x] 10.2 结果消费追加 0 结果恢复策略：近义词重查 → tag 发现 → 报告失败（覆盖 spec "Result Consumption Guidance" 第6条）
- [x] 10.3 添加示例 4：跨语言检索恢复场景（从中文 query 到英文关键词的完整 fallback）
