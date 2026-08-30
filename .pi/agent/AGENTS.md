# Global Agent Guidance

该文件通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/AGENTS.md`，对所有 Pi session 生效。
如需更新，先修改此文件并提交到版本管理，再运行同步脚本。

---

## Core Rules

- 默认语言：中文
- 保持输出简洁
- 展示文件路径时清晰标注

## 不引入用户未声明的产品框架

### 禁止擅自分期
- 用户没有明确说"分期 / MVP / 原型先行 / 先做一期"时，禁止在输出和文档中
  引入 MVP、Phase、Stage、S1/S2、L1/L2、roadmap、分期交付等概念。
- 需求明确且单次可完成 → 直接完整实现。不存在"先做最小版本"的默认选项。
- 确实判断任务大到单次无法完成时：用 todo/任务清单拆分执行顺序，
  拆分的单位是"可独立验证的功能块"，用中性描述（第一批/后续），
  且这个拆分只在对话和 todo 里存在，不写入 spec/规划文档。
  是否采纳分期由用户决定，用户说分期才分期。

### 文档描述目标状态，不描述过程
- spec/规划文档记录：要做什么、为什么这么定。不记录：先做哪个、
  哪部分算"本期"。
- 执行顺序、实现先后是 agent 的内部事务，出现在 todo/进度汇报中，
  不进入任何持久文档。

### 用户的新需求 = 修改目标状态，不是与旧框架谈判
- 已有文档里若存在阶段/范围框架，用户提出新需求或调整时：
  默认该修改直接并入目标状态，更新文档即可。
- 禁止以"这属于哪个阶段/超出某阶段范围"为由推迟或拒绝执行。
  阶段框架只在用户主动引用它时才有效。
- 合同条款以用户当下的陈述为准，文档只是 agent 的记录。

## 决策与写作规范

### 默认决策，不外包判断
- 范围、边界、取舍类问题：默认采用最保守/最小的选项，执行时在输出末尾
  用一行说明"选了 X，理由是 Y；如需 Z 说一声"。
- 只有同时满足"不可撤销 + 无法从上下文推断"才提问。
  可逆的决定（改文件、写代码、起名字）永远先做了再说。

### 过程代号 ≠ 交付物语言
- D1-D10、L1-L3、Phase 2 这类规划编号只允许出现在：规划文档、内部推理、
  与规划者的对话中。
- 任何面向用户/后续 agent 的文档（README、API 文档、注释、commit message、
  PR 描述）必须自解释：假设读者从未见过规划文档。
  要引用决策就写决策内容本身，不写代号。

### 写作前过一遍"陌生人测试"
- 交付文档写完后自检：删掉所有"as discussed / 如前所述 / D3 / 第二阶段"
  之类的回指后，文档是否仍然完整？不完整就补全内容，不是补全代号。

## Tool Call Guidelines

### Edit Tool

**调用前 3 项自检（逐项确认后再发请求）：**

1. ✅ **`path` 是顶层字段**，不在 `edits[]` 内部
2. ✅ **每条 `oldText` / `newText` ≤ 200 字符**，超过则换 bash + sed
3. ✅ **单次 ≤ 4 条 edits**，超过则拆分为多次调用

- **Avoid overlap**: 多个 `edits[]` 的 `oldText` 不能在原始文件中重叠
- **Prefer sed for bulk**: 简单文本替换（如 `[ ]` → `[x]`）直接用 `sed -i ''` 而非 edit

### Bash Tool

- **批量文本编辑用 `bash` + `sed`**，不要对同一文件发多次 `edit` 调用
  (例：替换全文 `[ ]` → `[x]`、跨文件重命名)。
- 小范围精确改动（≤200 字符、单点）仍用 `edit` 工具。
- **禁止在 bash 里用 `grep`/`rg`/`find` 做代码检索和路径定位** —— 改用 Pi 工具 `grep`/`find`（pi-fff override 模式）。
  它们有 frecency 排序、git 感知、path/exclude 约束，比 bash `rg`/`grep` 快且噪声小。
- 合法例外：
  - 管道内过滤：`cmd | grep foo`（不是在检索仓库）
  - 纯系统命令：`ps aux | grep node`
  - 确认 Pi `grep`/`find` 工具不可用时才降级 bash
- 读取文件内容用 `read` 工具（支持 offset/limit/图片），不要用 `cat`/`head`。
- 临时文件用 `mktemp -d` 创建，用完后清理。

### Error Recovery

- 工具调用失败后，**不要立即用相同参数重试**。
- 先读错误信息确认根因：missing field / type mismatch / content overlap。
- 根据根因选择：拆分参数、换方案、或修复参数后再试。

### Web Search Tool

使用 `web_search_prime_web_search_prime` 工具进行 web 搜索，获取外部信息。

**使用原则**：
- 搜索已知技术或开源项目信息时，优先用 Pi `grep`/`find`/`gitnexus` 搜索本地代码和索引，仅在本地无法覆盖时才用 web search。
- Pi 框架自身的源码和文档问题，应通过 `$cross-repo-research` 在本地仓库查找，不用 web search。
- 构造搜索词时提取核心实体和关键词，避免自然语言长句。
- 需要限定来源可信度时，用 `search_domain_filter` 过滤。
- 需要时效性时，用 `search_recency_filter` 缩小范围。

## 图片格式兼容性（按 provider）

不同 provider 接受的 visual input 格式不同；不兼容时后端会拒绝**整个请求**。

| Provider | 接受格式 | 典型报错 |
|----------|----------|----------|
| `openai-codex`（如 gpt-5.5） | jpeg / png / gif / webp | `The image data you provided does not represent a valid image` |
| `xai` / Grok（如 grok-4.5） | jpeg / png / webp / ico（**不含 gif**） | `Downloaded response does not contain a valid JPG, PNG, WebP, or ICO image` |

**触发场景**：`read` 本地图、webfetch 下载参考图、抓取网页图片进会话（CDN 常下发 AVIF/WebP；下载资源常为 GIF）。

**处理**：图片进入会话前先 `file` 检测格式，当前 provider 不支持则转码为 png/jpeg。macOS 用 `sips`：

```bash
file ref.gif                               # 检测实际格式
sips -s format png ref.gif --out ref.png   # 转码为 png（批量：for f in *.gif *.avif; do ...）
```

判定：以**当前 provider 白名单**为准，不在表内的格式（含 xAI 下的 gif，以及 AVIF/HEIC/HEIF/BMP/TIFF 等）一律先转 png 再作视觉输入。GIF 动图转 png 只保留一帧。SVG 为矢量，sips 不支持，需先栅格化（`rsvg-convert -h 1024 in.svg -o out.png` 或浏览器截图）或向用户索要位图版本。

## 代码检索与文件定位（fff override）

当前运行时 `PI_FFF_MODE=override`：pi-fff 以内置工具名 **`grep` / `find`** 注册（fff 引擎），**不会**再出现 `ffgrep` / `fffind`。
看到工具列表里的 `grep`/`find` 就是 fff，直接用；不要找 `ffgrep`/`fffind`，也不要用 bash `rg`/`grep`/`find` 检索仓库。

**`grep` 和 `find` 是代码检索与路径定位的默认工具。**

### 决策表

| 任务 | 工具 |
|------|------|
| 搜索代码内容（函数、变量、字符串） | `grep` |
| 定位文件或路径 | `find` |
| 列出未知目录结构 | `ls` |
| 读取已知文件 | `read` |
| 搜索注释/字符串/文档 | `grep` |
| 搜索非代码文件（配置、markdown） | `grep` + `path` 约束 |

### grep 使用原则

- **Query 风格**：1-2 个核心关键词（bare identifier 最精确），不用自然语言长句
- **path 约束**：已知目标在 `src/` 下就传 `path: 'src/'`，支持目录前缀、裸文件名、glob（如 `*.ts`、`src/**/*.cc`）
- **exclude 噪声**：`exclude: 'test/, *.min.js, vendor/'` 排除无关目录和文件
- **及时读取**：top match 出来后直接 `read`，不要超过 2 次 grep 仍未读文件

### find 使用原则

- **模糊查询**：1-2 个关键词即可（frecency 排名自动优先最近访问的文件）
- **path 约束**：同 grep，支持目录前缀、裸文件名、glob
- **精确文件名**：已知完整文件名时用 `path: '**/profile.h'` 精确定位

### 反模式

❌ **bash 检索仓库**：`bash` 里跑 `rg` / `grep -rn` / `find . -name`
✅ **Pi 工具**：`grep` / `find`

❌ **找不存在的工具名**：调用 `ffgrep` / `fffind`（override 下未注册）
✅ **用列表里的名字**：`grep` / `find`

❌ **全量扫描**：不带 path 约束的 `grep 'error'` → 命中数百文件
✅ **范围限定**：`grep 'error', path: 'src/api/'`

❌ **链式 grep 缩小**：grep → grep → grep → 终于找到
✅ **grep → read top match**：1 次 grep + 1 次 read

❌ **glob 全量后再过滤**：`find '*.ts'` 扫描全仓库
✅ **带目录约束**：`find 'auth', path: 'src/components/'`

### 编辑工作流（发现 → 修改）

`grep`/`find` 只负责**检索**，代码编辑回退到基础工具：

| 编辑场景 | 工具 |
|----------|------|
| 小范围精确替换（≤200 字符） | `edit` tool |
| 大范围替换 / 多文件 | `bash` + `sed` |
| 跨文件重命名 | `bash` + `sed`，完成后 `grep` 验证所有引用已更新 |
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
