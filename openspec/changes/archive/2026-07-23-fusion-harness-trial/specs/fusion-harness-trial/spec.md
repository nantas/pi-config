# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-trial`
- 来源: `proposal.md` / 11 轮 grilling 收敛
- 变更类型: `new`
- 用户确认摘要: 单一新 capability，无 Modified；trial 阶段不改 pi-config/my-wiki 运行时；scratch 隔离；upstream 框架优先；Q3 gate 形式冻结

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Scratch 隔离执行

The system SHALL execute the entire fusion harness trial in an isolated scratch directory (`~/scratch/fusion-trial/`), cloning upstream `disler/fusion-harness` there, and MUST NOT modify any pi-config `.pi/` resources, my-wiki files, or global `~/.pi/agent/` configuration during the trial.

#### Scenario: trial 不污染主仓库
- **WHEN** trial 任意阶段执行（环境准备、模型配置、契约注入、全阶梯跑、产出落盘）
- **THEN** pi-config 的 `.pi/` 资源、my-wiki 所有文件、`~/.pi/agent/` 全局配置保持零改动；所有 trial 产物（harness clone、fusion 产出、artifacts）落在 scratch 或 `/tmp/fusion-harness-*`

#### Scenario: 产出与 ground truth 隔离
- **WHEN** builder 产出 fusion digest
- **THEN** 产出落 `~/scratch/fusion-trial/output/`，绝不覆盖 my-wiki `20-synthesis/digest/讲座/IndyDevDan/` 下已有的 ground truth digest

### Requirement: Upstream 框架优先（不重实现）

The system SHALL use Dan's upstream fusion-harness as-is via its launch recipes, overriding only model selection and system prompt pointers; the system MUST NOT build a native subagent-based reimplementation of the fusion orchestration during this trial.

#### Scenario: 模型对用 sovereign 栈覆盖 upstream 默认
- **WHEN** 启动 fusion session
- **THEN** 通过 justfile flag（`--architect` / `--builder`）覆盖 upstream 默认的 Anthropic/OpenAI 对，改用 sovereign 模型对：architect=`deepseek/deepseek-v4-pro`（thinking high），builder=`zhipuai-coding-plan/glm-5.2`（thinking medium）；不路由到 Anthropic/OpenAI

#### Scenario: clean-room 子进程 provider 兼容性预检
- **WHEN** fusion session 启动后、正式跑 trial 任务前
- **THEN** 先用零成本 `/system-prompt` 确认配置，再用 `/opinion hello` 极简 prompt 实测 deepseek 能否被 clean-room 子进程（`--no-skills --no-extensions --no-context-files`）解析调用；失败则回退 `zhipuai-coding-plan/glm-5.1` 作 architect 或排查 provider 注册来源

### Requirement: Skill 契约路径指针注入（非拼装）

The system SHALL inject my-wiki lecture-ingest contract into fusion sub-agents via system prompt path pointers (pointing to existing skill/contract files), and the sub-agents SHALL use the `read` tool to load these files on-demand; the system MUST NOT pre-assemble or rewrite skill content into monolithic prompt files.

#### Scenario: 子 agent 按需 read 加载契约
- **WHEN** architect/builder system prompt 配置
- **THEN** prompt 文件只含路径指针（指向 `.agents/skills/ingest/lecture-ingest/SKILL.md` 及其内部引用的 `docs/specs/synthesis-output-guidance.md`、`docs/specs/markdown-output-quality.md`、`templates/synthesis/digest-deep-*.md`），不内联文件内容；子 agent 启动后自行 `read` SKILL.md，再按内部引用 follow-up read 其他契约

#### Scenario: builder 明确 trial 跳过 grilling
- **WHEN** builder system prompt 撰写
- **THEN** 显式声明本路径为 fusion trial，有意跳过 lecture-ingest 的 grilling 阶段，由 builder 基于 raw 材料自决主干结构（验证「不同模型在 ingest 场景是否天然产生视角差异」）；该声明避免 builder 读到 SKILL.md「主干不可预设，靠 grilling」时陷入困惑

### Requirement: 全阶梯试跑（opinion→fusion→auto-validate）

The system SHALL run the complete fusion value ladder against the IndyDevDan raw lecture input in one sequence, and SHALL compare the fusion output against the existing hand-authored ground truth digest.

#### Scenario: opinion 提供认知方向
- **WHEN** 阶段 4.2 执行
- **THEN** 两个 sovereign 模型并行读 raw + SKILL.md，独立给出「这篇讲座的核心论点方向和值得 digest 的角度」；产出落 artifacts，供用户评估视角差异

#### Scenario: fusion 合并产出 digest
- **WHEN** 阶段 4.3 执行
- **THEN** architect + builder 并行从 raw 产出 digest，FUSION agent（architect 模型，fresh session）合并两份产出，按 consensus/divergence/discard 分类；合并产物落 scratch output

#### Scenario: auto-validate 用 Dan Python gate
- **WHEN** 阶段 4.4 执行
- **THEN** validator 先写 Python `gate.py`（uv PEP-723），baseline 必须 fail RED，builder 据 gate 反馈 loop 至 PASS 或 halt（默认 max 5）；**Q3 声明式 YAML gate 形式冻结**，trial 接受 Dan 原生 Python gate，gate 形式优化延后

#### Scenario: cwd 指向 my-wiki
- **WHEN** fusion session 启动
- **THEN** 进程 cwd = `/Users/nantasmac/projects/my-wiki`，使子 agent `read` 相对路径（`.agents/skills/...`、`docs/specs/...`）直接命中；scratch 仅用于 clone harness 仓库本身

### Requirement: 价值评估结论驱动后续决策

The system SHALL produce a value assessment comparing fusion output against ground truth on three axes (opinion 视角差异增量 / fusion 合并捕获度 / auto-validate gate 相对事后 governance 的增量), and the assessment conclusion MUST gate whether a follow-up permanent-integration change is warranted.

#### Scenario: 价值确认触发后续正式引入
- **WHEN** 三轴评估中至少 auto-validate 轴显示相对事后 governance 的真实增量
- **THEN** 记录结论为「价值确认」，后续走独立 change + `pkg-research` / `pkg-fork-dev` 正式引入 pi-config，届时解冻 Q3 并处理 `capabilities.yaml`；本 change 关闭

#### Scenario: 价值不足则 trial 弃用
- **WHEN** 三轴评估均未显示显著增量，或模型在 ingest 场景高度趋同（无视角差异）
- **THEN** 记录结论为「价值不足」，scratch 目录可弃用，零污染 pi-config/my-wiki；本 change 关闭，不进入正式引入流程
