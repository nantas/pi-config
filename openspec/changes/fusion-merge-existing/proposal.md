# Proposal

## 问题定义

fusion-harness 的三条命令 `/opinion` `/fusion` `/auto-validate` 各自独立跑出 `architect.md` + `builder.md` 后丢弃，`/fusion` 即使想 merge 同一个话题的已有答案，也**强制重跑 Stage 1**（`Promise.all([architect, builder])`），把已经付过费的两个 worker 再跑一遍。

这在实际工作流里造成三个痛点：

1. **token/时间浪费**：`/opinion "分析 X"` 已花了一次 worker 成本，紧接着 `/fusion "分析 X"` 又花一次，只为了拿到同样的两份答案再 merge——Stage 1 的产出和上次 opinion 的产出语义等价（同样的 prompt、同样的两个模型、同样的并行独立回答）。
2. **跨命令协作被阻断**：用户希望"先 opinion 看两列，再决定是否 fusion"——这是 fusion harness 最自然的工作流（opinion 做 A/B 探查，fusion 做收敛），但当前要么忍受重复跑，要么干脆不用 opinion 直接 fusion，二选一。
3. **fused 结论流转下游困难**：虽然 per-role persistent session 让 agent "记得"上下文，但 fused.md 这种**文件级产出**无法作为后续命令的直接输入——host agent 需要手动查路径、手动写进下一个命令的 prompt，没有约定化的"复用上次产出"机制。

根因：fusion harness 的 artifact（`.scratch/fusion-harness-<ts>/`）是**一次性、per-run、互不相通**的。run-index.jsonl（housekeep 引入）记了所有 run 的元数据，但没有任何命令消费它做"复用"。

## 范围边界

**在范围内**：

- `/fusion` 增加 **merge-only 模式**：通过 flag 指向一个已有 run 目录，跳过 Stage 1（重跑两个 worker），直接把该目录的 `architect.md` + `builder.md` 喂给 fuser，产出 `fused.md`。
- merge-only 模式的 **fuser prompt 复用**现有 `fuserPrompt` + `USER_PROMPT_FUSION_MERGE.md`——merge 逻辑一字不变，仅改变答案的**来源**（从"本次 Stage 1 产出"变为"指定目录读取"）。
- 路径解析约定：merge-only 输入支持绝对路径 / 项目相对路径 / run-index 短 ID（复用 housekeep 已有的 run 解析能力，若可用）。
- merge-only run 的 **banner / panel / summary.json 语义**：明确标注"merge-only"，记录被复用的源 run 目录，避免与正常 fusion run 混淆。
- 异常处理：源目录缺失 `architect.md` 或 `builder.md`、文件为 FAILED 标记、路径歧义等，给出明确错误而非静默 fallback 到重跑。
- **新增 `fusion_merge` agent tool**：让 host agent 能以工具调用方式执行 merge-only fusion（复用 `loadMergeSource` + fuser spawn），使「用户自然语言请求 → agent 判断意图 → 执行 merge」成为可能，免去用户手动查 run id + 拼 `/fusion --merge-existing` 参数的负担。

**不在范围内**：

- **fused → 后续工作流的流转机制**：host agent 通过 (a) 对话记忆 + bash 查 run-index + 把路径写进下一个命令 prompt，子 agent 用 `read` 工具读取——这是**现有能力，无需改动**，本次 change 不新增"session-scoped 工件索引"或"自动注入工件路径"等机制（见 design 的"链路 B 已可用"论证）。
- **gate 重设计 / LLM-as-judge / 双阶段 gate**：独立 change（`fusion-dual-stage-gate`，见 `docs/plans/fusion-harness-followup-roadmap.md`）。
- **my-wiki 侧 validation 标准沉淀**：独立 change，依赖 gate 重设计先行。
- **per-role session 机制改动**：merge-only 不触碰 session 复用逻辑——fuser 本来就是 throwaway session，merge-only 更不需要碰 session。
- **opinion 产物格式变更**：opinion 现有 `architect.md` / `builder.md` 落盘逻辑不变，merge-only 直接消费。
- **非 `/fusion` 命令的 merge 能力**：本次只给 `/fusion` 加 merge-only，不给 `/auto-validate` 或 `/opinion` 加（auto-validate 的 builder 输入是 prompt + gate，不是“两个答案 merge”的语义）。
- **fusion_merge tool 的 live panel 渲染**：tool 执行仅返回文本结果给 agent，不渲染实时双列 panel（fuser 本就是单 agent merge，无双列可渲染，损失可接受）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `fusion-harness-integration`: `/fusion` 命令增加 merge-only 模式——支持复用已有 run 目录的两个 worker 答案，跳过 Stage 1 重跑，直接进入 fuser merge 阶段；banner/panel/summary 语义标注 merge-only 与源 run 目录；**新增 `fusion_merge` agent tool**，让 host agent 能以工具调用方式触发 merge-only，由 LLM 负责意图解析与 run 选择

## Capabilities 待确认项

- [x] 能力清单已与用户确认（grilling 已收敛：单一 modified capability `fusion-harness-integration`，聚焦 `/fusion` merge-only 模式）

## Impact

- **fork 代码**：`repo://fusion-harness extensions/fusion-harness/fusion-harness.ts`——`/fusion` handler 增加分支，`fuserPrompt` 调用前根据 flag 决定“跑 Stage 1”还是“从目录读”；**新增 `fusion_merge` tool 注册**（`pi.registerTool`），复用 `loadMergeSource` + `runChild` fuser spawn。
- **manifest**：`forks/manifest.yaml` 追加 `fusion-harness` 的 `changes_summary` 条目（v0.2.0）。
- **无 breaking change**：`/fusion` 不带 flag 时行为完全不变（正常 Stage 1 + Stage 2）；merge-only 是纯增量路径。
- **无配置/schema 改动**：不引入新的 settings.json 字段或 capabilities.yaml 条目（fusion-harness 已是已注册 package）。
- **依赖既有机制**：`run-index.jsonl`（housekeep 引入）的目录命名约定是 merge-only 路径解析的输入；`mkArtifacts()` / `save()` / `commitSummary()` 等既有函数被复用。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：upstream `disler/fusion-harness` + fork `repo://fusion-harness`
  - 项目页：trial handoff（疑问 2 发源）、`forks/manifest.yaml`
  - 回写目标：`repo://fusion-harness`（代码）+ pi-config `forks/manifest.yaml`（元数据）
