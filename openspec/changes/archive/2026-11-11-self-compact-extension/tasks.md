# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 核对 `specs/self-compact/spec.md` 与 `design.md` 中的模块职责、接口签名与参考实现路径（`/Volumes/Shuttle/projects/data/dan-repo/self-compact-pi-agent` 与 `/Volumes/Shuttle/projects/data/dan-repo/ten-levels-of-jev`）
- [x] 1.2 更新 `.pi/managed/sol-pi.json` 将 `"onlineContextCompact"` 设为 `false`，并创建 `.pi/managed/self-compact.json` 默认托管配置（`softAt: "10%"`, `at: "20%"`, `buffer: "10%"`, `hardCeilingPercent: 90` 及 `jev` 配置块）—— 覆盖 Requirement: `Extension Self-Deduplication and Coexistence with SoL-Pi` & `Three-Tier Percentage Watermark and Configuration Precedence`

## 2. 核心实现任务（`.pi/extensions/self-compact/`）

- [x] 2.1 实现 `.pi/extensions/self-compact/thresholds.ts`：支持分层配置加载（CLI flags > `<cwd>/.pi/self-compact.json` > `~/.pi/agent/self-compact.json` > `.pi/managed/self-compact.json` > 内置默认）、百分比与 Token 字符串解析（`parseSpec`）、90% 硬上限截断（`computeThresholds`）、上下文用量与缓存 Token 提取（`extractUsage`）及水位线检查（`checkThresholds`）—— 覆盖 Requirement: `Three-Tier Percentage Watermark and Configuration Precedence`
- [x] 2.2 实现 `.pi/extensions/self-compact/jev-client.ts`：实现零外部依赖的 `JevClient`，支持 `auto` / `typesafe`（`TYPESAFE_API_KEY` → `https://api.typesafe.ai/v1/systemone`, `jev-latest`）/ `openrouter`（`OPENROUTER_API_KEY` → `https://openrouter.ai/api/alpha/decisions`, `~typesafe/jev-latest`）/ `mock`（测试回调），包含 `AbortSignal.timeout` 超时控制与 `429/502/503/529` 瞬态重试 —— 覆盖 Requirement: `Native Jev System One Semantic Boundary Gating`
- [x] 2.3 实现 `.pi/extensions/self-compact/boundary-gate.ts`：
  - 实现 `extractCompactState(entries)` 与 `evaluateBoundary(client, state, usage, thresholds, alreadyNoticed)`：发送 4 个 Typed Questions（`switched_gears`、`at_boundary`、`needs_history`、`mid_operation`），按真值表输出 `silent | notice | recommend` 及原因，并在 Jev 不可用或超时时降级至纯百分比水位判定 —— 覆盖 Requirement: `Native Jev System One Semantic Boundary Gating`
  - 实现 `extractTurnSummaries(entries)` 与 `pickCutPoint(client, turns, minConfidence)`：在 `turns.length >= 3` 时发送 companion `noul`（`has_completed_prefix`）与 `choice`（`live_from`），返回动态切割点指令 —— 覆盖 Requirement: `Dynamic Cut-Point Selection and Native Compaction Summary Augmentation`
- [x] 2.4 实现 `.pi/extensions/self-compact/handoff.ts`：定义 6 字段结构化交接 Schema（`goal`, `done`, `in_progress`, `decisions`, `preserved_refs`［含 `obs_xxx` 句柄］, `next_action`, 可选 `note`），实现参数校验、`NOTE_MAX_CHARS`（24,000）长度检查、`renderHandoffCard(params, cycle)` Markdown 卡片渲染、以及 Notice / Recommend / Forced / Summary 提示词模板渲染 —— 覆盖 Requirement: `Dual Tool Contract (view_context and self_compact)` & `Dynamic Cut-Point Selection and Native Compaction Summary Augmentation`
- [x] 2.5 实现 `.pi/extensions/self-compact/state.ts`：实现 `hasCompactionMaterial(entries, keepRecentTokens)`（基于 `estimateTokens` 与 `findCutPoint`）、`SelfCompactState` 持久化结构（`pending | compacting | ready | done | failed`）与 `recoverState(entries)` 四类断点恢复（压缩落盘未发 Handoff、Handoff 已发未回复、压缩中断重试 `MAX_RETRIES = 2`、`/tree` 分支切换）—— 覆盖 Requirement: `Persistent Compaction State Machine and Crash Recovery`
- [x] 2.6 实现 `.pi/extensions/self-compact/context-bar.ts`：实现 20 格进度条渲染器（`renderContextBar`，含 `#` 缓存、`=` 已用、`-` 剩余及 `~` / `!` / `|` 水位标记）与 `/self-compact-info` 详情面板格式化 —— 覆盖 Requirement: `TUI Status Integration and Slash Commands`
- [x] 2.7 实现 `.pi/extensions/self-compact/index.ts`：
  - 顶部添加 `globalThis[Symbol.for("pi.self-compact.loaded")]` 自去重守卫；
  - 注册 CLI flags（`--compact-soft-at`, `--compact-at`, `--compact-buffer`, `--compact-prompt`）；
  - 注册 `view_context` 与 `self_compact` 工具（含单工具调用检查与 `terminate: true`）；
  - 注册 `/self-compact-info` 与 `/self-compact-now` 命令；
  - 编排 `session_start`、`session_tree`、`turn_end`、`context`、`tool_call`、`agent_end`、`session_before_compact`（通过 `event.customInstructions` 注入结构化摘要要求与 `live_from` 切割点）、`session_compact` 钩子；
  - 使用 `ctx.ui.setStatus("self-compact", ...)` 更新状态栏，绝不调用 `ctx.ui.setFooter()` —— 覆盖全部核心 Requirements

## 3. 单元测试、清单与文档治理

- [x] 3.1 编写并运行 `.pi/extensions/self-compact/test/self-compact.test.ts`：覆盖百分比与 Token 阈值解析、90% 截断、Jev `mock` 下的 4 问题边界真值表（`mid_operation` 静默、`at_boundary`/`switched_gears` 触发、超时回退）、`pickCutPoint` 切割点选择、6 字段 Handoff 卡片渲染与长度校验、以及 `recoverState` 四场景崩溃恢复，确保测试全部通过
- [x] 3.2 更新 `.pi/capabilities.yaml`：
  - `global.extensions` 新增 `self-compact`
  - `global.files` 新增 `self-compact.json: managed/self-compact.json`
  - `global.env` 新增 `self-compact`（声明 `TYPESAFE_API_KEY`，`required: false`，说明支持 `OPENROUTER_API_KEY` 备选）—— 覆盖 Requirement: `Capability Manifest and Documentation Governance`
- [x] 3.3 按 `docs/reference/readme-governance.md` 更新 `README.md`、`docs/getting-started.md` 与 `CONTEXT.md` 中的扩展能力描述与索引

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现与测试运行结果生成 `verification.md`（覆盖 spec-to-implementation、单元测试输出、Pi 启动无冲突加载验证，并按 `docs/pi-change-closeout-governance.md` 向用户确认是否执行 `scripts/sync-pi-agent.sh` 全局同步）
- [x] 4.2 基于 `verification.md` 结论生成 `writeback.md`（定义 `CONTEXT.md` 与 `repo://orbitos/20_项目/Pi_Config/Pi_Config.md` 的回写摘要）
- [x] 4.3 执行 `writeback.md` 中定义的回写目标，并记录可审计证据
