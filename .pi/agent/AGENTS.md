# Global Agent Guidance

该文件通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/AGENTS.md`，对所有 Pi session 生效。
如需更新，先修改此文件并提交到版本管理，再运行同步脚本。

---

## Core Rules

- 默认语言：中文
- 保持输出简洁
- 展示文件路径时清晰标注

## Tool Call Guidelines

### 编辑工具（quick_edit / target_edit）

> pi-snap-edit 在 session 启动时替换内置 `edit` 为 `quick_edit` + `target_edit`。
> 以下规则适用于这两个工具。内置 `edit` 不再活跃。

**quick_edit 自检：**

1. ✅ **已 read 目标文件**，行号是最新的。以下任一操作后都必须重新 read，不得沿用旧行号：
   - 自身执行 `git checkout` / `git stash` / `git reset` 回退文件
   - 用 bash + sed/Python 脚本修改了同一文件
   - subagent / 其他工具可能修改了该文件
2. ✅ **`expectedStartLine` 与实际行内容一致**。缩进/尾部空格不确定时可用 `expectedStartLineMatch: "trim"`；但 **`preserveIndent: true` 要求 `lines` 字段传入无缩进文本**——它会取文件实际行的前导空格拼到每行前面。若 `lines` 已带缩进（常见于从 `read` 直接复制），再开 `preserveIndent` 会**双倍累加**（如 8 空格变 16）。二选一：
   - `lines` 带完整缩进（推荐，所见即所得）→ `preserveIndent` 留空/省略
   - `lines` 不带缩进 → 显式设 `preserveIndent: true`
3. ✅ **批量 edits 的 start/end 范围不重叠**（快照模式，不递增编号）

**target_edit 自检：**

1. ✅ **`target` 是精确字面文本**，不支持正则；多行用 `\n`
   - ⚠️ 每个 op **必须包含 `type` 字段**（`replace`/`delete`/`insert_before`/`insert_after`）。漏掉 `type` 会导致 `anyOf` 四个分支全不匹配，报错 `must have required properties type`——这在构造大 JSON 时极易发生
2. ✅ **`line` 或 `range` 二选一**（replace/delete 必填其一，即使 `target` 全文唯一）；insert 操作必须带 `line`。构造多行 `target`（>3 行）的大 JSON 时，落笔前自检每个 op 是否都带 `line` 或 `range`——这是构造大 JSON 时最易遗漏的字段
3. ✅ **同一文本多处出现时**，必须用 `line` 或 `range` 限定到唯一匹配
4. ✅ **多个不相连位置的编辑优先用 `quick_edit` 批量模式**（snapshot-based）。`target_edit` 批量 ops 是 sequential 的，`line` 参数会受前序 op 行数增减影响，LLM 预算漂移极易出错。如必须用 `target_edit`，应拆成多次单 op 调用
5. ✅ **target + replacement 合计超过 ~20 行时**建议改用 `quick_edit`（基于行号更可靠）或 `bash` + Python 脚本。target_edit 引擎本身无长度上限，但 LLM 构造超大 JSON 参数（>10KB）时格式错误风险显著增加（未转义引号、截断等），导致 Pi 框架层 schema 验证失败

**不能覆盖 → 兜底 bash+sed/Python：**

- 多文件同时编辑
- 行号不确定且无法先 read
- 需要模糊/正则匹配
- 批量 checkbox 等简单文本替换（`sed -i ''` 更直接）
- 大段文本替换（target + replacement 合计 >20 行）

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

fff 只负责**检索**，代码编辑使用 snap-edit 工具或兜底 bash+sed：

| 编辑场景 | 工具 |
|----------|------|
| 已知行号的单行/小范围替换 | `quick_edit` |
| 已知行号的大段替换或整段删除 | `quick_edit`（`lines: []` 删除） |
| 精确文本替换/插入/删除（单次操作） | `target_edit` |
| 同文件多处不相关编辑 | `quick_edit` 批量模式（snapshot-based） |
| 多处不相连位置按文本匹配替换 | 多次单 op `target_edit` 或 `quick_edit` 批量，**不要 `target_edit` 批量**（sequential 行号漂移） |
| 行号不确定或文件已被修改 | 先 `read` 获取行号，再 `quick_edit` |
| 多文件编辑 / 跨文件重命名 | `bash` + `sed`，完成后 `ffgrep` 验证 |
| 批量 checkbox / 简单文本替换 | `bash` + `sed -i ''` |
| 模糊或正则匹配需求 | `bash` + `sed` / `awk` |

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
