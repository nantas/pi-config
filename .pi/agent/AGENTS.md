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

- **Avoid overlap**: 多个 `edits[]` 的 `oldText` 不能在原始文件中重叠
- **Prefer sed for bulk**: 简单文本替换（如 `[ ]` → `[x]`）直接用 `sed -i ''` 而非 edit

### Bash Tool

- 优先用 bash 工具做**文件读取、查找、替换**，而非多次 edit。
- 临时文件用 `mktemp -d` 创建，用完后清理。

### Error Recovery

- 工具调用失败后，**不要立即用相同参数重试**。
- 先读错误信息确认根因：missing field / type mismatch / content overlap。
- 根据根因选择：拆分参数、换方案、或修复参数后再试。

### Grep / Find Tool

使用 `grep` / `find` 搜索代码时，**必须缩小搜索范围**，避免对大仓库全量扫描导致输出截断和 token 浪费。

**使用原则**：
- **通过 `glob` 指定扩展名**：如 `glob: '*.ts'`、`glob: '**/*.yaml'`，避免命中无关文件（lock 文件、构建产物、vendor 目录等）。
- **通过 `path` 限定目录范围**：已知目标在 `src/` 下就不要搜整个仓库根目录。
- **组合使用**：`path: 'src/components'` + `glob: '*.tsx'` 是最优实践。
- **find 同理**：使用 `pattern: '*.spec.ts'` 而非 `pattern: '*.ts'` 全量扫描后再过滤。

### Web Search Tool

使用 `web_search_prime_web_search_prime` 工具进行 web 搜索，获取外部信息。

**使用原则**：
- 搜索已知技术或开源项目信息时，优先用 `grep`/`find`/`lsp`/`gitnexus` 搜索本地代码和索引，仅在本地无法覆盖时才用 web search。
- Pi 框架自身的源码和文档问题，应通过 `$cross-repo-research` 在本地仓库查找，不用 web search。
- 构造搜索词时提取核心实体和关键词，避免自然语言长句。
- 需要限定来源可信度时，用 `search_domain_filter` 过滤。
- 需要时效性时，用 `search_recency_filter` 缩小范围。

## LSP 代码智能

当 serena 工具可用时，**必须优先使用**而非 `grep` + `read` 组合。完整工作流、决策表、反模式和集成指南见 **`serena-code-intelligence` skill**（自动注入）。

## Subagent 自动委派

**核心原则**：当工具调用会产生大量返回数据（高 token 消耗），或需要 3+ 步工具调用才能得出结论时，**必须 delegate**。subagent 的主要价值是充当 token 屏障。

### 委派触发判断

| 场景 | 委派？ |
|------|--------|
| `gitnexus_query` / `gitnexus_context` / `gitnexus_impact` 等重操作 | ✅ `scout` + 对应 skill |
| 追踪 3+ 步跨文件调用链 | ✅ `scout` |
| 多个独立方向同时探索 | ✅ 并行 |
| 实施完成后代码审查 | ✅ 并行 `reviewer` × 3 |
| 单次 `lsp definition` / `references` / `grep` | ❌ 直接做 |
| `gitnexus_list_repos` / `gitnexus_cypher`（小返回） | ❌ 直接做 |
| 主 agent 需要完整原始数据做后续推理 | ❌ 不委派 |

### 执行规范

1. **Task 描述要具体**：明确查什么、输出什么格式
2. **主 agent 只保留摘要**：subagent 返回后提取结论，不保留完整源码
3. **按符号/文件拆分并行**：多个不相关查询用 `tasks: [...]` 并行执行
4. **不要嵌套 subagent**：所有编排在主 agent 完成

> 编排模式（chain、parallel 组合）、完整工作流和 task prompt 编写指南见 [AGENTS.d/subagent-usage.md](./AGENTS.d/subagent-usage.md)。

## README 维护

当变更涉及仓库能力的增删（扩展、包、Agent、技能）时，必须按 [docs/reference/readme-governance.md](../../docs/reference/readme-governance.md) 评估并更新 README.md 和 `docs/getting-started.md` 的能力描述，保持与 `capabilities.yaml` 一致。

## Pi 供应商与模型配置

当用户需要设置自定义供应商、添加模型或配置 `enabledModels` 时，先阅读 [docs/reference/pi-provider-model.md](../../docs/reference/pi-provider-model.md)：
- 通过 `~/.pi/agent/models.json` 添加自定义供应商/模型（Ollama、代理网关等）
- 通过 `~/.pi/agent/settings.json` 中的 `enabledModels` 控制模型轮询范围
