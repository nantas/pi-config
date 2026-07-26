# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `session-browse-command` 的 6 个 requirement 的实现边界
- [x] 1.2 确认 `session-resume-command` 的 6 个 requirement 的实现边界
- [x] 1.3 确认 Change 1 可用且 API 兼容（`search()`、`listRecent()`、`buildTurnFromEntryId()`、`formatTurn()`、`getDb()`）

## 2. 核心实现任务

### 2.1 browser.ts — /sb 命令

- [x] 2.1.1 实现 `doSearch(query)` — 调用 `indexer.search()`，格式化结果为编号列表（`[N] timestamp role | snippet`），限制最多 30 条
  - **覆盖**: spec `session-browse-command` → `sb-search-results`
  - **验证**: 搜索 "rate limit" 返回正确格式的编号列表

- [x] 2.1.2 实现 `showTurnPreview(entryId, sessionPath)` — 调用 `expander.buildTurnFromEntryId()` + `formatTurn()`，显示 USER + ASST text 上下文
  - **覆盖**: spec `session-browse-command` → `sb-result-selection`
  - **验证**: 输入编号后显示正确的 turn 上下文

- [x] 2.1.3 实现 `showRawEntry(entryId, sessionPath)` — JSONL 文件逐行 parse 或 HTML 调用 `readHtmlEntry()`，返回原始内容，支持截断
  - **覆盖**: spec `session-browse-command` → `sb-read-entry-from-expand`
  - **验证**: 输入 `r` 后显示完整的 toolResult 内容

- [x] 2.1.4 实现交互循环（`promptLoop(results)`）— 搜索 → 选编号 → 显示 turn → `[r]读原文 / [b]返回 / [q]退出`
  - **覆盖**: spec `session-browse-command` → `sb-result-selection`, `sb-back-to-results`
  - **验证**: 可从搜索结果进入 turn，再从 turn 返回结果列表

- [x] 2.1.5 实现无参数和报错处理 — 无参数时显示使用提示；索引未就绪时自动触发 `updateIndex()`；entry 未找到时报友好错误
  - **覆盖**: spec `session-browse-command` → `sb-search-no-query`, `sb-error-handling`, `sb-index-not-ready`
  - **验证**: `/sb` 无参数显示帮助；先 `/sb` 后自动索引

### 2.2 resumer.ts — /sr 命令

- [x] 2.2.1 实现 `listRecentSessions()` — 调用 `indexer.listRecent()`，格式化显示 `[N] project | timestamp | first_user_message[:60]`
  - **覆盖**: spec `session-resume-command` → `sr-list-recent-sessions`
  - **验证**: `/sr` 显示最近 session 的编号列表

- [x] 2.2.2 实现 `resumeBySelection()` — 用户输入编号后验证路径存在且为 JSONL，调用 `ctx.commandContextActions.switchSession()`
  - **覆盖**: spec `session-resume-command` → `sr-resume-by-selection`, `sr-resume-jsonl-only`
  - **验证**: 选择 JSONL session → 成功恢复；选择 HTML → 提示不支持

- [x] 2.2.3 实现无 session 时报错处理 — 索引空时显示引导信息
  - **覆盖**: spec `session-resume-command` → `sr-no-indexed-sessions`, `sr-error-handling`
  - **验证**: 首次使用无索引时显示友好提示

### 2.3 index.ts 追加注册

- [x] 2.3.1 追加 `registerCommand("sb", { ... })` — handler 委托到 `browser.ts` 的 `handleSbInput()`
  - **覆盖**: spec `session-browse-command` → `sb-command-registration`
  - **验证**: 加载后 `/sb` 可用

- [x] 2.3.2 追加 `registerCommand("sr", { ... })` — handler 委托到 `resumer.ts` 的 `handleSrInput()`
  - **覆盖**: spec `session-resume-command` → `sr-command-registration`
  - **验证**: 加载后 `/sr` 可用

- [x] 2.3.3 追加 `registerShortcut("Cmd+Shift+F", { handler })` — 预填充 `/sb ` 到输入框
  - **覆盖**: spec `session-browse-command` → `sb-keyboard-shortcut`
  - **验证**: `Cmd+Shift+F` 后输入框出现 `/sb `

- [x] 2.3.4 追加 `registerShortcut("Cmd+Shift+R", { handler })` — 触发 `/sr`
  - **覆盖**: spec `session-resume-command` → `sr-keyboard-shortcut`
  - **验证**: `Cmd+Shift+R` 后 `/sr` 执行

## 3. 收敛与验证准备

- [x] 3.1 整理验证检查点：`/sb` 搜索→展开→读取全流程、`/sr` 列 session→resume、快捷键、错误处理

## 4. 验证与回写收敛

- [x] 4.1 `pi -e .pi/extensions/session-browse/` 加载验证 — 无启动错误，`/sb` 和 `/sr` 注册成功
- [x] 4.2 `/reload` 热重载验证 — 无重复注册错误，命令仍然可用
- [x] 4.3 `/sb <query>` 端到端验证：搜索 → 编号选择 → turn 展开 → [r]原文 / [b]返回
- [x] 4.4 `/sr` 端到端验证：列 session → 编号选择 → 成功恢复
- [x] 4.5 快捷键验证：Cmd+Shift+F → `/sb` 预填充，Cmd+Shift+R → `/sr` 执行
- [x] 4.6 生成 verification.md
- [x] 4.7 生成 writeback.md
- [x] 4.8 执行回写（如需要）— 无需回写，`capabilities.yaml` 未变更
