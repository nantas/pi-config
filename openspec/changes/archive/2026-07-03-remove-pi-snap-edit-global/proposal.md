# Proposal

## 问题定义

`pi-snap-edit` 作为全局扩展引入后，在 session 启动时替换内置 `edit` 为 `quick_edit`（按行号）和 `target_edit`（按精确文本）。经过一段时间使用，产生多类导致**代码文件整段出错**的异常编辑，记录在 `docs/plans/snap-edit-tool-issues-report.md`：

- `preserveIndent` 契约误用导致缩进双倍累加（8 空格 → 16 空格，P0）
- `target_edit` 批量 ops 的 `line` 参数受前序 op 行数增减影响，LLM 预算漂移
- 构造超大 JSON 参数（>10KB）时 schema 验证失败频发（未转义引号、截断）
- 多方法块替换范围边界计算偏差风险

尽管部分问题经源码复核并非工具 bug，而是 LLM 构造参数的可靠性问题，但 snap-edit 的行号模型 + 行首守卫 + 精确文本模型放大了 LLM 构造错误的影响面。原生 `edit` 的 oldText/newText 全文本匹配模型虽 token 开销略高，但在失败时更安全（精确不匹配直接拒绝，而非写出错乱的行范围）。

经用户决策，从全局能力中移除 `pi-snap-edit`，恢复内置 `edit` 指导。

## 范围边界

**范围内：**
- 从 `global.settings.packages` 移除 `npm:pi-snap-edit`
- `.pi/agent/AGENTS.md` 的「编辑工具」节、fff 编辑工作流表恢复为原生 `edit` 指导（对照 `8c6cd90^` 基线）
- `CONTEXT.md` 删除「行号编辑」能力段
- 新建 ADR 0010 撤销 ADR 0009（0009 保留作不可变历史）
- 全局 `~/.pi/agent/` 同步 + `node_modules` 清理

**范围外：**
- 不修改 snap-edit 源码、不向上游提 issue（采用"移除"而非"修复"策略）
- 不改 agent 定义文件、AGENTS.d、skills（已确认无 snap-edit 引用）
- 不改 README / getting-started（已确认无引用）
- `openspec/pkg-backlog.md` 和 `docs/plans/snap-edit-tool-issues-report.md` 作为历史记录保留（后者可选追加状态标注）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `global-agent-guidance`: `.pi/agent/AGENTS.md` 的编辑工具指导从 snap-edit（quick_edit/target_edit）回退到原生 `edit` tool（oldText/newText 模型），固化调用前三项自检（≤200 字符 / ≤4 条 edits / 超过转 bash+sed）作为防回归约束，fff 编辑工作流表同步恢复原生工具映射
- `capability-manifest`: 从 `.pi/capabilities.yaml` 的 `global.settings.packages` 列表移除 `npm:pi-snap-edit`，同步触发 sync 脚本从 `~/.pi/agent/settings.json` 清理该 package 条目

## Capabilities 待确认项

- [x] 能力清单已与用户确认（global-agent-guidance + capability-manifest）

## Impact

- **正向**：消除 snap-edit 行号模型 + 行首守卫放大 LLM 构造错误的整段损坏风险；恢复 oldText/newText 精确匹配模型，失败时安全拒绝而非写错行范围
- **负向 / 取舍**：原生 `edit` 在大段替换、批量编辑、含特殊字符场景下 token 开销回升（ADR 0009 当初引入 snap-edit 正为此）；通过保留「≤200 字符 / ≤4 条 / 超过转 bash+sed」硬约束兜住
- **同步约束**：sync 脚本只重写 `settings.json`，不清理 `node_modules`，需额外执行 `pi remove npm:pi-snap-edit`
- **生效时机**：本次 session 已加载 snap-edit 不受影响，改动在**新 session** 生效

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：无外部标准页依赖
  - 项目页：`.pi/capabilities.yaml`、`.pi/agent/AGENTS.md`、`CONTEXT.md`
  - 回写目标：无外部回写目标，仓库内变更后运行 `scripts/sync-pi-agent.sh`
