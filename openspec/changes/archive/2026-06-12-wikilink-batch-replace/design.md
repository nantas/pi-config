# Design

## Context

Agent 在 Obsidian vault 中执行批量"裸文本 → wikilink"替换时，需要区分表格行与正文行来决定 `|` 转义。这个判断在脚本中易出错（尤其是长 session 或 subagent 委派场景）。现有防御链（L0 声明 + L2 pre-commit hook）缺少 L1——生成时就正确的工具。

Spec 真源：`specs/wikilink-batch-replace/spec.md`

## Goals / Non-Goals

**Goals:**
- 提供 `wikilink_batch_replace` tool，封装全文扫描 + 表格行转义 + 跳过已有 wikilink 的逻辑
- Agent 直接 tool call 完成批量替换，无需写 Python 脚本
- 单文件 extension，无外部依赖，全局可用

**Non-Goals:**
- 文件发现 / 目录扫描（agent 自行构建映射）
- 已有 wikilink 的路径或 display 修改
- 单条 wikilink 生成
- 多文件同时处理
- 与 `quick_edit` / `target_edit` 的自动集成

## Decisions

### D1: Extension 形态 — 单文件 TypeScript

选择 `.pi/extensions/wikilink-batch-replace.ts` 单文件模式。无 npm 依赖，符合 pi-extension-dev Phase B3 的决策树。

### D2: Tool 注册 — `registerTool`

使用 `pi.registerTool()` 注册为 LLM 可调用 tool（非 command/shortcut/flag）。Tool 在 agent 的工具列表中可见，提高可发现性。

### D3: 参数结构 — 映射表由 agent 传入

`patterns[].mapping` 为 `Record<string, string>`，agent 负责构建映射。Tool 不扫描目录、不猜测路径。映射表可能较大（实测 293 条约 15-20KB），但在 tool call 参数合理范围内。

### D4: 转义策略 — 仅表格行转义

放弃"永远转义"策略。Tool 逐行判断是否以 `|` 开头，仅在表格行中将 wikilink 的 `|` 转义为 `\|`。正文保持 `|` 不转义。与 `specs/wikilink-batch-replace/spec.md` 的 `batch-replace-with-table-escape` requirement 一致。

### D5: 返回值 — 统计信息

直接写文件，返回精简统计：替换总数（正文/表格分计）、跳过已有 wikilink 数、跳过未命中映射数。不返回文件内容。

### D6: 跳过逻辑 — 检测 `[[]]` 内部

沿用 `tools/wikilink.py` 中验证过的 `_is_inside_wikilink()` 算法：从匹配位置向前搜索最近的 `[[` 和 `]]`，若 `[[` 比 `]]` 更近则跳过。

## Risks / Migration

- **大映射表参数**：293+ 条映射约 15-20KB JSON，对 tool call 参数合理但接近上限。若未来单次替换超过 500 条，可能需要分批调用。当前不限制。
- **表格行检测启发式**：以 `|` 开头的行被视为表格行。不处理代码块内的伪表格行（` ``` ` 内的 `|` 开头行）。Obsidian vault 中代码块内出现裸引用的场景极少，当前可接受。
- **迁移**：无迁移需求，纯新增能力。现有 `tools/wikilink.py` 保留在 my-wiki 仓库，不删除。
