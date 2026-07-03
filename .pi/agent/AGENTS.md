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

### Web Search Tool

使用 `web_search_prime_web_search_prime` 工具进行 web 搜索，获取外部信息。

**使用原则**：
- 搜索已知技术或开源项目信息时，优先用 `ffgrep`/`fffind`/`gitnexus` 搜索本地代码和索引，仅在本地无法覆盖时才用 web search。
- Pi 框架自身的源码和文档问题，应通过 `$cross-repo-research` 在本地仓库查找，不用 web search。
- 构造搜索词时提取核心实体和关键词，避免自然语言长句。
- 需要限定来源可信度时，用 `search_domain_filter` 过滤。
- 需要时效性时，用 `search_recency_filter` 缩小范围。

## 代码检索与文件定位（fff）

**当 `ffgrep` 和 `fffind` 可用时，必须作为代码检索和文件定位的默认工具。**

### 决策表

| 任务 | 工具 |
|------|------|
| 搜索代码内容（函数、变量、字符串） | `ffgrep` |
| 定位文件或路径 | `fffind` |
| 列出未知目录结构 | `ls` |
| 读取已知文件 | `read` |
| 搜索注释/字符串/文档 | `ffgrep` |
| 搜索非代码文件（配置、markdown） | `ffgrep` + `path` 约束 |

### ffgrep 使用原则

- **Query 风格**：1-2 个核心关键词（bare identifier 最精确），不用自然语言长句
- **path 约束**：已知目标在 `src/` 下就传 `path: 'src/'`，支持目录前缀、裸文件名、glob（如 `*.ts`、`src/**/*.cc`）
- **exclude 噪声**：`exclude: 'test/, *.min.js, vendor/'` 排除无关目录和文件
- **及时读取**：top match 出来后直接 `read`，不要超过 2 次 ffgrep 仍未读文件

### fffind 使用原则

- **模糊查询**：1-2 个关键词即可（frecency 排名自动优先最近访问的文件）
- **path 约束**：同 ffgrep，支持目录前缀、裸文件名、glob
- **精确文件名**：已知完整文件名时用 `path: '**/profile.h'` 精确定位

### 反模式

❌ **全量扫描**：不带 path 约束的 `ffgrep 'error'` → 命中数百文件
✅ **范围限定**：`ffgrep 'error', path: 'src/api/'`

❌ **链式 grep 缩小**：grep → grep → grep → 终于找到
✅ **grep → read top match**：1 次 ffgrep + 1 次 read

❌ **glob 全量后再过滤**：`fffind '*.ts'` 扫描全仓库
✅ **带目录约束**：`fffind 'auth', path: 'src/components/'`

### 编辑工作流（发现 → 修改）

fff 只负责**检索**，代码编辑回退到基础工具：

| 编辑场景 | 工具 |
|----------|------|
| 小范围精确替换（≤200 字符） | `edit` tool |
| 大范围替换 / 多文件 | `bash` + `sed` |
| 跨文件重命名 | `bash` + `sed`，完成后 `ffgrep` 验证所有引用已更新 |
| 批量 checkbox 替换 | `bash` + `sed -i ''` |

## Subagent 自动委派

**核心原则**：信息掌握度越低 → 越倾向委派。subagent 的主要价值是充当 token 屏障。

### 委派触发判断

| 主 agent 状态 | 委派？ |
|---------------|--------|
| 目标模糊，需要在陌生代码中定位概念 | ✅ `scout` 盲探测 |
| 需要追踪跨文件调用链但起点不明 | ✅ `scout` |
| 多个不相关方向需要同时探索 | ✅ 并行 `scout` |
| 实施完成后代码审查 | ✅ 并行 `reviewer` × 3 |
| 已知符号名/文件路径，需要 1-2 次精确检索 | ❌ 直接做 |
| 已掌握完整上下文，只需执行具体修改 | ❌ 直接做 |
| 主 agent 需要完整原始数据做后续推理 | ❌ 不委派 |

### 执行规范

1. **Task 描述要具体**：明确查什么、输出什么格式
2. **主 agent 只保留摘要**：subagent 返回后提取结论，不保留完整源码
3. **按符号/文件拆分并行**：多个不相关查询用 `tasks: [...]` 并行执行
4. **不要嵌套 subagent**：所有编排在主 agent 完成

### 工作流委派规则

当 subagent task 涉及执行某个 `/xxx-yyy` 工作流时（如 `/opsx-verify`、`/opsx-apply`）：

1. **必须读取完整 prompt 文件**，查找顺序：
   - 全局：`~/.pi/agent/prompts/<name>.md`
   - 项目级：`.pi/prompts/<name>.md`
2. **将完整正文作为 task prompt 的主体**，不得摘要、改写或省略
3. 主 agent 可以在 prompt 文件正文**之前或之后**追加补充上下文（如 change 名称、目标文件路径），但不得修改正文本身
4. subagent 遇到不可执行的指令（如用户交互工具）时会自然跳过，不需要预先过滤

> 串行编排模式、完整工作流和 task prompt 编写指南见 [AGENTS.d/subagent-usage.md](./AGENTS.d/subagent-usage.md)。

## README 维护

当变更涉及仓库能力的增删（扩展、包、Agent、技能）时，必须按 [docs/reference/readme-governance.md](../../docs/reference/readme-governance.md) 评估并更新 README.md 和 `docs/getting-started.md` 的能力描述，保持与 `capabilities.yaml` 一致。

## Pi 供应商与模型配置

当用户需要设置自定义供应商、添加模型或配置 `enabledModels` 时，先阅读 [docs/reference/pi-provider-model.md](../../docs/reference/pi-provider-model.md)：
- 通过 `~/.pi/agent/models.json` 添加自定义供应商/模型（Ollama、代理网关等）
- 通过 `~/.pi/agent/settings.json` 中的 `enabledModels` 控制模型轮询范围
