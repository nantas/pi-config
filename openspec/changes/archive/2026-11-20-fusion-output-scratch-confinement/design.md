# Design

## Context

`/fusion` 的产出契约是为「文本答案」形状设计的：两个 worker 各产一段 `*.md` 文本，fuser 融合成 `fused.md`。整个 header 注释甚至写着 "Nothing is written to the repo"。

但当 `/fusion` 被用来跑 **publish-capable skill 工作流**（如 `$game-wiki-ingest`，Phase D 发布到 `synthesis/digest/`）时，产物单元从「一段文本」变成「一棵 file tree」，契约形状失配。实测（`fusion-harness-aYwYMb` run）暴露了一个**踢皮球循环**：

- Worker prompt 暗示「canonical deliverable 由 fusion agent 之后写」
- Fuser prompt 明确「ALL artifacts under ARTIFACTS_DIR，NEVER 其他目录」
- 两者拼起来 → canonical 无人写 → worker 把 identity 塞进业务 slug（`slay-the-spire-ARCHITECT-k3/`）自认「非 canonical」妥协产出

用户决策已收敛（三轮探索）：fuser 不做 tree 融合，产出分析总结报告即满足；目标是**消除污染**，把 fusion 全流程限定在 `.scratch/fusion-harness/` 内，由人类/授权 agent 后续发布。

spec（`specs/fusion-harness-integration/spec.md`）已定义五个 MODIFIED Requirement：worker 写位置硬约束、prompt override 契约、output boundary statement、fused report 含 publish manifest、纯分析调用非回归。本 design 说明如何实现。

## Goals / Non-Goals

**Goals:**

- 打破踢皮球循环：worker 与 fuser 的输出约束指向同一个地方（scratch），无任何 agent 被暗示「别人会发布 canonical」
- 让 worker 能完整跑 publish-capable 工作流，只是把根重定位到 `{{ARTIFACTS_DIR}}/{{ROLE}}/`，保留工作流定义的全部内部结构与 slug
- slug 净化：identity 从 slug 上移到分区目录层，promote 时零改写（纯前缀剥离）
- fused report 含产出清单 + promote 建议，让人类/agent 的发布决策有据可依
- 纯分析类 `/fusion` 调用零回归

**Non-Goals:**

- 工具层硬墙（write 路径拦截）—— L1 先靠 prompt；这是后续可选优化，当前不做（lazy）
- promote 工具化（`fusion_promote`）—— 现阶段手动发布，工具化留作后续
- tree 级语义融合 —— 明确排除，fuser 只产分析报告
- `/opinion`、`/auto-validate`、merge-only 模式的任何改动 —— 本 change 仅触及 `/fusion` 的 Stage 1 worker + Stage 2 fuser

## Decisions

### D1: Override 措辞用 A+B 混合（不单靠规则，也不单靠优先级）

spec 的「Fusion Worker Prompt Override Contract」要求三层叠加：

1. **B 命令式优先级声明**：「fusion mode 覆盖 skill 的发布路径指令，发布目标被重定位而非删除，工作流照跑」—— 给 LLM 一个明确的优先级锚点
2. **A 声明式路径重写规则 + 例子**：`{{ARTIFACTS_DIR}}/{{ROLE}}/` 前缀重写，配两个具体例子（嵌套目录 + 裸文件）—— 给 LLM 可执行的转换规则
3. **slug 净化段**：禁止 identity 入 slug/文件名，只允许进分区目录 —— 堵掉旧的「embed identity in EVERY path」逃生路径

**为什么混合**：纯命令式（B）对抽象指令遵循度依赖 LLM 理解力；纯声明式（A）面对 skill 的强指令可能压不住。混合给出最强 prompt 层手段，是当前框架下不引入新机制能做的极限。

### D2: 旧的「embed identity in EVERY path」指令彻底删除，不做向后兼容

`USER_PROMPT_FUSION_WORKER.md` 现有的防撞车措辞（"embed your identity in EVERY path ... report-{{ROLE}}-{{MODEL}}.md"）和「fuser writes canonical deliverable」暗示，是污染的**直接源头**。

不保留旧措辞的任何变体——因为旧的「identity 入路径」与新的「identity 入分区目录」语义冲突，并存只会让 worker 更困惑。防撞车需求被分区目录完全接管（`architect/` vs `builder/` 物理隔离）。

### D3: workerPrompt() 签名扩展，新增 ARTIFACTS_DIR 参数

现状（`fusion-harness.ts:762`）：`workerPrompt(role, model, otherRole, otherModel, prompt)` —— 没有 artifacts dir，导致路径重写规则无锚点，这是实现缺口。

改为：`workerPrompt(role, model, otherRole, otherModel, prompt, artifactsDir)`，Stage 1 两处 spawn（line 1850 ARCHITECT / line 1862 BUILDER）传入当前 run 的 `artifactsDir`。模板通过 `{{ARTIFACTS_DIR}}` 插值。

**为什么 fuser 不用改签名**：fuser 的 `fuserPrompt()`（line 800 附近）已经接收 `artifactsDir` 参数并插值 `{{ARTIFACTS_DIR}}`，无需修改。

### D4: 输出边界 statement 在 worker + fuser 两端一致

新增一段共享的「fusion 全流程不 publish」声明，同时进 worker prompt 和 fuser prompt。措辞一致，杜绝任一 agent 以为「另一方会发布 canonical」的误读。fuser 端保留现有的「ALL under ARTIFACTS_DIR, NEVER other directory」强化句。

### D5: publish manifest 是 fused report 的稳定 Markdown section，非机器 schema

spec 的「Fusion Report Contains Publish Manifest」要求 fused report 含产出清单 + promote 建议。实现为 `USER_PROMPT_FUSION_MERGE.md` 的 OUTPUT CONTRACT 追加一项（section 3），不强制 JSON/YAML schema。

**为什么不上 schema**：lazy。promote 现阶段手动，人类读 Markdown section 足够；机器 schema 的价值要等 promote 工具化才浮现，届时再升级。这符合「先 prompt，后工具层」的整体节奏。

### D6: 改动落点集中在三处文件

- `extensions/fusion-harness/fusion-harness.ts` —— `workerPrompt()` 签名 + 两处 Stage 1 spawn 传参
- `extensions/fusion-harness/USER_PROMPT_FUSION_WORKER.md` —— 核心重写（删旧措辞 + 加 override 三层）
- `extensions/fusion-harness/USER_PROMPT_FUSION_MERGE.md` —— 加输出边界对齐 + OUTPUT CONTRACT 追加 publish manifest section

不动 `/opinion`、`/auto-validate`、merge-only、housekeep、VALIDATOR/TRIAGE 任何路径。

## Risks / Migration

### R1（关键风险）：worker override 可行性未经验证

整个方案的技术基础压在一件事：强模型（kimi-coding/k3、grok-build/grok-4.5）面对 skill 的硬发布指令 + fusion 的混合 override，**能否被压住**。

- **若 override 住** → 方案成立，ship
- **若 override 不住**（worker 仍写 repo）→ prompt 层已达上限，需退到工具层拦截（write 自定义包装按路径拒绝），或接受「fusion 不跑 publish-capable workflow」的边界

**缓解**：把「重跑 game-wiki-ingest 验证 repo canonical 干净 + scratch 镜像完整」列为 verification 的关键 scenario。本次已有的 `fusion-harness-aYwYMb` run 作 before 对照。

**不在本 design 强行兜底**：若验证失败，开后续 change（如 `fusion-write-path-interception`）做工具层，不在本 change 膨胀范围。

### R2：跨目录工作流的路径重写泛化

game-wiki-ingest 不只写 `synthesis/digest/`，Phase E 的 pattern 写 `synthesis/game-design-pattern/`。路径重写规则需泛化到「任何 repo 相对路径」而非硬编码 digest。

spec 的「Cross-directory workflow output is uniformly relocated」scenario 已覆盖。A 规则的措辞是「every path under the repo root」，非「digest 路径」，天然覆盖。

### R3：worker 误解「partition dir = 唯一可写区」而拒绝写 run 根的 `<role>.md`

worker 的文本答案（`architect.md`/`builder.md`）历史上写在 `{{ARTIFACTS_DIR}}/` 根（run 根），不在分区目录内。新 prompt 若措辞不慎，可能让 worker 以为「只能写 `{{ROLE}}/` 子树」，把答案文本也挪进去，破坏现有 panel/fuser 读取路径（fuser 读 `{{A_PATH}}` = `{{ARTIFACTS_DIR}}/architect.md`）。

**缓解**：prompt 措辞区分两类写——「你的文本答案写 run 根 `{{ARTIFACTS_DIR}}/{{ROLE}}.md`；工作流产物树写分区目录 `{{ARTIFACTS_DIR}}/{{ROLE}}/`」。design 标注此区分，tasks 实现时在模板里写明。

### R4：向后兼容

- 纯分析类调用：无回归（spec 有非回归 Requirement + scenario 兜底）
- 已归档 run（如 `fusion-harness-aYwYMb`）：不受影响，本 change 只改 prompt + 签名，不迁移历史产物
- 全局安装副本 `~/.pi/agent/git/github.com/nantas/fusion-harness/`：fork ship 后由 managed sync 更新，不在本 change 直接处理（见 binding 同步约束）

### R5：migration — 无数据迁移

本 change 不改变磁盘格式、不引入新配置 key、不改 `.pi/capabilities.yaml`。migration 为空。

## 关键不确定点（再强调）

**worker override 可行性（R1）是本方案成立与否的唯一不确定点。** 所有 prompt 措辞设计都围绕「最大化 override 成功率」，但最终判定只能靠实测。design 不在此预先设计 fallback——若失败，按 D6「不动其他路径」的原则，另开 change 处理，保持本 change 范围纯粹。
