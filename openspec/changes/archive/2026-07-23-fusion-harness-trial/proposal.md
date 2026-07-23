# Proposal

## 问题定义

my-wiki 的 ingest 工作流（以 `lecture-ingest` 为代表）当前的质量门控是**事后静态 governance**：synthesis 产出后跑 `governance_report.py`（schema + template + link + naming 四维），全部是结构性检查，**零内容层验证**。主 agent 写完即自检，review 约束仍由人工承担。

IndyDevDan 的 fusion harness（[disler/fusion-harness](https://github.com/disler/fusion-harness)）提出三命令价值递进——`/opinion`（多视角并行）→ `/fusion`（融合合并）→ `/auto-validate`（验证前置 gate loop），声称把 review 约束下沉为 agent 编码的客观 gate。但：

1. **价值未验证**：这套模式在 markdown/Obsidian ingest 场景的适用性、sovereign 模型栈（非 Anthropic/OpenAI）下的视角差异是否成立，均无本地证据。
2. **引入成本不确定**：upstream 的 clean-room spawn 设计与 my-wiki 高度依赖 skill 可见性的工作流存在表面张力，真实集成代价未评估。
3. **盲引入风险**：直接正式引入 pi-config（走 pkg-research/pkg-fork-dev）成本高、效果不确定，失败则污染配置仓。

因此需要一个**最小代价、scratch 隔离的 trial**，先用真实 ingest 任务跑一次完整 value ladder，拿到证据后再决定是否值得正式引入。

## 范围边界

**本 change 只做（trial）**：
- scratch 目录（`~/scratch/fusion-trial/`）clone upstream fusion-harness
- sovereign 模型对（deepseek architect + glm builder）配置
- skill 契约以**路径指针**注入 system prompt（非拼装、非转写，clean-room 子 agent 用 `read` 自行加载）
- 用 IndyDevDan raw（已有 ground truth digest）跑一次 `/opinion → /fusion → /auto-validate` 全阶梯
- 产出落 `~/scratch/fusion-trial/output/`，与人工 ground truth digest 对比

**本 change 不做（明确排除）**：
- 不修改 pi-config 的 `.pi/` 资源（无新 skill/extension/agent）
- 不修改 my-wiki 任何文件（含 lecture-ingest skill、正式 digest 目录）
- 不同步到 `~/.pi/agent/` 全局
- 不做原生重实现（subagent 编排）——优先 upstream 框架
- 不优化 gate 形式（Q3「声明式 YAML gate」**冻结**，trial 用 Dan 的 Python `gate.py`）
- 不碰 `capabilities.yaml` manifest

**后续（超出本 change scope，依赖 trial 价值确认）**：走独立 change + `pkg-research` / `pkg-fork-dev` 正式引入 pi-config，届时解冻 Q3 并处理 `capabilities.yaml`。

## Capabilities

### New Capabilities

- `fusion-harness-trial`: 在 scratch 隔离环境中，以 sovereign 模型对与最小契约注入，跑一次 Dan fusion-harness 完整 value ladder（opinion→fusion→auto-validate），验证 fusion/auto-validate 模式在 markdown ingest 场景的真实价值，产出对照评估结论；将生成 `specs/fusion-harness-trial/spec.md`

### Modified Capabilities

（无。trial 阶段不修改任何既有能力——pi-config 与 my-wiki 运行时配置零改动。）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（经 11 轮 grilling 收敛，单一新 capability `fusion-harness-trial`，无 Modified）

## Impact

- **pi-config**：仅新增 `openspec/changes/fusion-harness-trial/` spec 工件，运行时配置零改动
- **my-wiki**：零改动（trial 以 my-wiki 为 cwd 启动 fusion session，但只 `read` skill/raw，产出落 scratch）
- **全局 `~/.pi/agent/`**：零改动（不同步）
- **临时环境**：`~/scratch/fusion-trial/`（clone harness + 产出对比）、`/tmp/fusion-harness-*`（harness artifacts，Dan 默认）
- **API 成本**：sovereign workhorse 模型对（deepseek + glm），workhorse tier 成本，可控

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：my-wiki digest `20-synthesis/digest/讲座/IndyDevDan/stop-picking-fuse-them-model-fusion.md`（内部模式提炼）
  - 项目页：`https://github.com/disler/fusion-harness`（upstream）+ my-wiki lecture-ingest skill（执行上下文）
  - 回写目标：trial 阶段无永久回写，仅 pi-config 内 spec 工件
