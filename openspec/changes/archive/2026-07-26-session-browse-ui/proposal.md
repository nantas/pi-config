# Proposal

## 问题定义

Change 1 (`session-browse-core`) 提供了 LLM 可调用的三个检索工具（session-search、session-expand、session-read），但**人类用户**缺少对应的交互入口来浏览历史 session 和恢复会话。当前：

- 人类用户无法直接通过快捷键/命令搜索历史 session
- 无法从搜索结果中选择并展开 turn 上下文
- 无法通过命令快速恢复最近的历史 session

## 范围边界

**在范围内：**

- 注册 `/sb` 命令（session browse）— 终端内交互式搜索/浏览/读取
- 注册 `/sr` 命令（session resume）— 列出最近 session → 恢复对话
- 注册快捷键 `Cmd+Shift+F` → `/sb`，`Cmd+Shift+R` → `/sr`
- 所有功能基于 Change 1 已暴露的 API（`search()`、`listRecent()`、`buildTurnFromEntryId()`、`formatTurn()` 等）
- 不修改 Change 1 的任何已有文件

**不在范围内：**

- 不实现 `setEditorComponent` UI overlay（编辑器可组合性约束）
- 不新增后端数据访问能力（全复用 Change 1）
- 不改动 Change 1 已有的 tools 注册
- 不支持 HTML export 的 resume（与 Change 1 约束一致）
- 不实现 thinking blocks 相关功能

## Capabilities

### New Capabilities

- `session-browse-command`: 终端内交互式 Session 搜索/浏览/读取的 `/sb` 命令，支持搜索→选择→展开→读取的全流程
- `session-resume-command`: Session 恢复的 `/sr` 命令，支持列出最近 session → 选择并恢复对话

### Modified Capabilities

无

## Impact

- **新增文件**: `.pi/extensions/session-browse/browser.ts`、`resumer.ts`
- **修改文件**: `.pi/extensions/session-browse/index.ts`（追加 2 个 registerCommand + 2 个 registerShortcut）
- **依赖变更**: 无（复用 Change 1 的 better-sqlite3 和 typebox）
- **可逆性**: Change 2 的功能可单独禁用（移除命令注册即可），不影响 Change 1 的 tool 能力
- **冲突评估**: `/sb` 和 `/sr` 不与任何已注册命令冲突；`setEditorComponent` 未被任何其他扩展使用

## 关联绑定

- 关联 binding: `binding.md`
- 关联 Change 1: `openspec/changes/session-browse-core/` — 本 change 的所有技术底座
