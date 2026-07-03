# Revert snap-edit, restore builtin edit

撤销 [ADR 0009](./0009-prefer-snap-edit-over-builtin-edit.md) 的结论：从全局能力移除 `pi-snap-edit`，恢复内置 `edit`（oldText/newText 全文本匹配模型）。

## 背景

ADR 0009 引入 `pi-snap-edit` 以降低 `edit` 的 token 开销（批量编辑调用减少 67%、大段删除参数节省 79%）。经过一段时间使用，产生多类导致**代码文件整段出错**的异常编辑，记录在 [`docs/plans/snap-edit-tool-issues-report.md`](../plans/snap-edit-tool-issues-report.md)：

- `preserveIndent` 契约误用导致缩进双倍累加（8 空格 → 16 空格，P0）
- `target_edit` 批量 ops 的 `line` 参数受前序 op 行数增减影响，LLM 预算漂移
- 构造超大 JSON 参数（>10KB）时 schema 验证失败频发（未转义引号、截断）
- 多方法块替换范围边界计算偏差风险

经源码复核，部分问题（如问题 1 的 trim 根因、问题 2 的残留重复代码）并非工具 bug，而是 LLM 构造参数的可靠性问题。但 snap-edit 的行号模型 + 行首守卫 + 精确文本定位模型**放大了这些构造错误的影响面**——`splice` 删除了错误范围后整段代码损坏。原生 `edit` 的全文本匹配模型在失败时更安全（精确不匹配直接拒绝，而非写出错乱的行范围）。

## 决策

采用"移除"而非"修复"策略：

1. 从 `.pi/capabilities.yaml` 的 `global.settings.packages` 移除 `npm:pi-snap-edit`
2. `.pi/agent/AGENTS.md` 的编辑指导恢复原生 `### Edit Tool`（对照 `8c6cd90^` 基线），固化「≤200 字符 / ≤4 条 edits / 超过转 bash+sed」硬约束
3. 额外执行 `pi remove npm:pi-snap-edit` 清理 `~/.pi/agent/node_modules`（sync 脚本只重写 settings.json，不卸载 node_modules）

## 影响

- 治理变更由 OpenSpec change `remove-pi-snap-edit-global` 承载，行为规范真源见 `specs/global-agent-guidance/spec.md` 与 `specs/capability-manifest/spec.md`
- ADR 0009 保留作不可变历史，不删除
- 取舍：token 开销回升，通过三项自检硬约束兜住（强制大段编辑走 bash+sed 而非 edit）
