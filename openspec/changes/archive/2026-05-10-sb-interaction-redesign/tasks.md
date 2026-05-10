# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `session-hit-browser` spec 中 6 个 requirement 的实现边界与依赖
  - session-list-level, session-hit-level, turn-preview-overlay, explore-with-agent-action, search-ranking-weighting, back-navigation
  - 依赖：`ctx.ui.custom()` API（Pi v0.74+）、`@mariozechner/pi-tui` SelectList 组件
- [x] 1.2 确认 `session-browse-command` spec 中 2 个 MODIFIED + 2 个 REMOVED requirement 的迁移影响
  - sb-search-results → 改为两级 custom 组件
  - sb-result-selection → 改为 paginated SelectList + preview overlay + explore action
  - REMOVED sb-read-entry-from-expand → 移除 showRawEntry() 调用
  - REMOVED sb-back-to-results → 移除 promptLoop 中的 back 按钮
- [x] 1.3 确认 `session-browse-turn-format` spec 中 2 个 MODIFIED requirement 对 expander.ts 的影响
  - turn-output-format → formatTurn() 重写（紧凑格式，面向 LLM token 效率）
  - turn-tool-call-one-line → 新增 formatToolCallSummary() 辅助函数

## 2. 核心实现任务

### 2.1 indexer.ts — 新增 searchGrouped() 与 search 增强

- [x] 2.1.1 新增 `SessionSearchGroup` 类型到 `types.ts`
  ```typescript
  interface SessionSearchGroup {
    session_path: string;
    project: string;
    session_ts: string;
    first_user_message: string;
    hit_count: number;
    best_rank: number;
  }
  ```
  - 验证：TypeScript 编译通过

- [x] 2.1.2 实现 `searchGrouped(query): SessionSearchGroup[]`
  - SQL：session_fts JOIN sessions，按 session_path GROUP BY，role 加权 (user×0.5, assistant×0.8, toolResult×1.0)
  - 按 best_rank 排序
  - 验证：对现有 DB 执行 `searchGrouped("session browse")` 返回 7 个 session 分组

- [x] 2.1.3 `searchGrouped()` hit_count 改为 turn 去重计数（BUG FIX）
  - 原始 `COUNT(*)` 统计 FTS 命中条数，同一 turn 多条匹配导致数字虚高
  - 改为：先用 `entries` 表构建 `entry_id → turn_user_entry_id` 映射，再对匹配结果按 turn 去重计数
  - 效果：`searchGrouped("balatro")` 从 575 条降至 54 个唯一 turn（90% 缩减）

- [x] 2.1.4 修改 `search(query, sessionPath)` 增加 role 排序加权
  - SQL：ORDER BY CASE role WHEN 'user' THEN rank*0.5 ... END
  - 验证：同一 session 内 user/assistant 条目排在 toolResult 之前

- [x] 2.1.5 `search()` 返回 entry 首行内容（BUG FIX）
  - 原来只返回 FTS5 `snippet()`（匹配位置附近 32 字），显示随机片段
  - 新增 `substr(fts.content, 1, 200) as raw_content` → 提取首行存入 `first_line`
  - 验证：hit 列表显示每个 entry 的第一行，而非匹配位置片段

### 2.2 expander.ts — formatTurn() 重写

- [x] 2.2.1 新增 `formatToolCallSummary(name: string, args: Record<string, unknown>): string`
  - 取第一个参数的 value，格式化为 `name(param="value")`
  - 截断到 60 可见字符
  - 无参数时返回 `name()`
  - 验证：单元测试覆盖长参数、无参数、多参数场景

- [x] 2.2.2 重写 `formatTurn(turn: TurnData): string`
  - 紧凑格式，面向 LLM token 效率：`U` / `A` 角色标记（无冒号），无 `│ ` 前缀，无空行
  - tool call 显示为一行 → name(param="value")
  - toolResult entries 跳过
  - **BUG FIX**：跳过无文本无 toolCall 的 assistant entry，消除空行

- [x] 2.2.3 新增 `extractToolCallArgs()`（内部函数）
  - 从原始 entry 的 content blocks 中提取 toolCall 参数
  - 支持 JSON 字符串和对象两种参数格式
  - 验证：参数提取覆盖 toolCall block 场景

### 2.3 types.ts — 新增辅助类型

- [x] 2.3.1 新增 `SessionSearchGroup` 接口
- [x] 2.3.2 新增 `HitPage` 辅助类型
  ```typescript
  interface HitPage {
    items: SelectItem[];
    page: number;
    totalPages: number;
    totalItems: number;
  }
  ```
  - 验证：TypeScript 编译通过

- [x] 2.3.3 修复 `ExtractedEntry` 缺失 `session_path` 字段
  - BUG FIX：indexer.ts 中使用 `entry.session_path` 但接口未定义

### 2.4 browser.ts — 完全重写

- [x] 2.4.1 实现 `extractProjectName(rawProject: string): string`
  - 去除首尾 `--`，取最后一段
  - `--Users-nantas-agent-projects-pi-config--` → `pi-config`

- [x] 2.4.2 实现 `SessionBrowser` 组件（Level 1：session 列表）
  - 使用 `ctx.ui.custom()` 工厂
  - **两行显示**：第一行 `项目名 + 路径短名 + 时间 + 命中数`，第二行 `first_user_message（缩进）`
  - 全部用 `truncateToWidth()` 按可见宽度截断（解决 CJK 显示溢出）
  - 手动管理上下导航：上/下键循环选择
  - 验证：path 短名提取正确，CJK 文本不溢出

- [x] 2.4.3 实现 `SessionHitBrowser` 组件（Level 2+3）
  - 使用 `ctx.ui.custom()` 工厂
  - 内嵌 `SelectList(hits, maxVisible=5)` + 左右翻页
  - Space 切换 preview overlay，↑↓ 滚动，PgUp/PgDn 翻页
  - 命中显示 `时间 role | 首行（system text 压缩后）`
  - 验证：支持长 turn（30+ 行）滚动

- [x] 2.4.4 实现 turn preview 内容生成
  - 调用 `buildTurnFromEntryId()` + `formatTurn()` 生成文本
  - **BUG FIX**: `compressWithUserText()` 压缩 system block 但保留用户输入文本（`[skill:X]  …  用户实际内容`）
  - 用户文本截断到 15 行，避免占据整个 viewport
  - 提示行随滚动百分比更新

- [x] 2.4.5 实现 "explore with agent" 操作
  - 在 `SessionHitBrowser` Enter 确认后，回到 command handler
  - 构建 agent prompt 模板（design D6）
  - 调用 `ctx.ui.setEditorText(prompt)`
  - 验证：setEditorText 后编辑器内容包含 session path、entry ID、工具使用指引

- [x] 2.4.6 移除旧代码
  - 删除 `showRawEntry()` 函数
  - 删除 `promptLoop()` 函数
  - 删除 `formatRawEntry()` 函数（browser.ts 中的副本）
  - 删除 `findJsonlEntry()` 函数（browser.ts 中的副本）
  - 验证：browser.ts 无残留的旧交互路径引用

- [x] 2.4.7 重写 `handleSbInput()` 主入口
  - 两级交互改为 `while(true)` 循环，ESC 在 hit list 回退到 session list
  - 去重：`deduplicateByTurn()` 从搜索结果中按 turn 去重
  - ensureIndexed() → searchGrouped() → SessionBrowser → search() → dedup → SessionHitBrowser → explore

- [x] 2.4.8 系统文本压缩（`compressSystemText()` + `compressWithUserText()`）
  - 处理四种模式：`<skill name="X">` → `[skill:X]`、`/** */` → `[code block]`、`> pi can help` → `[system documentation]`、`# 🏖️` → `[system info]`
  - 三个应用点：session 列表 msg、hit 列表首行、preview 用户文本
  - 预览场景用 `compressWithUserText()` 保留用户输入

### 2.5 index.ts — 新增 session-iterate 工具

- [x] 2.5.1 在 `types.ts` 新增 `SessionPosition`、`SessionIterateResult`、`TurnSummary` 接口
  - 新增 `SessionPosition`: entry_id, turn_index, total_turns, is_first, is_last
  - 新增 `TurnSummary`: user_text, entries[], total_text_chars, total_tool_calls
  - 新增 `SessionIterateResult`: position, turn?, summary?, session_overview
  - 新增 `TurnBoundary`: entry_id, line_number, user_text
  - 验证：TypeScript 编译通过

- [x] 2.5.2 在 `expander.ts` 新增 `buildTurnIndex()` 函数
  - 查询 `entries` 表按 `line_number` 排序，标记所有 role=user 的 entry 为 turn 边界
  - 返回 `TurnBoundary[]`（entry_id, line_number, user_text，截断到 200 字符）
  - 验证：对已知 session 返回正确 turn 数量和边界

- [x] 2.5.3 在 `expander.ts` 新增 `formatTurnSummary()` 函数
  - 输入 `TurnData`，输出 `TurnSummary`
  - user_text 截断到 200 字符
  - 遍历每个 assistant entry：提取文本前 200 字符作为 text_summary，提取 tool_names 列表
  - 验证：覆盖纯文本、纯 toolCall、混合三种场景

- [x] 2.5.4 在 `index.ts` 注册 session-iterate 工具
  - 注册为独立工具，name="session-iterate"
  - 参数：session_path, entry_id?, turn_index?, direction, steps?, mode?, max_chars?
  - 实现 execute() 逻辑：ensureIndexed() → 验证路径 → buildTurnIndex() → 定位 → 导航 → 构建 turn → 格式化输出（full/summary）→ session_overview → 返回
  - 验证：所有导航方向在测试 session 上正确

- [x] 2.5.5 更新 "explore with agent" prompt（browser.ts）
  - 在 prompt 中增加 session-iterate 工具的指引
  - 优先推荐 `direction="end"` 获取全局视角
  - 验证：setEditorText 注入后，prompt 包含 session-iterate 使用建议

## 3. 收敛与验证准备

- [x] 3.1 整理 spec-to-implementation 覆盖矩阵
  - session-hit-browser 6 个 requirement → 对应实现函数/组件
  - session-browse-command 2 MODIFIED + 2 REMOVED → 对应代码变更
  - session-browse-turn-format 2 MODIFIED → 对应 formatTurn 变更
- [x] 3.2 标记需要进入 verification 的检查点
  - TypeScript 编译通过
  - 所有旧交互路径已移除
  - 新交互流 End-to-End 闭环（需 runtime 验证）
  - LLM tools（session-search/expand/read）行为不变

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md
- [x] 4.2 生成 writeback.md
