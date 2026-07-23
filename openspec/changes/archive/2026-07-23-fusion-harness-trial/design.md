# Design

## Context

`specs/fusion-harness-trial/spec.md` 定义了 5 个 ADDED Requirements：scratch 隔离、upstream 优先、契约路径指针注入、全阶梯试跑、价值评估驱动。本设计说明如何落地这些 requirement，以及 grilling 11 轮中确认的关键技术取舍。

执行上下文：my-wiki 已有完整 ingest 工作流（lecture-ingest skill + 四维 governance checker），且已有 IndyDevDan 讲座的 ground truth digest，是天然的 trial 对象。upstream fusion-harness 提供 `--architect-system-prompt <path>` / `--builder-system-prompt <path>` 与 `--architect` / `--builder` 模型覆盖 flag，原生支持不改代码注入契约与切换模型。

## Goals / Non-Goals

**Goals:**

- 用最小工程代价（不重实现、不正式引入、不改主仓）跑一次完整 value ladder，拿到三轴评估证据
- 验证 sovereign 模型对（deepseek + glm）在 clean-room spawn 下能正常工作（provider 兼容性）
- 验证 fusion 在 markdown ingest 场景的真实价值上限（Y 路径：全自由产结构，测试模型间视角差异）

**Non-Goals:**

- 不验证 opinion 能否替代 grilling 锁结构（grilling 是人为制造差异化视角，与 fusion 视角差异命题正交）
- 不优化 gate 形式（Q3 声明式 YAML gate 冻结，trial 用 Dan Python gate）
- 不实现语义层验证（纯 b gate 覆盖边界：结构 + claim 存在性 + wikilink；语义质量仍靠人工 review）
- 不做两栏实时流式渲染（接受 artifacts 落盘 + 事后对比，放弃 opinion 阶段的实时并排观赏性）

## Decisions

1. **集成架构 = I（upstream 优先）**：vendor Dan 框架原样跑，靠 flag 注入。否决 II（原生 subagent 重实现，造轮子）与 III（hybrid，复杂度叠加）。理由：用户明确「最小代价先验证价值，不造轮子」。

2. **builder 角色从 raw 产（Y 路径）**：builder 不消费任何「结构 spec」，opinion 给的方向是全部输入。理由：控制变量（X 路径）会消融要测的视角差异；Y 直接测「不同模型对比 ingest 的结果是否收敛」这个更基础的命题。

3. **契约注入 = 路径指针（非拼装）**：system prompt 只放文件路径，子 agent 用 `read` 按需加载。理由：grilling 中纠正了「clean-room 子 agent 看不到 skill」的误判——`--no-skills` 只关自动发现，不阉割 `read` 工具；skill 文件在磁盘上随时可读。

4. **模型对 = sovereign workhorse**：architect=deepseek-v4-pro，builder=glm-5.2。理由：跨 provider（DeepSeek + Zhipu）= 真视角差异，不路由到 Anthropic/OpenAI（sovereign AI 方向一致）。

5. **cwd = my-wiki**：fusion session 在 my-wiki 启动，使相对路径 `read` 命中。scratch 只放 harness clone。

6. **gate 形式冻结（Q3）**：trial 用 Dan 原生 Python `gate.py`，声明式 YAML gate 延后。理由：先证明 loop 价值，再优化 gate 格式。

## Risks / Migration

**Risks:**

- **R1 provider 兼容性（已识别，有缓解）**：`deepseek` / `kimi-coding` 未在 `~/.pi/agent/models.json` 全局注册（provider 定义来源不明，可能来自 package/catalog）。clean-room 子进程（`--no-skills --no-extensions`）spawn 时若加载不到 provider 定义会解析失败。**缓解**：spec 已要求 `/system-prompt` + `/opinion hello` 预检；失败回退 glm-5.1 作 architect（同家族，视角差异减弱但 trial 仍可跑）。

- **R2 语义质量盲区（已接受的边界）**：纯声明/Python gate 查不了「可复述性 / 材料锚定」这类语义质量。auto-validate 覆盖结构 + claim 存在性，语义质量仍靠人工。若 trial 显示语义盲区是主要短板，价值确认后可在 Q3 解冻时引入 LLM-as-judge hook（b+hook 方案）。

- **R3 模型趋同导致 trial 无果**：Y 路径下若模型在 ingest 场景天然收敛，opinion/fusion 轴无增量。**这不是失败而是有效证据**——反证 grilling 的价值（人为制造差异化视角），且 auto-validate 轴仍可能独立成立（模型无关）。

**Migration:**

- **trial 价值不足**：scratch 弃用，零迁移成本；pi-config/my-wiki 未动。
- **trial 价值确认**：开启独立 change 走 `pkg-research`（评估 upstream）→ `pkg-fork-dev`（fork 注入 my-wiki 契约）正式引入 pi-config，届时处理 `capabilities.yaml` 回写与 Q3 gate 形式升级。本 change 不承担引入工程。
