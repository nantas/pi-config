# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/fusion-harness-trial/spec.md` 的 5 个 ADDED Requirements（scratch 隔离 / upstream 优先 / 契约路径指针 / 全阶梯试跑 / 价值评估）均有任务覆盖
- [x] 1.2 预检二进制依赖：`pi`（已知 ✓）、`just`、`jq`、`uv` —— 缺失项 `brew install`（覆盖 Requirement: Upstream 框架优先 的工具链前提）
- [x] 1.3 确认 sovereign 模型 API key 可用：DeepSeek key（architect）、Zhipu key（builder）；写入 `~/scratch/fusion-trial/fusion-harness/.env`

## 2. 核心实现任务

### 2.1 环境准备（覆盖 Requirement: Scratch 隔离执行）

- [x] 2.1. `mkdir -p ~/scratch/fusion-trial && cd ~/scratch/fusion-trial && git clone https://github.com/disler/fusion-harness`
- [x] 2.1. `mkdir -p ~/scratch/fusion-trial/output`（fusion 产出落点，覆盖 Scenario: 产出与 ground truth 隔离）
- [x] 2.1. 确认 IndyDevDan raw 原位可读：`/Users/nantasmac/projects/my-wiki/30-raw/external/media/youtube/IndyDevDan/2026-07-20-stop-picking-fuse-them-model-fusion/`
- [x] 2.1. 确认 ground truth digest 原位可读：`/Users/nantasmac/projects/my-wiki/20-synthesis/digest/讲座/IndyDevDan/stop-picking-fuse-them-model-fusion.md`
- 验证方式：`ls` 上述路径均存在；`git -C ~/scratch/fusion-trial/fusion-harness log -1` 成功

### 2.2 sovereign 模型对配置（覆盖 Requirement: Upstream 框架优先）

- [x] 2.2. 撰写自定义 launch 命令（或 justfile recipe），覆盖 upstream 默认 Anthropic/OpenAI 对：
  ```
  pi -e extensions/fusion-harness/fusion-harness.ts \
      --model zhipuai-coding-plan/glm-5.2 \
      --architect deepseek/deepseek-v4-pro --builder zhipuai-coding-plan/glm-5.2 \
      --architect-thinking high --builder-thinking medium \
      --architect-system-prompt ~/scratch/fusion-trial/architect-prompt.md \
      --builder-system-prompt ~/scratch/fusion-trial/builder-prompt.md
  ```
- [x] 2.2. **provider 兼容性预检**（覆盖 Scenario: clean-room 子进程 provider 兼容性预检）：session 启动后跑 `/system-prompt`（零成本）确认配置 → 跑 `/opinion hello` 实测 deepseek clean-room spawn；失败则回退 `zhipuai-coding-plan/glm-5.1` 作 architect 并记录回退原因
- 验证方式：`/opinion hello` 两模型均返回非空响应，无 provider 解析错误

### 2.3 契约路径指针注入（覆盖 Requirement: Skill 契约路径指针注入）

- [x] 2.3. 撰写 `~/scratch/fusion-trial/architect-prompt.md`：指针指向 `.agents/skills/ingest/lecture-ingest/SKILL.md`，说明 architect 角色「读 skill → 读内部引用契约 → 对 raw 给规划/批判视角」
- [x] 2.3. 撰写 `~/scratch/fusion-trial/builder-prompt.md`：同指针 + 显式声明「fusion trial，跳过 grilling，基于 raw 自决主干结构」（覆盖 Scenario: builder 明确 trial 跳过 grilling）
- [x] 2.3. 验证指针文件不含 skill 内容内联，仅含路径 + 角色说明（覆盖 Scenario: 子 agent 按需 read 加载契约）
- 验证方式：`wc -l` 两 prompt 文件各 < 30 行；文件内均为路径引用无契约正文

### 2.4 全阶梯试跑（覆盖 Requirement: 全阶梯试跑）

**前置：fusion session 以 `/Users/nantasmac/projects/my-wiki` 为 cwd 启动（覆盖 Scenario: cwd 指向 my-wiki）**

- [x] 2.4. `/opinion "读 raw + .agents/skills/ingest/lecture-ingest/SKILL.md，给出这篇讲座的核心论点方向和值得 digest 的角度"`（覆盖 Scenario: opinion 提供认知方向）
- [x] 2.4. `/fusion "<同上 prompt>" "<fusion instruction: 按 consensus/divergence/discard 合并两份 digest 产出>"`（覆盖 Scenario: fusion 合并产出 digest）；产出落 `~/scratch/fusion-trial/output/fused-digest.md`
- [x] 2.4. `/auto-validate "产出符合 .agents/skills/ingest/lecture-ingest/SKILL.md 契约的 lecture digest，产出路径 ~/scratch/fusion-trial/output/"`（覆盖 Scenario: auto-validate 用 Dan Python gate）；validator 写 `gate.py`，baseline fail RED，builder loop 至 PASS/halt
- 验证方式：三命令均正常完成，artifacts 落 `/tmp/fusion-harness-*/`，产出落 scratch output 未触碰 my-wiki

## 3. 收敛与验证准备

- [x] 3.1 收集三轴评估证据：
  - opinion 视角差异：两模型对 raw 的论点提取/角度选择差异是否显著（对比 artifacts 下 `architect.md` / `builder.md`）
  - fusion 合并捕获度：`fused-digest.md` 的 consensus/divergence 是否捕获单模型会漏的点
  - auto-validate 增量：`gate.py` 抓到的问题 vs `governance_report.py --scope` 抓到的问题，gate 是否有 governance 没有的内容层检查
- [x] 3.2 收集 fusion 产出与 ground truth digest 的对照（覆盖 Requirement: 价值评估）
- [x] 3.3 标记价值结论：价值确认 / 价值不足（覆盖 Scenario: 价值确认触发后续 / Scenario: 价值不足则弃用）
- [x] 3.4 记录 R1 provider 兼容性实际结果（是否回退 architect 模型）

## 4. 验证与回写收敛

- [x] 4.1 基于真实 trial 结果生成 `verification.md`（覆盖 spec-to-implementation 5 个 Requirement + task-to-evidence 对照 + 三轴评估结论）
- [x] 4.2 生成 `writeback.md`：trial 阶段无永久回写目标（仅 pi-config spec 工件已存在）；若价值确认，记录后续独立 change 的引入路径（pkg-research / pkg-fork-dev）
- [x] 4.3 trial 实际执行结果不回写 my-wiki 或 pi-config 运行时（覆盖 binding.md 同步约束）；scratch 产物按结论保留（价值确认）或弃用（价值不足）
