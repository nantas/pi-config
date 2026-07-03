# Design

## Context

`pi-snap-edit`（commit `8c6cd90`）作为全局扩展引入，session 启动时替换内置 `edit` 为 `quick_edit`（按行号）+ `target_edit`（按精确文本）。使用一段时间后产生多类导致代码文件整段出错的异常编辑，证据见 `docs/plans/snap-edit-tool-issues-report.md`。经复核，部分问题并非工具源码 bug，而是 LLM 构造参数（`preserveIndent` 契约误用、批量 ops 行号漂移、超大 JSON schema 失败）的可靠性问题；但 snap-edit 的行号模型 + 行首守卫放大了这些构造错误的影响面。采用"移除"而非"修复"策略，恢复原生 `edit` 的 oldText/newText 模型（失败时安全拒绝而非写错行范围）。

行为规范真源：
- `specs/global-agent-guidance/spec.md` — AGENTS.md 编辑指导回退
- `specs/capability-manifest/spec.md` — manifest packages 移除 + node_modules 清理

## Goals / Non-Goals

**Goals:**
- 从全局能力彻底移除 `pi-snap-edit`（manifest + settings.json + node_modules）
- AGENTS.md 编辑指导恢复原生 `edit`，并固化「≤200 字符 / ≤4 条 edits / 超过转 bash+sed」硬约束
- 新建 ADR 0010 撤销 ADR 0009，保留 ADR 0009 作不可变历史
- 验证新 session 恢复原生 edit 工具

**Non-Goals:**
- 不修改 snap-edit 源码、不向上游提 issue
- 不改 agent 定义 / AGENTS.d / skills（已确认无引用）
- 不改 README / getting-started（已确认无引用）
- 不在本 change 内评估替代方案（如其他行号编辑扩展）；纯回退到内置基线

## Decisions

### D1: AGENTS.md 恢复基线 = `8c6cd90^`（引入前版本）
对照 `git show 8c6cd90^:.pi/agent/AGENTS.md` 恢复「Edit Tool」节与 fff 编辑工作流表。该版本已包含三项自检硬约束，直接复用而非重新设计，降低偏差风险。

### D2: 移除策略而非修复策略
`docs/plans/snap-edit-tool-issues-report.md` 显示问题 1（P0 preserveIndent 缩进累加）经源码复核无 bug、问题 2（残留重复代码）未在 session 复现——根因落在 LLM 构造参数可靠性。snap-edit 的行号模型让构造错误更危险（splice 删除了错误范围），原生 edit 的全文本匹配让失败更显式（精确不匹配直接拒绝）。移除工具切掉整个风险面。

### D3: ADR 0009 保留 + 新建 ADR 0010
ADR 不可变。新建 `docs/adr/0010-revert-snap-edit.md` 撤销 0009 的结论，记录撤销理由与证据链接。0009 不删，保留决策历史可追溯。

### D4: 两步清理（sync 不卸载 node_modules）
sync 脚本只重写 `settings.json`（manifest authoritative），不清理已安装的 node_modules。必须额外执行 `pi remove npm:pi-snap-edit`（或手动删 `~/.pi/agent/node_modules/pi-snap-edit`）。这是 `specs/capability-manifest` 的 `package-removal-node-modules-cleanup` requirement 的来源。

## Risks / Migration

- **风险：token 开销回升**。ADR 0009 当初引入 snap-edit 正为解决 oldText 精确匹配的 token 开销（基准：批量编辑调用减少 67%、大段删除参数节省 79%）。回退后回升。**缓解**：保留三项自检硬约束（≤200 字符 / ≤4 条 edits / 超过转 bash+sed），强制大段编辑走 bash+sed 而非 edit。
- **风险：根因未消**。LLM 大 JSON 构造不可靠在原生 edit 下以 oldText 形式重新存在。**缓解**：≤200 字符约束限制单次 oldText 体量。
- **风险：旧 session 内残留引用**。docs/plans 报告、openspec/pkg-backlog.md 提到 snap-edit。**缓解**：作为历史记录保留，不修改；可选在报告顶部追加状态标注。
- **迁移**：本次 session 已加载 snap-edit，改动在新 session 生效。实施后用户需重启 session 验证工具列表恢复原生 edit。
