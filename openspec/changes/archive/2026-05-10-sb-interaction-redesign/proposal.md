# Proposal

## Why

当前 `/sb` 命令存在五个交互设计缺陷，导致用户无法有效定位历史 session 中的目标信息：

1. **搜索结果扁平排列，无 session 分组**：FTS5 匹配结果散落在多个 session 中但无分组，用户无法判断 "这属于哪个对话"
2. **结果缺少 session 主题信息**：选项只显示 timestamp + role + snippet，没有 session 的首条用户消息或可读 project 名
3. **select() 组件无分页**：`ExtensionSelectorComponent` 渲染全部选项但无 viewport 控制，终端高度有限时只能看到 4-5 条，无滚动提示
4. **Turn 预览信息过度压缩**：`formatTurn()` 截断 assistant 文本、只显示 tool call 函数名不显示参数、跳过所有 toolResult entry，信息不足以判断相关性
5. **没有回到主 agent 的交互出口**：交互终点是 `[q] Quit`，退出后无任何信息保留或传递给 agent

## What Changes

1. 将 `/sb` 交互从扁平 `ctx.ui.select()` 改为两级 custom TUI组件（SessionBrowser → SessionHitBrowser）
2. 新增 turn preview overlay，Space 键切换，支持滚动查看完整 turn 内容
3. 新增 "Explore with Agent" 操作，通过 `setEditorText()` 注入定位信息 prompt
4. 增强 `formatTurn()` 输出格式：紧凑 `U`/`A` 标记，tool call 单行参数摘要
5. 新增 `session-iterate` LLM 工具：按 turn 步进导航，支持全量/摘要两种输出模式
6. 搜索排序加权：user/assistant 角色优先于 toolResult
7. 系统文本压缩：skill 展开、代码块、文档注入等系统文本在显示时压缩为短标签

## 范围边界

**在范围内：**

- 重构 `/sb` 为两级交互：先选 session → 再选 session 内搜索命中
- 两级列表均使用 `ctx.ui.custom()` + `SelectList` 实现分页滚动
- Space 键切换 turn preview overlay（只读滚动查看完整 turn 内容）
- 增强 `formatTurn()` 输出：保留 user/assistant 完整文本，tool call 显示为一行参数摘要
- 新增 "让 agent 探索总结" 操作：通过 `setEditorText()` 注入定位信息 prompt
- 搜索排序加权：user/assistant 角色优先于 toolResult
- **新增 session-iterate LLM 工具**：支持按 turn 步进导航、两种输出模式、全局会话概览
- **新增 formatTurnSummary()**：结构化压缩摘要格式（面向 summary 模式）

**不在范围内：**

- 不修改已有 LLM tools（session-search/expand/read）的行为
- 不修改 `/sr` 命令
- 不修改 indexer 的索引逻辑或 schema
- 不实现 setEditorText 之外的 agent 交互方式（如 sendUserMessage、switchSession）
- 不修改 Pi 核心 ExtensionSelectorComponent

**不在范围内（原始）：**
- ~~不修改 LLM tools（session-search/expand/read）的行为~~ → 本变更新增 session-iterate 工具，但不修改已有三工具

## Capabilities

### New Capabilities

- `session-hit-browser`: 基于 `ctx.ui.custom()` + `SelectList` 的两级分页浏览组件，支持 session 列表选择 → session 内命中翻页 → Space 切换 turn preview overlay → 确认后 setEditorText 注入 agent prompt
- `session-iterate`: LLM 可调用的会话导航工具，支持按 turn 步进（next/prev/start/end）、两种输出模式（full/summary）、全局会话概览；让 agent 能够在历史 session 中自主探索

### Modified Capabilities

- `session-browse-command`: 交互流从扁平 select 改为两级 custom 组件，turn 预览从 editor() 改为 custom overlay，post-turn 操作从 read/back/quit 改为 explore/back/quit
- `session-browse-turn-format`: `formatTurn()` 输出格式增强：保留完整 user/assistant 文本、tool call 参数单行摘要（固定字符数截断）；新增结构化 summary 输出格式

## Capabilities 待确认项

- [x] 能力清单已与用户确认（2026-05-09 explore session 中讨论确认）

## Impact

- **重写文件**: `browser.ts`（几乎完全重写）
- **修改文件**: `expander.ts`（`formatTurn()` 输出格式，新增 `buildTurnIndex()`、`formatTurnSummary()`）
- **修改文件**: `indexer.ts`（新增 `searchGrouped()` 排序加权查询）
- **修改文件**: `index.ts`（新增 `session-iterate` 工具注册 ~80 行）
- **新增类型**: `types.ts` 新增 `SessionSearchGroup`、`SessionPosition`、`TurnSummary`、`SessionIterateResult` 接口
- **新增依赖**: 需 import `@earendil-works/pi-tui` 的 `SelectList`, `Container`, `Text`, `Box` 组件
- **不修改文件**: `resumer.ts`, `html-parser.ts`
- **可逆性**: `/sb` 命令行为变更和 session-iterate 工具均为增量添加；不影响 session-search/expand/read；回滚只需恢复 browser.ts + 移除 session-iterate 工具注册
- **运行时依赖**: 需要 Pi runtime v0.74+ 的 `ctx.ui.custom()` 支持和 `@earendil-works/pi-tui` SelectList 组件

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：参考 `session-browse-ui` 原有 spec，无外部项目页面回写
