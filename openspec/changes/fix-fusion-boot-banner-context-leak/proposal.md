# Proposal

## 问题定义

fusion-harness 扩展在 TUI session 启动时（`session_start` + `reason === "startup"`）通过 `pi.sendMessage` 注入一条 `kind: "boot"` 的装饰性 banner 消息，其 `content` 字段为字面量字符串 `"FUSION HARNESS"`。

该 banner 的 renderer（`case "boot"`）完全不读取 `content` —— 标题、副标题、`● + ●` 图标全部在 renderer 内硬编码。但 pi 本体的 `convertToLlm`（`messages.ts`）会无条件把每条 `CustomMessage` 转成 `role: "user"`、`content: [{ text: m.content }]` 送入每次 LLM prompt；`display` 字段只控制 TUI 渲染，**不阻断上下文注入**。

结果：每个 TUI 新 session 的对话上下文首条都是孤立的 `[user]: FUSION HARNESS`。全局安装后，任何项目的每个新 session 都受影响。instruction-following 强的模型结合 footer 双 cell（ARCHITECT/BUILDER）与 4 个 `fusion_*` 工具描述，会把它解读为隐式环境指令，在用户未输入 `/fusion` 等 slash command 时也尝试自行发起双模型对比、建议对比格式或主动调用 fusion 工具。

根因是 fusion-harness 侧的 bug：把"仅供 renderer 用的大字标题"错误地塞进了会被注入上下文的 `content` 字段。

## 范围边界

- **本仓内（pi-config 治理）**：
  - 修复 fusion-harness fork clone 源码：boot banner 消息的 `content` 改为空字符串（renderer 不依赖 content，零显示损失）
  - 更新 `forks/manifest.yaml` 的 `changes_summary`
  - 新增 `fusion-harness-integration` 的 spec delta：Boot Banner 上下文卫生要求
- **不在范围内**：
  - 不修改 pi 本体（`messages.ts` 的 `convertToLlm` / `CustomMessage` 语义）
  - 不改 pi-config 能力表或全局 `settings.json`（package 源字符串不变）
  - 不改其他 panel（`prompt`/`fused`/`duo` 等）的 content 注入 —— 它们的 content 都是有语义的对话产物，进上下文合理
  - 不执行全局 `scripts/sync-pi-agent.sh`（源码修复随下次包刷新生效，延后）

## Capabilities

### New Capabilities

_(无)_

### Modified Capabilities

- `fusion-harness-integration`: 新增 Boot Banner 上下文卫生要求 —— TUI 启动装饰性 banner SHALL NOT 将无语义的装饰文本注入 LLM 上下文

## Capabilities 待确认项

- [x] 能力清单已确认（单一修改 `fusion-harness-integration`，新增一条 Requirement）

## Impact

- **行为**：消除每个 TUI 新 session 上下文首条的 `FUSION HARNESS` 噪音；不再误触发模型自主对比行为
- **显示**：零影响 —— boot banner 视觉效果完全不变（renderer 不读 content）
- **兼容性**：fork 内部改动，package 源字符串与分发形态不变；其他 panel / 命令不受影响
- **验证面**：fork clone 内验证 boot 消息 content 为空且 banner 仍正常渲染；pi 本体行为不变

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`openspec/specs/fusion-harness-integration/spec.md`、`openspec/specs/capability-manifest/spec.md`
  - 项目页：`forks/manifest.yaml`、fork clone 源码路径
  - 回写目标：fork 源码 + manifest（全局 sync 延后）
