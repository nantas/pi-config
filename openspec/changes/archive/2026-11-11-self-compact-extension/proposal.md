# Proposal

## 问题定义

在复杂长程工程任务中，主力大模型（如 Claude Opus、GPT-6 Astra 等具备 1M 上下文窗口但单 Token 与缓存重建成本高昂的模型）面临三类上下文退化与成本失控问题：

1. **被动溢出压缩与目标漂移**：Pi 原生自动压缩仅在上下文逼近模型窗口极限时触发，且完全由外部黑盒摘要器裁决保留内容。主 Agent 无法主动交代当前进展、已验证结论、关键文件路径及下一步精确动作，压缩后极易丢失推理主线或重复已完成工作。
2. **机械阈值切分打断半途操作**：单纯按 Token 阈值提醒或触发压缩时，无法感知 Agent 当前是否正处于“编辑文件 → 运行测试 → 定位报错”的原子操作半途（`mid_operation`）。盲目打断或压缩会破坏工作现场，而在已经翻篇的早期探索回合与当前活跃任务之间也缺乏动态切割点（`live_from`）。
3. **与 `SoL-Pi` 在线压缩的生命周期冲突**：当前仓库通过 `.pi/managed/sol-pi.json` 启用了 `SoL-Pi` 的 `onlineContextCompact: true`。其内部通过 `turn_end`、`agent_settled`、`session_before_compact` 与 `context` 钩子自动围绕 `update_plan` 触发压缩，若直接引入自压缩扩展，双方会在 `session_before_compact` 和 `agent_settled` 上相互抢占或锁死。

因此，需要为 `pi-config` 构建一套专为高能力高成本模型设计的自压缩管理扩展 `self-compact`：将 `SoL-Pi` 收敛为底层的「单条大观测减重层」（保留 `observationPack`、`evidencePreservingReducer`、`actionFusion`，关闭 `onlineContextCompact`），由 `self-compact` 结合 TypeSafe **Jev（System One 决策模型）** 负责顶层的「三档百分比水位监控 + 语义边界门控 + 动态切割点选择 + 结构化交接（Structured Handoff）与崩溃恢复续跑」。

## 范围边界

### 包含范围（In Scope）

1. **`SoL-Pi` 职责边界调整**：
   - 更新 `.pi/managed/sol-pi.json`，将 `onlineContextCompact` 设为 `false`，保留 `actionFusion: true`、`observationPack: true`、`evidencePreservingReducer: true`，使 `SoL-Pi` 专注于大工具结果句柄化（`obs_xxx` / `obs_recall`）与长日志压缩，不再抢占会话压缩权。
2. **`self-compact` 扩展核心实现（`.pi/extensions/self-compact/`）**：
   - **扩展自去重（Self-Deduplication）**：通过 `globalThis[Symbol.for("pi.self-compact.loaded")]` 防止在 `pi-config` 仓库内同时加载全局与项目级副本时重复注册工具、命令、CLI flags 与事件钩子。
   - **纯百分比三档水位线与配置体系**：默认 `softAt: "10%"`（Notice）、`at: "20%"`（Recommend/Warning）、`buffer: "10%"`（对应 `forced: 30%`，硬上限 `90%`），并校验 `hasCompactionMaterial`（超出 Pi 的 `keepRecentTokens` 保留区）；支持 `.pi/managed/self-compact.json`（同步至 `~/.pi/agent/self-compact.json`）、项目级 `.pi/self-compact.json` 以及 CLI flags（`--compact-soft-at`、`--compact-at`、`--compact-buffer`、`--compact-prompt`）按优先级覆盖。
   - **Jev System One 语义门控引擎**：
     - 内置零外部运行时依赖的 `JevClient`（优先使用 `TYPESAFE_API_KEY` 请求 `https://api.typesafe.ai/v1/systemone` 的 `jev-latest` 模型；备选 `OPENROUTER_API_KEY` 请求 `https://openrouter.ai/api/alpha/decisions` 的 `~typesafe/jev-latest`；支持 `mock` 模式供确定性测试）。
     - 在 `[softAt, forced)` 水位区间且存在可压缩材料时，于 `turn_end` 发送单次 4 问题决策请求（`switched_gears`、`at_boundary`、`needs_history`、`mid_operation`）。当 `mid_operation > 0.6` 或未处于任务边界时保持静默（`silent`），避免打断半途操作；当处于边界时在 `context` 钩子注入对应档位的 transient 提醒消息；Jev 请求超时或失败时降级为按纯百分比水位注入提醒，绝不阻塞主流程。
     - 当水位达到或超过 `forced`（默认 `30%`）时跳过 Jev，直接在 `tool_call` 钩子拦截除 `self_compact` 与 `view_context` 之外的所有工具调用，强制 Agent 立即交接。
   - **双工具契约与结构化交接（Structured Handoff）**：
     - `view_context`：返回实时 Token 用量、百分比、缓存 Token、三档水位线余量、当前压缩周期（`cycle`），并在传入 `check_boundary: true` 或处于阈值区间时返回 Jev 边界诊断详情。
     - `self_compact`：接收强类型 6 字段结构化交接参数（`goal`、`done`、`in_progress`、`decisions`、`preserved_refs`［含文件路径与 `SoL-Pi` 的 `obs_xxx` 句柄 ID］、`next_action` 及可选 `note`），强制单工具独立调用（同批混调其他工具时整批拒绝）并以 `terminate: true` 结束当前回合；压缩完成后将结构化交接渲染为 Markdown Handoff 卡片，通过 `pi.sendMessage(..., { triggerTurn: true })` **逐字原样发回**并自动触发下一回合续跑。
   - **Jev 动态切割点（`live_from`）与原生摘要指令增强**：
     - 在 `session_before_compact` 阶段拦截非授权自动压缩；对合法交接压缩或用户手动 `/compact`，调用 Jev（结合 companion `noul` `has_completed_prefix` 与 `choice` `live_from`）定位当前活跃工作的起始用户回合，将「结构化摘要大纲 + `live_from` 切割点保留指令 + 禁止复述 Handoff 卡片」注入 `event.customInstructions`，复用 Pi 原生压缩器安全生成摘要。
   - **持久化状态机与四类崩溃恢复**：
     - 使用 `self-compact-state` 与 `self-compact-handoff` 自定义会话条目持久化 `pending → compacting → ready → done`（含 `failed` 限次重试）状态机，在 `session_start`、`session_tree` 与 `agent_settled` 处理进程中断、压缩完成未投递 Handoff、Handoff 已投递未响应、分支切换四类恢复场景。
   - **TUI 状态呈现（与 `pi-powerline` 共存）与斜杠命令**：
     - 使用 `ctx.ui.setStatus("self-compact", ...)` 展示紧凑状态，不调用独占的 `ctx.ui.setFooter()`；提供 `/self-compact-info`（弹出 20 格进度条、水位线与最近一次 Jev 评估详情）与 `/self-compact-now` 命令。
3. **清单、环境变量与文档治理**：
   - 更新 `.pi/capabilities.yaml`（`global.extensions`、`global.files`、`global.env`）、`CONTEXT.md`、`README.md` 及 `docs/getting-started.md`。

### 不包含范围（Out of Scope）

- 不修改 `SoL-Pi` 上游仓库代码（仅通过托管配置 `.pi/managed/sol-pi.json` 调整开关）。
- 不接管或重写 Pi 内部的 `<conversation>` 字符串拼装与 `generateSummary` 底层调用（统一通过 `event.customInstructions` 扩展，保证跨 Pi 版本升级的稳定性）。
- 不调用 `ctx.ui.setFooter()` 替换全局底栏，保持 `pi-powerline` 完整可用。

## Capabilities

### New Capabilities
- `self-compact`: 基于三档百分比水位线、Jev System One 语义边界门控与动态切割点的智能体自压缩与结构化交接续跑扩展

### Modified Capabilities
（无独立修改的既有 capability spec；对 `.pi/capabilities.yaml` 与 `.pi/managed/sol-pi.json` 的配置变更均作为 `self-compact` 交付的一部分受既有清单治理规范约束）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（通过两轮设计树拷问确认 `self-compact` 的全部边界与交互契约）

## Impact

- **新增目录与文件**：
  - `.pi/extensions/self-compact/index.ts`（扩展入口、自去重守卫、生命周期钩子、工具与命令注册）
  - `.pi/extensions/self-compact/thresholds.ts`（百分比/Token 阈值解析、配置文件加载与水位线计算）
  - `.pi/extensions/self-compact/jev-client.ts`（TypeSafe / OpenRouter / Mock 的 Jev System One 客户端实现）
  - `.pi/extensions/self-compact/boundary-gate.ts`（4 问题语义边界评估 `evaluateBoundary` 与 `live_from` 切割点选择 `pickCutPoint`）
  - `.pi/extensions/self-compact/handoff.ts`（6 字段结构化交接校验、Markdown Handoff 卡片渲染与提示词模板渲染）
  - `.pi/extensions/self-compact/state.ts`（`self-compact-state` 持久化状态机、`hasCompactionMaterial` 检查与 4 场景崩溃恢复）
  - `.pi/extensions/self-compact/context-bar.ts`（20 格上下文进度条与 `/self-compact-info` 卡片渲染）
  - `.pi/extensions/self-compact/test/self-compact.test.ts`（覆盖阈值计算、Jev 门控真值表、切割点选择、Handoff 渲染与状态恢复的单元测试）
  - `.pi/managed/self-compact.json`（全局托管默认配置）
- **修改文件**：
  - `.pi/managed/sol-pi.json`（`"onlineContextCompact": false`）
  - `.pi/capabilities.yaml`（注册 `global.extensions: self-compact`、`global.files: self-compact.json`、`global.env: self-compact`）
  - `CONTEXT.md`、`README.md`、`docs/getting-started.md`

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`、`.pi/capabilities.yaml`、`.pi/managed/sol-pi.json`、`.pi/managed/self-compact.json`
  - 回写目标：`CONTEXT.md`、`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
