# Global Agent Guidance

该文件通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/AGENTS.md`，对所有 Pi session 生效。
如需更新，先修改此文件并提交到版本管理，再运行同步脚本。

---

## Core Rules

- 默认语言：中文
- 保持输出简洁
- 展示文件路径时清晰标注

## Tool Call Guidelines

### Edit Tool

**调用前 3 项自检（逐项确认后再发请求）：**

1. ✅ **`path` 是顶层字段**，不在 `edits[]` 内部
2. ✅ **每条 `oldText` / `newText` ≤ 200 字符**，超过则换 bash + sed
3. ✅ **单次 ≤ 4 条 edits**，超过则拆分为多次调用

**Schema 结构（必填字段在顶层，与 `edits` 同级）：**

```json
{
  "path": "relative/path/to/file",
  "edits": [
    { "oldText": "...", "newText": "..." },
    { "oldText": "...", "newText": "..." }
  ]
}
```

- **`path` 是顶层必填字段**，不要把它放进 `edits[]` 内部，也不要遗漏。
- **Batch limit**: 最多 3-4 个 `edits[]` 条目 per 调用。超过时拆分为多次 edit 调用。
- **Content length**: 每条 `oldText` / `newText` 控制在 200 字符以内。长 multiline 内容优先用 bash + sed。
- **Avoid overlap**: 多个 `edits[]` 的 `oldText` 不能在原始文件中重叠。
- **Prefer sed for bulk**: 简单文本替换（如 `[ ]` → `[x]`）直接用 `sed -i ''` 而非 edit。

### Bash Tool

- 优先用 bash 工具做**文件读取、查找、替换**，而非多次 edit。
- 临时文件用 `mktemp -d` 创建，用完后清理。

### Error Recovery

- 工具调用失败后，**不要立即用相同参数重试**。
- 先读错误信息确认根因：missing field / type mismatch / content overlap。
- 根据根因选择：拆分参数、换方案、或修复参数后再试。

### MCP Tool / Dispatch

涉及以下场景时，请先阅读 [AGENTS.d/tool-mcp.md](./AGENTS.d/tool-mcp.md)：
- 需要创建或调用 Dispatch agent
- 需要通过 MCP 操作外部工具

### ask_user Tool

涉及以下场景时，请先阅读 [AGENTS.d/tool-ask-user.md](./AGENTS.d/tool-ask-user.md)：
- 调用 ask_user 让用户确认某个决策或内容选择
- 需要将 Agent 内部生成的数据（标题、摘要、方案等）展示给用户做判断

### Web Search Tool

使用 `web_search_prime_web_search_prime` 工具进行 web 搜索，获取外部信息。

**调用方式**（两种等价，优先直接调用）：
- 直接调用：`web_search_prime_web_search_prime({ search_query: "..." })`
- MCP gateway：`mcp({ tool: "web_search_prime_web_search_prime", args: '{"search_query":"..."}' })`

**参数指南**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `search_query` | ✅ | 搜索词，建议 ≤70 字符，用关键词而非完整句子 |
| `location` | - | `"cn"` 中国区域（默认），`"us"` 海外区域 |
| `content_size` | - | `"medium"` 默认 400-600 词；`"high"` 最多 2500 词 |
| `search_domain_filter` | - | 限制域名，如 `"github.com"` |
| `search_recency_filter` | - | `"oneDay"` / `"oneWeek"` / `"oneMonth"` / `"oneYear"` / `"noLimit"` |

**使用原则**：
- 搜索已知技术或开源项目信息时，优先用 `grep`/`find`/`lsp`/`gitnexus` 搜索本地代码和索引，仅在本地无法覆盖时才用 web search。
- Pi 框架自身的源码和文档问题，应通过 `$cross-repo-research` 在本地仓库查找，不用 web search。
- 构造搜索词时提取核心实体和关键词（如 `"Node.js 22 ES module flag change"`），避免自然语言长句。
- 需要限定来源可信度时，用 `search_domain_filter` 过滤（如官方文档站点）。
- 需要时效性时，用 `search_recency_filter` 缩小范围。
- 返回结果为 JSON 数组，每项含 `title`、`link`、`content`，引用时注明来源 URL。

## Markdown Output Quality

输出内容包含 Markdown 表格时（尤其是 Obsidian Wiki 链接），请先阅读 [AGENTS.d/output-quality.md](./AGENTS.d/output-quality.md)。

## LSP 代码智能

涉及复杂仓库的代码理解、检索或诊断时，优先用 `lsp` 工具而非 `grep` + `read`。完整指南参见 [AGENTS.d/lsp-guide.md](./AGENTS.d/lsp-guide.md)。

以下场景**必须**阅读：
- 第一次在当前项目中使用 `lsp` 工具
- 需要理解某个符号的定义、引用或类型
- 修改代码前需要检查影响范围
- 编辑完成后需要验证无新增错误

## Subagent 自动委派

**核心原则**：当工具调用会产生大量返回数据（高 token 消耗），或需要 3+ 步工具调用才能得出结论时，**必须 delegate**。subagent 的主要价值是充当 token 屏障——将巨大 toolresult 压缩成精炼结论，避免主 session context 膨胀。

### 委派 vs 不委派

| 场景 | 委派？ | Agent |
|------|--------|-------|
| `gitnexus_query` 查询（模糊探索或定向） | ✅ | `scout` |
| `gitnexus_context` 360° 视图 | ✅ | `scout` |
| `gitnexus_impact` blast radius 分析 | ✅ | `scout` |
| 追踪 3+ 步跨文件调用链 | ✅ | `scout` |
| 跨 3+ 文件分析代码模式 | ✅ | `scout` |
| Git 多步溯源（log + blame + diff 组合） | ✅ | `scout` |
| 多个独立方向同时探索 | ✅ 并行 | `scout` × N |
| Unity MCP 场景树/prefab 查询 | ✅ | `unity-worker` |
| 实施完成后代码审查 | ✅ 并行 | `reviewer` × 3 |
| 单次 `lsp definition` / `references` | ❌ 直接做 | — |
| 单次 `grep` 简单模式搜索 | ❌ 直接做 | — |
| `gitnexus_list_repos` / `gitnexus_cypher`（小返回） | ❌ 直接做 | — |
| 主 agent 需要完整原始数据做后续推理 | ❌ 不委派 | — |

### Subagent 选择

| 任务类型 | Agent | Context |
|---------|-------|---------|
| 代码侦察 / gitnexus 重操作 / Git 溯源 | `scout` | fresh |
| 外部资料调研 | `researcher` | fresh |
| 编辑后审查 | `reviewer` | fresh |
| 实施执行 | `worker` | fork |
| 实施计划制定 | `planner` | fork |
| 上下文构建 | `context-builder` | fresh |
| 方向审阅 | `oracle` | fork |

### 执行规范

1. **Task 描述要具体**：明确查什么、输出什么格式（例：`"用 gitnexus_query 查询 XxxManager 执行流，输出关键调用链 + 文件路径"`）
2. **主 agent 只保留摘要**：subagent 返回后提取结构化结论，不保留完整源码
3. **按符号/文件拆分并行**：多个不相关查询用 `tasks: [...]` 并行执行
4. **不要嵌套 subagent**：所有编排在主 agent 完成

> 编排模式（chain、parallel 组合）、完整工作流和 task prompt 编写指南见 [AGENTS.d/subagent-usage.md](./AGENTS.d/subagent-usage.md)。

## README 维护

当变更涉及仓库能力的增删（扩展、包、Agent、技能）时，必须按 [AGENTS.d/readme-governance.md](./AGENTS.d/readme-governance.md) 评估并更新 README.md 和 `docs/getting-started.md` 的能力描述，保持与 `capabilities.yaml` 一致。

## Pi 供应商与模型配置

当用户需要设置自定义供应商、添加模型或配置 `enabledModels` 时，先阅读 [AGENTS.d/pi-provider-model.md](./AGENTS.d/pi-provider-model.md)：
- 通过 `~/.pi/agent/models.json` 添加自定义供应商/模型（Ollama、代理网关等）
- 通过 `~/.pi/agent/settings.json` 中的 `enabledModels` 控制模型轮询范围

### 初学者首次配置

当用户是 pi-config 初学者或需要完整的环境配置指导时，引导其阅读 [docs/getting-started.md](../../docs/getting-started.md)：
- 七步入门工作流：安装 Pi CLI → 配置供应商 → 配置 enabledModels → 查看能力清单 → 确认同步范围 → 执行全局同步 → 验证环境
- 该文档涵盖内置供应商 login 和自定义供应商（企业代理/API 网关）两种配置路径
