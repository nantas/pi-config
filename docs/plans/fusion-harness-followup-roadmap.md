# fusion-harness 后续完善 Roadmap

> 本文档沉淀 `fusion-harness-trial` 归档后的后续推进规划。源自 2026-07-25 的 grilling session（`/opsx-explore`），捕获了两个核心未解问题的方案骨架与拆分决策。
>
> **状态**：Change 1 已开 proposal（`fusion-merge-existing`）；Change 2/3 待后续 grill 细节后开 proposal。本文档为后续 session 的上下文入口，避免重复推演。

---

## 共享底层洞察

两个问题表面无关，但共享同一个架构转向：

> **把"标准/上下文"从 LLM 脑子里搬出来，变成仓库里的数据。**

- Change 1（artifact 复用）：opinion 的产出 = 数据（可复用，不重跑）
- Change 2（验证标准 = 数据）：gate 标准可沉淀、可演进、可跨仓库

两者都让 fusion-harness 从"临时即兴"走向"数据驱动"。

---

## Change 1: `fusion-merge-existing` ✅ 已开 proposal

**状态**：proposal + binding + specs + design + tasks 全部完成，`applyRequires` 满足，可 `/opsx-apply`。

**位置**：`openspec/changes/fusion-merge-existing/`

**一句话**：`/fusion` 加 `--merge-existing <dir>` flag，复用已有 run 的 `architect.md` + `builder.md`，跳过 Stage 1 worker 重跑，直接进 fuser merge。

**解决**：问题 2 的链路 A（opinion → 直接 fusion，不重跑）。

**关键设计点**：
- merge-only 复用 `fuserPrompt` + `USER_PROMPT_FUSION_MERGE.md`，merge 逻辑一字不变，仅改变答案来源
- 异常 fail-fast，不静默 fallback 到重跑
- banner/summary 标注 `mode:"merge-only"` + `sourceDir`
- 无 breaking change

**链路 B（fused → 后续工作流）确认为现有能力，无需改动**：host agent 通过对话记忆 + bash 查 `run-index.jsonl` 获得工件路径，写进下一个命令的 prompt，子 agent 用既有 `read` 工具读取。per-role persistent session 让 agent 隐式记得上下文。

---

## Change 2: `fusion-dual-stage-gate` ⏳ 待开 proposal

**状态**：方案骨架已收敛，待 grill D1-D4 设计细节后开 proposal。本文档为该 change 的上下文真源。

**位置**：待创建 `openspec/changes/fusion-dual-stage-gate/`

### 问题

`/auto-validate` 的 gate 当前是 VALIDATOR（architect）即兴写的单一 `gate.py`，由 `runProc` 作为 subprocess 执行（120s 超时，捕获 stdout + exit code）。trial 证据：34 项检查 = 19 结构 + 10 关键词 + 4 计数 + **0 项语义验证**。

根本约束：`runProc` 只跑确定性 subprocess，无法在 gate 内部可靠地"调用 LLM 做判断"——硬塞进去会导致每次 LLM 调用代码不稳定、token/超时/error handling 全靠即兴。

### 方案骨架（已 grill 收敛）

**双阶段 gate 架构**：

```
builder 产出
   │
   ├─▶ Stage 1: 确定性 gate (gate.py, 现有 runProc)
   │     · 层0 内置结构检查
   │     · 层1 配置里 deterministic 脚本列表 (主题相关度/证据链的脚本化部分)
   │     · FAIL → 回 builder 修 (现有 loop)
   │
   └─▶ Stage 2: LLM judge (新增阶段, fusion-harness 层)
         · judge agent 收到 [产出 + 配置 semantic 标准 + 任务上下文]
         · 判断: 相关度/论证逻辑链/理解深度 (客观化语义检查, 非"好不好"主观判断)
         · FAIL → 回 builder 修 (带 judge 结构化反馈)
```

**仓库级配置文件**（数据驱动验证标准）：

```yaml
# .pi/validation.yaml (每个仓库各自维护)
deterministic:              # 确定性检查 — 直接执行
  - tools/governance_report.py
  - tools/checks/topic_relevance.py
  - tools/checks/evidence_chain.py
semantic:                   # 语义判断标准 — LLM judge 读它做判断
  - docs/specs/synthesis-output-guidance.md
  - docs/specs/what-makes-good-digest.md
  - "每个结论必须有源材料的直接引用"
```

**关键设计决策（已 grill 确认）**：
- **混合输入**：配置同时支持脚本（确定性）+ 自然语言文档（语义）——不依赖纯脚本，也不依赖纯 LLM 转译
- **LLM 独立判断阶段**：Stage 2 是 fusion-harness 层新增的执行阶段，不塞进 gate.py subprocess
- **层 1（主题相关度+证据链）归仓库配置**，不是 fusion-harness 内置默认——不同领域"证据"定义差异大，各仓库各自声明
- **judge 用 architect 模型（Q1.8=α）**：验证者（architect）与执行者（builder）分属不同 agent 即满足"独立"；judge 的标准来自仓库配置（外部），打破"自产自销"循环
- **渐进式标准沉淀**：用户跑完觉得不够 → 往配置加一条 → 下次生效；临时检查稳定后可从 semantic（自然语言）沉淀成 deterministic（脚本）

### 待 grill 的设计细节（开 proposal 前）

- **D1 — Stage 2 judge 的失败反馈粒度**：二元 PASS/FAIL vs 带结构化反馈（"结论3缺证据""主题偏离到Y"）。后者价值大但 judge prompt 设计更讲究。
- **D2 — validation 配置文件路径与发现机制**：`.pi/validation.yaml`？还是命令 flag？fusion-harness 怎么发现它（约定路径）。
- **D3 — Stage 2 的成本/不确定性对冲**：judge 跑几次？多数决（3 judge 投票）？还是单次判定？
- **D4 — "持续补全标准"的工作流**：纯手工编辑 yaml？还是某命令辅助（`/fusion-housekeep add-standard`）？

### 影响 / 归属

- **归属**：`pkg-fork-dev`（改 fusion-harness 的 gate 执行架构）+ 各仓库建配置（后续）
- **依赖**：无硬依赖 Change 1，但建议在 Change 1 之后（先热身再啃硬骨头）
- **复杂度**：中高（动 gate 执行核心 + 设计配置 schema + judge prompt 设计）

### 与 trial handoff 疑问 3 的关系

直接解决 handoff 的"疑问 3：auto-validate 价值重定位"——gate.py 里 19+10+4=33 项本质是 governance 职责的结构/关键词检查，应回归仓库 deterministic 配置；语义验证（trial 里 0 项）由 Stage 2 LLM judge 承接。

---

## Change 3: `my-wiki-validation-standards` ⏳ 待开 proposal（后置）

**状态**：依赖 Change 2 落地，仅记录方向，不急于 grill。

**位置**：待创建（在 `repo://my-wiki` 或 pi-config 跨仓 change）。

### 问题

Change 2 提供"配置驱动 gate"机制后，my-wiki 需要建立**初始标准库**：
- 把现有 `docs/specs/`（synthesis-output-guidance / markdown-output-quality）+ ADR 0005（四维治理）/ 0007（gate-phase-shared-backbone）索引进 `validation.yaml` 的 semantic
- 把 trial gate.py 里那些"本质是 governance 职责"的结构检查沉淀成 deterministic 脚本（handoff 三章列了候选：frontmatter 值匹配 / 必需章节 / 核心概念覆盖 / raw 处理纪律 / 系列关联引用计数）

### 待确认的设计前提

- **my-wiki 已注册 `repo://my-wiki`**（repo_registry.json 已有条目）——跨仓 writeback 路径已通
- **my-wiki 已有 governance 工具链**（`tools/governance_report.py` + `schema_validator.py` + `template_checker.py` + `link_checker.py`）——Change 3 是扩展，不是新建
- **ADR 0007 已有 "gate phase" 概念**——需厘清它与 fusion-harness 的 gate 关系（可能存在概念重叠，需在 Change 3 design 里消解）

### 复杂度 / 归属

- **归属**：my-wiki 仓库（建配置 + 沉淀脚本）
- **依赖**：Change 2 落地（配置 schema 与 Stage 2 judge 接口稳定后才有意义）
- **复杂度**：中（确定性脚本工程 + 标准文档梳理，无新机制设计）

---

## 推进顺序建议

```
Change 1 (merge-existing)  ──▶  低复杂度, 独立, 立即可用
   │  (热身)
   ▼
Change 2 (dual-stage-gate) ──▶  中高复杂度, 核心设计债
   │  (机制落地)
   ▼
Change 3 (my-wiki standards) ──▶  应用层, 依赖 Change 2
```

Change 1 先做的理由：小、独立、不依赖任何前置，且解决用户当下最直接的痛点（同话题重复跑）。Change 2 是真正的设计难题，建议 Change 1 ship 后专注 grill。

---

## 关键证据索引（供后续 session 快速回查）

| 想看什么 | 去哪 |
|---|---|
| trial 结论 + 三个疑问发源 | `openspec/changes/archive/2026-07-23-fusion-harness-trial/handoff-to-formal-integration.md` |
| trial 价值修正（gate 34 项 = 0 语义） | `openspec/changes/archive/2026-07-23-fusion-harness-trial/verification.md` |
| fusion-harness 当前安装位置 | `~/.pi/agent/git/github.com/nantas/fusion-harness/` |
| fork 主体实现 | `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts` |
| fuser merge 模板 | `repo://fusion-harness extensions/fusion-harness/USER_PROMPT_FUSION_MERGE.md` |
| run-index + housekeep 机制 | `repo://fusion-harness extensions/fusion-harness/housekeep.ts` |
| per-role session 持久化（跨命令记忆） | `fusion-harness.ts:1102-1175`（§8.4 Persistent per-role sessions） |
| baseline capability spec | `openspec/specs/fusion-harness-integration/spec.md` |
| fork 元数据 | `forks/manifest.yaml`（fusion-harness 条目） |
| my-wiki governance 现状 | `repo://my-wiki tools/{governance_report,schema_validator,template_checker,link_checker}.py` |
| my-wiki ADR 治理链 | `repo://my-wiki docs/adr/{0005-four-dimension-governance,0007-gate-phase-shared-backbone}.md` |
