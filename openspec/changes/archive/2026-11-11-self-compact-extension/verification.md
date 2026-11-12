# Verification

## 结论

PASS（静态 + 单元 + 运行时加载/流程模拟）

- 72 项单元断言全部通过（`node --test`，12 个 suite）
- `tsc --noEmit --strict` 对 8 个源文件零错误
- 真实 ESM 加载 + 假 `pi` API 下完成 22 项注册，自去重守卫生效
- 端到端流程模拟通过：`turn_end` 水位判定 → `self_compact` 落盘 → `ctx.compact(customInstructions)` → `session_compact` → Handoff 投递 → 解锁与恢复回合放行
- 仓库 settings：`repo-settings-unchanged`（本次未改动 `.pi/settings.json`）
- 全局 sync：见文末「收尾状态」

## 1. Spec → 实现映射

| Requirement（`specs/self-compact/spec.md`） | 实现位置 | 验证方式 |
|---|---|---|
| `Extension Self-Deduplication and Coexistence with SoL-Pi` | `index.ts` 顶部 `globalThis[Symbol.for("pi.self-compact.loaded")]` 守卫；`.pi/managed/sol-pi.json` `onlineContextCompact: false` | 加载模拟中二次调用 `mod.default(pi)`，注册数保持 22 不变 |
| `Three-Tier Percentage Watermark and Configuration Precedence` | `thresholds.ts`：`parseSpec` / `computeThresholds` / `checkThresholds` / `loadConfig` | 单测：10%/20%/+10% → 20k/40k/60k、90% 截断、inverted 拒绝、四层优先级合并顺序 `builtin < managed < global < project < flag` |
| `Native Jev System One Semantic Boundary Gating` | `jev-client.ts`（`auto`/`typesafe`/`openrouter`/`mock`、429/502/503/529 重试、超时）、`boundary-gate.ts` `extractCompactState` / `boundaryQuestions` / `decideTier` / `evaluateBoundary` | 单测：4 问真值表（`mid_operation > 0.6` 静默、`switched_gears`/`at_boundary` 触发、`needs_history=high` 抑制、Jev 不可用/抛错降级 watermark、notice 不重复） |
| `Dual Tool Contract (view_context and self_compact)` | `index.ts` 两个 `registerTool`；`handoff.ts` `validateHandoff` / `NOTE_MAX_CHARS` / `renderHandoffCard` / `renderHandoffMessage`；`tool_call` 整批守卫；`terminate: true` | 加载模拟中实际调用 `view_context`（输出水位/材料/jev 状态），`self_compact` 校验失败返回 `isError`、成功返回 `terminate: true` 并写入 `phase: pending` |
| `Dynamic Cut-Point Selection and Native Compaction Summary Augmentation` | `boundary-gate.ts` `extractTurnSummaries` / `cutPointQuestions` / `pickCutPoint`；`handoff.ts` `SUMMARY_INSTRUCTIONS` | 单测：`turns >= 3` 才询问、落点为第一轮/前缀未完/概率 < 0.5 一律放弃；流程模拟断言 `customInstructions` 含结构化大纲 |
| `Persistent Compaction State Machine and Crash Recovery` | `state.ts` `recoverState` / `hasCompactionMaterial` / `findCutPointLocal`；`index.ts` `session_start` / `session_tree` / `agent_settled` / `session_compact_failed` | 单测：12 个恢复场景（deliver / resume / done / retry / abandon / 未知版本 / stale lock / state-after-compaction）+ 6 个可压缩材料场景 |
| `TUI Status Integration and Slash Commands` | `context-bar.ts` `renderContextBar` / `formatStatus` / `renderInfoPanel`；`index.ts` `ctx.ui.setStatus("self-compact", …)`，全程未调用 `setFooter` | 单测：20 格定宽、`#`/`=`/`-` 分段、`~`/`!`/`|` 标记覆盖填充、status 文案；命令注册模拟中 `/self-compact-info`、`/self-compact-now` 均注册成功 |
| `Capability Manifest and Documentation Governance` | `.pi/capabilities.yaml`（`global.extensions` / `global.files` / `global.env`）、`README.md`、`docs/getting-started.md`、`CONTEXT.md` | YAML 解析校验 + 条目计数比对 |

## 2. 单元测试

```bash
$ node --test .pi/extensions/self-compact/test/self-compact.test.ts
ℹ tests 72
ℹ suites 12
ℹ pass 72
ℹ fail 0
ℹ duration_ms 96.4
```

覆盖范围：阈值解析与截断（6）、用量提取（4）、配置分层（2）、Jev 客户端（6）、边界门控（8）、切割点（9）、Handoff（7）、状态恢复（12）、投递转换（4）、可压缩材料（6）、进度条与状态（6）、mock 形状（2）。

> 说明：`state.ts` 的 `hasCompactionMaterial` 接受注入的 `findCutPoint`；生产路径由 `index.ts` 注入 Pi 原生实现，单测使用同语义的本地实现 `findCutPointLocal`，因此测试不需要 Pi 运行时。

## 3. 类型检查

```bash
$ tsc --noEmit --strict -p <tmp tsconfig，pi 1.5.2 类型 + typebox 类型>
（无输出，exit 0）
```

覆盖 `index.ts`、6 个子模块与测试文件；`registerTool` / `on(...)` / `ctx.compact` / `AgentToolResult.terminate` / renderer 签名全部与真实 Pi 1.5.2 类型对齐。

## 4. Pi 加载与流程模拟

在 `/tmp` 下以真实 ESM（Node 24 type stripping）+ 符号链接的 Pi 1.5.2 `node_modules` 加载扩展，用假 `pi` 对象捕获注册与消息：

```text
default export type: function
registrations: 22
registerFlag:compact-soft-at / compact-at / compact-buffer / compact-prompt
registerTool:view_context / self_compact
on:tool_call, session_start, session_tree, session_shutdown, model_select,
   turn_start, turn_end, context, message_end, agent_end, agent_settled,
   session_before_compact, session_compact, session_compact_failed
registerCommand:self-compact-info / self-compact-now
dedup guard set: true
registrations after second load: 22   # 自去重生效
```

流程模拟（21k/200k 与 130k/200k 两个水位）：

```text
GUIDANCE: self-compact notice: context is at 10.5% (21k / 200k tokens). Soft watermark 10%, recommend at 20%, forced at 30%.
VIEW: compaction material: yes | phase: pending
TERMINATE: true
NOTIFY: self-compact: compacting (agent idle).
COMPACT CALLS: 1
CUSTOM INSTRUCTIONS CONTAINS OUTLINE: true
HANDOFF HEAD: [self-compact · handoff · cycle 1]
HANDOFF HAS NOTE: true
```

## 5. 已知实现约束

- `session_before_compact` 的返回值类型只有 `{ cancel, compaction }`，没有 `customInstructions` 字段。因此切割点与结构化摘要要求是在调用 `ctx.compact({ customInstructions })` 时注入的（`event.customInstructions` 由 Pi 传入钩子作为只读输入）。`session_before_compact` 负责拦截未授权自动压缩并记录阶段。
- `ctx.ui.setFooter()` 全程未调用，状态通过 `ctx.ui.setStatus("self-compact", …)` 输出，与 `pi-powerline` 共存。

## 6. 收尾状态

- 仓库 settings 结局：`repo-settings-unchanged`
  - 本次未修改 `.pi/settings.json`；能力通过 `.pi/capabilities.yaml` 与 `.pi/extensions/` 声明
- 全局 sync 结局：`global-sync-completed`
  - 用户在复核通过后明确确认执行归档、提交与 `./scripts/sync-pi-agent.sh` 全局配置同步
  - 同步运行时副本：`~/.pi/agent/extensions/self-compact/`、`~/.pi/agent/self-compact.json`、`~/.pi/agent/sol-pi.json`
- 文档同步：`README.md`、`docs/getting-started.md`、`CONTEXT.md`、`.pi/capabilities.yaml` 已更新

## 7. Peer review 修复轮（t14 → t15）

### Bug 1：投递后未解锁（已修复）

原实现：`deliverHandoff` 与 `message_end` 都写 `phase: "ready", locked: true`，`unlock()` 从未被调用。后果：恢复后的回合（a）仍收到 FORCED_PROMPT，（b）所有工具被拦截，（c）`agent_settled` 反复重发同一张卡片。

修复：
- `state.ts` 新增纯转换 `unlocked(state)`（`phase: "done"`, `locked: false`, 清 `error`）与 `handoffInFlight(state)`、`shouldBlockTools(state, level, hasMaterial)`
- `deliverHandoff` / `resumeHandoff` / `message_end`(HANDOFF_TYPE) 一律调用 `unlock(ctx)`，同时重置 `noticedLevel`、`decision`
- `trackLevel`、`guidanceText`、`agent_end`、`tool_call` 统一改用 `handoffInFlight`
- 新增 `forceArmed`：一次交接完成后解除强制锁，直到用量真正回落到 forced 以下才重新武装。否则「压缩后用量仍在 forced 之上」会无限索要新卡片

验证（流程模拟）：
```text
1 terminate: true | phase: pending | locked: true
2 compaction started: true | phase: compacting
3 handoff messages: 1 | phase: done | locked: false
4 guidance in resumed turn: null
5 tool allowed after delivery: true
6 no re-delivery: true
7 rearms and speaks again at 22.5%: "self-compact recommend: ..."
8 second cycle works: true | cycle: 2 | attempts: 0
```

### Bug 2：recoverState 在 `phase: "ready"` 时失效（已修复）

原实现只在 `state entry 之后` 搜索 compaction，而 `session_compact` 的 state entry 就写在 compaction 之后，导致 `compactionIndex = -1`、`ready` 既不 deliver 也不 unlock。

修复：`recoverState` 改为在整条分支上取最新 compaction，再按「compaction 之后是否存在 handoff 消息 / 其后是否有 assistant 回复」判定 deliver / resume / done；`phase === "done"` 直接返回；无 handoff 的残留锁走 `unlock`。

验证（流程模拟，state entry 均位于 compaction 之后）：
```text
state-after-compaction, no card → deliver: messages=1 | head=[self-compact · handoff · cycle 1]
state-after-compaction, card unanswered → resume: messages=1 | head=[self-compact · resumed · cycle 1] ...
state-after-compaction, card answered → noop + done: messages=0 | head=-
```

### 小缺口（已修复）

- `session_tree` 现在与 `session_start` 共用 `resumeFromRecovery`，消费 `deliver / resume / retry`
- `parseSpec` 支持 `100k` / `1m` / `32K` / `0.5k` 后缀（对齐 `design.md` §3），保留 `10%` 与裸整数
- 重试计数改为只由 `session_compact_failed` 递增（`ctx.compact` 的 `onError` 只记录日志），避免一次失败消耗两次配额；新周期 `attempts` 从 0 起算

### 复核结论（t14，peer review 第二轮）

PASS。72/72 单元测试通过，`openspec validate self-compact-extension` 校验通过；4 项修复（投递后 `unlock` + `forceArmed`、state-after-compaction 恢复、`session_tree` 恢复派发、`parseSpec` 单位后缀）与本节记录均已核实无误。最终验收汇报与全局同步确认由 t14 向用户完成。
