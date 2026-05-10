# Design

## Context

`/sb` 命令当前使用 `ctx.ui.select()`（`ExtensionSelectorComponent`）作为唯一交互组件。该组件无 viewport 控制、无分页、无 overlay 能力。本次重设计基于 Pi extension API 提供的 `ctx.ui.custom()` 工厂方法，允许 extension 构建自定义 TUI 组件。

关键 API 确认（pi-mono 源码调研）：

- `ctx.ui.custom(factory)` → 给出 `(tui, theme, keybindings, done)` 回调，返回自定义 `Component`
- `@earendil-works/pi-tui` 导出 `SelectList`（带 viewport 滚动 + maxVisible 控制）、`Container`、`Text`、`Box`
- `SelectList` 内建 `maxVisible` + startIndex/endIndex viewport 计算 + `(N/total)` 滚动指示
- `SelectList.handleInput()` 原生支持 up/down/enter/esc，无 left/right
- 自定义组件的 `handleInput()` 可拦截任意按键（包括 left/right/space）
- `ctx.ui.setEditorText()` 在 `done()` 后仍可用（command handler 上下文未失效）

## Goals / Non-Goals

**Goals:**

- 两级交互：session 列表 → session 内命中列表，均使用 `SelectList` 分页
- Space 键切换 turn preview overlay（只读滚动）
- 增强格式：完整 user/assistant 文本 + tool call 单行参数摘要
- "Explore with agent" 操作：`setEditorText()` 注入定位 prompt
- 搜索排序加权：user/assistant 优先于 toolResult

**Non-Goals:**

- 不修改 LLM tools（session-search/expand/read）
- 不修改 `/sr` 命令
- 不修改 indexer 索引逻辑或 DB schema
- 不实现 `sendUserMessage` 或 `switchSession` 路径（仅用 `setEditorText`）
- 不修改 Pi 核心 `ExtensionSelectorComponent`

## Decisions

### D1: SessionBrowser 使用手动两行渲染（非 SelectList）

| 方案 | 优点 | 缺点 |
|------|------|------|
| SelectList（单行 item） | SelectList 内建导航 | 只能显示一行信息，路径长时看不到有效内容 |
| 手动两行渲染 | 显示项目名+时间+命中数 + 用户消息 | 需自己实现上下导航 |

**结论**: 手动两行渲染。第一行显示 `项目名 + 路径短名 + 时间 + 命中数`，第二行显示 `first_user_message（`compressSystemText` 压缩后，`truncateToWidth` 截断）`。

SessionBrowser 自己管理 selectedIndex/scrollOffset/keyboard navigation，不依赖 SelectList。

### D2: 组件结构

```
SessionBrowser (custom component, Level 1)
├── title: Text("Select a session")
├── sessionList: SelectList(items, maxVisible=8)
└── hints: Text("↑↓ navigate  Enter select  Esc cancel")

SessionHitBrowser (custom component, Level 2+3)
├── header: Text(session主题 + hit数)
├── hitList: SelectList(items, maxVisible=5)
├── pager: Text("Page 1/4 (1-5 of 17)")
├── hints: Text("←→ page  Space preview  Enter confirm  Esc back")
└── previewOverlay: TurnPreviewPanel (条件渲染)
    ├── turnText: Text[] (完整 turn 内容行)
    └── scrollOffset: number
```

### D3: Turn Preview 实现方式

| 方案 | 实现 | 优点 | 缺点 |
|------|------|------|------|
| `ctx.ui.editor()` 只读 | 现有 API | 简单 | 无法 Space 切换，破坏组件状态 |
| custom overlay (container 内切换) | `SessionHitBrowser` 内部切换渲染模式 | 保持状态，Space 无缝切换 | 需自行实现滚动 |

**结论**: 在 `SessionHitBrowser` 内部实现。preview 显示时，主区域从 `hitList + pager` 切换为 `TurnPreviewPanel`（Container + Text lines + scrollOffset），hints 行更新为 preview 操作提示。组件状态（当前选中项、页码）在整个过程中保持。

### D4: formatTurn — 紧凑格式（面向 LLM token 效率）

**变更原因**: 原始设计中的 `USER:` / `ASST:` 标签和 `│ ` 前缀对 LLM token 消耗较大，session-expand 工具输出约浪费 20% token。

实际实现改为紧凑格式：
```
U
<完整用户文本>
A
<完整 assistant 文本>
→ session-search(query="session browse UI interface")
A
<完整 assistant 文本>
→ session-expand(entry_id="fb879780", session_path="...")
```

规则：
- 角色标记 `U` / `A`（无冒号，无装饰）
- User 和 assistant 文本不截断
- tool call 渲染为 `→ name(param="value")`，截断到 60 字符
- toolResult entries 跳过
- 无文本无 toolCall 的 assistant entry 跳过（避免空 `A` 行）
- 标记间无空行分隔

### D5: 搜索排序与命中去重

命中数量改为按 turn 去重计数。原始 `COUNT(*)` 统计 FTS5 匹配的 entry 条数，同一 turn 内的多条匹配（user、assistant、toolResult 都命中）导致数字虚高。

实现：先在 `indexer.ts` 中用两个查询构建 `entry_id → turn_user_entry_id` 映射，再统计唯一 turn：

- 从 `entries` 表一次性获取该 session 所有 entry_id + role，按 line_number 排序
- 迭代构建映射：遇到 `role='user'` 记录当前 turn key
- 对 FTS5 搜索结果按 turn key 去重计数

effect：`searchGrouped("balatro")` 的 hit_count 从 575 → 54（90% 缩减）。

### D6: Explore with Agent prompt 模板

```
请帮我探索并总结一个历史 session turn 的信息。
使用 session-expand 和 session-read 工具定位并深入阅读。

定位信息:
- Session 文件: ${sessionPath}
- Entry ID: ${entryId}

请先用 session-expand(entry_id, session_path) 获取完整 turn 上下文，
根据需要用 session-read 读取关键细节，
然后给出这个 turn 涉及的主题、关键发现和结论的摘要。
```

用户按 Enter 后，agent 在当前 session 上下文中调用 session tools 自由探索。

### D7: project 名称简化

当前 `sessions.project` 值为 `--Users-nantas-agent-projects-pi-config--`（目录名）。
显示时提取最后一段有意义的路径段作为 project 名：`--Users-nantas-agent-projects-pi-config--` → `pi-config`。

```typescript
function extractProjectName(rawProject: string): string {
  // Remove leading/trailing dashes, take last meaningful segment
  const cleaned = rawProject.replace(/^--+|--+$/g, '');
  const segments = cleaned.split('--');
  return segments[segments.length - 1] || cleaned;
}
```

## Implementation-Discovered Decisions

The following decisions were made during implementation based on user testing and bug discovery.

### D8: 命中列表显示 entry 首行（替代 FTS5 snippet）

**问题**: FTS5 `snippet()` 返回匹配位置前后 32 字符的上下文，用户看到的片段是随机位置，不是 entry 开始内容。

**方案**: 在 `search()` SQL 中加 `substr(fts.content, 1, 200) as raw_content`，FTS5 存储了完整索引文本。提取首行作为 `first_line` 字段。

### D9: ESC 导航应为回退而非退出

**问题**: 单级 `await ctx.ui.custom()` 在 ESC 后 resolve undefined，`handleSbInput()` 直接 return 退出。

**方案**: 两级交互用 `while(true)` 包裹：
```
SessionBrowser → ESC → exit
SessionBrowser → select → SessionHitBrowser → ESC → continue → SessionBrowser
SessionHitBrowser → Enter → explore → return
```

### D10: 系统文本压缩（skill / prompts / 代码块）

**问题**: `<skill name="X">` 开头的完整 SKILL.md 内容、系统注入的 `> pi can help` 文档块、JSDoc 代码块占据显示空间。

**方案**: `compressSystemText()` 处理 4 种模式：

| 模式 | 检测 | 压缩结果 |
|---|---|---|
| Skill 展开 | `<skill name="X">` | `[skill:X]` |
| JSDoc 代码块 | `/**` 开头 | `[code block]` |
| 系统文档注入 | `> [a-z]` 开头 | `[system documentation]` |
| 系统状态消息 | `# [^a-zA-Z0-9]` 开头 | `[system info]` |

Preview 场景用 `compressWithUserText()` 变体：检出 system block 后，扫描后续行找到用户实际输入，追加在 `[skill:X]  …  [用户文本]` 后。

### D11: 所有文本截断使用可见宽度

**问题**: `.slice(0, N)` 按字符数截断，CJK 字符占 2 列可见宽度。一个 80 个中文字符的字符串实际占 160 列，超出终端宽度（121）导致 TUI 引擎抛异常。

**方案**: 所有渲染路径统一使用 `truncateToWidth(text, maxWidth, "")`（来自 `@mariozechner/pi-tui`）。

| 位置 | 原来 | 现在 |
|---|---|---|
| session 列表 msg | `.slice(0, 80)` | `truncateToWidth(..., width-4)` |
| session 列表 line1 | 无截断 | `truncateToWidth(..., width-4)` |
| hit 列表 snippet | `.slice(0, 80)` | `truncateToWidth(..., 78)` |
| preview 文本 | 无截断 | `truncateToWidth(..., availWidth)` |

## Risks / Migration

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `@earendil-works/pi-tui` 运行时包名是 `@mariozechner/pi-tui` | 编译时报 import 错误 | session-browse 已有的编译配置已处理此映射；确认 import 路径 |
| `SelectList` 的 theme 函数需要从 Pi runtime 获取 | 缺少 theme 导致显示异常 | 使用简化 inline theme 作为 fallback |
| turn preview 内容过长（>1000 行） | 渲染性能问题 | scrollOffset 增量渲染：只 render 可见行 |
| 用户从旧 `/sb` 交互迁移 | 操作习惯变化 | 新交互更直观（两级选择 + 空格预览），无需文档迁移 |
| `setEditorText` 注入的 prompt 被 Pi 当作 `/` 命令处理 | prompt 以非 `/` 字符开头，不会被误识别 | prompt 以中文开头，安全 |

---

### D12: session-iterate — 面向 Agent 的会话导航工具

**动机**: "Explore with agent" prompt 注入后，agent 只有 `session-expand` 和 `session-read` 两个工具可用，它们都锚定在单一 entry_id 上。agent 无法在会话时间线上按照 turn 边界步进，也无法获得全局结构，导致以下场景不可行：

> "请基于该 entry 向后探索，给出直到最终执行结果的总结"

agent 不知道上一/下一 turn 的 entry_id，无法增量推进，只能依赖 `session-search` 再查一次（低效且不精确）。

**方案**: 新增独立工具 `session-iterate`，支持在 session 时间线上按 turn 步进，并提供全局会话概览。

#### 接口

```typescript
interface SessionIterateParams {
  // 定位
  session_path: string;
  entry_id?: string;       // 首次由 session-browse 提供
  turn_index?: number;     // 替代 entry_id，直接用 turn 索引

  // 导航
  direction: "next" | "prev" | "start" | "end";
  steps?: number;          // 仅 next|prev，默认 1

  // 输出控制
  mode?: "full" | "summary";  // 默认 "full"
  max_chars?: number;         // full 模式文本截断
}
```

#### 导航语义

| direction | 行为 | steps 作用 |
|-----------|------|-----------|
| `next` | 从当前位置向前（更新时间方向）移动 | 控制步进的 turn 数 |
| `prev` | 从当前位置向后移动 | 控制步进的 turn 数 |
| `start` | 跳到第一个 turn | 忽略，始终到 0 |
| `end` | 跳到最后一个 turn | 忽略，始终到末尾 |

`direction="end"` 是 token 优化的关键入口——一次调用即可让 agent 了解会话全貌，避免线性扫描。

#### 输出结构

```typescript
// 标准返回
{
  position: {                    // 标准化定位信息
    entry_id: string;            // 当前 turn 的 user entry_id（供下次 iterate 使用）
    turn_index: number;          // 0-based
    total_turns: number;
    is_first: boolean;
    is_last: boolean;
  },

  // mode="full" 时
  turn?: {                       // 完整 turn 上下文（同 session-expand 输出）
    user_text: string;
    entries: TurnEntry[];
  },

  // mode="summary" 时
  summary?: {
    user_text: string;           // 截断到 200 字符
    entries: Array<{             // 每个 assistant entry 的压缩摘要
      role: string;
      text_summary: string;      // assistant 文本前 200 字符
      tool_calls: string[];      // 工具名列表
    }>;
    total_text_chars: number;    // 该 turn 文本总长
    total_tool_calls: number;
  },

  session_overview: Array<{     // 始终包含全局会话概览
    idx: number;
    entry_id: string;
    user_text: string;           // 截断到 80 字符
  }>
}
```

`session_overview` 始终返回，让 agent 在任何 iteration 后都能看到全局地图。这反过来使 `session-search` 不再是探索的必需前提——agent 可以先 iterate 到某点，参考全局概览决定下一步去哪。

#### KV: Full vs Summary 模式使用场景

| 模式 | 适用场景 | Token 消耗（15-turn 会话） |
|------|---------|--------------------------|
| `direction="end", mode="summary"` | 快速了解会话全貌 → 再深读关键 turn | ~5K |
| `direction="next", mode="full"` | 逐 turn 深读（验证细节、审查代码变更） | ~75K（线性 15 次） |
| `summary` + 2-3 个 `full` | 最优混合策略 | ~18K |

#### 与现有 "Explore with Agent" 的集成

```typescript
// browser.ts — 增强后的 agent prompt
const prompt = [
  "请探索并总结一个历史 session 的内容。",
  "",
  "定位信息:",
  `- Session 文件: ${sessionPath}`,
  `- Entry ID: ${entryId}`,
  "",
  "工具使用建议:",
  `1. 先用 session-iterate(direction="end", mode="summary") 了解会话全局结构`,
  "2. 根据 session_overview 中的 turn 摘要，定位关键 turn",
  `3. 用 session-iterate(direction="next"|="prev", mode="full") 深读`,
  "4. 用 session-read 查看特定 toolResult 的完整输出",
  "5. 最后给出涵盖整个 session 的有结构总结",
  "",
  "提示: 优先用 direction=end 获取全局视角，再决定深入方向。",
].join("\n");
```

#### 实现方案

```python
# 核心算法（伪代码）

def session_iterate(params):
    db = get_db()

    # 1. 构建 turn 边界索引
    #    SELECT entry_id, line_number, role, has_text
    #    FROM entries WHERE session_path=? ORDER BY line_number
    #    → 扫描一次，标记每个 role=user 的 entry 为 turn 边界
    turns = build_turn_index(db, params.session_path)

    # 2. 定位
    if params.turn_index is not None:
        target = params.turn_index
    else:
        target = find_turn_for_entry(turns, params.entry_id)

    # 3. 导航
    if params.direction == "start":   target = 0
    elif params.direction == "end":   target = len(turns) - 1
    elif params.direction == "next":  target = min(target + steps, len-1)
    elif params.direction == "prev":  target = max(target - steps, 0)

    # 4. 构建 turn（复用 expander.ts buildTurnFromEntryId）
    turn = build_turn_at_index(db, turns[target].entry_id, params.session_path)

    # 5. 格式化
    result = { "position": {...}, "session_overview": [...] }
    if mode == "full":
        result["turn"] = formatTurn(turn)          # 现有 formatTurn
    else:
        result["summary"] = formatTurnSummary(turn) # 新增函数

    return result
```

#### HTML 兼容

零额外改动。`indexer.ts` 已经将 HTML session 解析为统一格式写入 `entries` 表，`buildTurnFromEntryId` 已处理 HTML 分支。`session-iterate` 完全基于 SQLite 查询，不接触文件格式。

#### 边界情况

| 场景 | 行为 |
|------|------|
| `direction="prev"` 时已在 turn 0 | 停留在 turn 0，`position.is_first=true` |
| `direction="next"` 时已在最后一个 turn | 停留在末尾，`position.is_last=true` |
| `entry_id` 不存在于该 session | 返回错误 "entry not found in session" |
| `session_path` 不存在 | 返回错误 "session file not found" |
| 索引未构建（`ensureIndexed` 未调用） | 自动触发 `ensureIndexed()` |
| `direction="start"` 时 session 为空 | 返回 `total_turns=0`，无 turn/overview |
| 超大 session（100+ turns） | `session_overview` 截断到前 80 个 turn；summary 模式控制单个 turn 输出
