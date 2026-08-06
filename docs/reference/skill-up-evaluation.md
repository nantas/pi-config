# skill-up 仓库调研与接入评估报告

- **调研日期**: 2026-07-25
- **仓库**: https://github.com/alibaba/skill-up （Apache 2.0，调研时版本 v0.7.0，迭代活跃）
- **结论**: **暂不接入（backlog）** —— 对当前以流程型/交互型 skill 为主的工作流提升价值有限，待 skill 数量/变更频率或质量度量诉求上升后重新评估

---

## 1. 一句话定位

Agent Skill 的评测（Evaluation）与演进（Evolution）工具——把 Anthropic 官方的 Skill 评测循环（写真实用例 → with/without Skill 对比运行 → 评分 → 迭代）产品化为可复用、CI 就绪的 Go CLI（约 6.4 万行，183 个 Go 文件）。

## 2. 核心功能

1. **声明式评测配置**: `evals/eval.yaml`（环境、引擎、模型、judge、报告）+ `evals/cases/*.yaml`（每条用例：prompt、fixture、约束、expect 断言）；兼容 Anthropic `evals.json`，提供 `skill-up import` 迁移
2. **多引擎执行**: 内置 `claude_code` / `codex` / `qodercli` / `qwen_code`；`engine.custom` 支持 `local`（本地命令模板）和 `http`（远程 agent 服务）两种自定义传输——**接入 Pi 的扩展点**，理论上可包装 `pi -p`
3. **三种评分策略**: `rule_based`（含 `tool_called` 工具调用断言）、`script`（自定义脚本）、`agent_judge`（Agent 裁判，可读取完整 transcript + workspace diff）
4. **Benchmark 对比**: with-skill / without-skill 双轨运行，量化 Skill 实际增益
5. **结构化报告**: `grading.json` / `benchmark.json/md`（Anthropic 兼容）、`result.json`、JUnit XML、HTML
6. **skill-upper**: 内置演进闭环 Skill，对话驱动「评测 → 诊断 → 修复/补用例 → 重跑」
7. **CI 集成**: 仓库根 `action.yml`（Docker 容器 action，Linux only）

## 3. 实现原理

```
eval.yaml + cases/*.yaml
      │
    runner ── 产物 workspace（<skill>-workspace/iteration-N/，仅存报告）
      │ 并行调度（parallelism / retry_policy）
      ▼
  runtime 层（none=本地临时目录 / docker / opensandbox）
  每 case 创建隔离空目录作为执行 workspace
      │ fixtures 按序注入上下文（见 §4）
      ▼
  agent 引擎层（CLI 子进程调用，安装被测 Skill 到引擎技能路径）
      │ 产出 SessionResult（transcript 含 tool_call 消息 + artifacts）
      ▼
  evaluator / judge（rule_based → script → agent_judge）
      ▼
  report 聚合（含 with/without skill 对比）
```

- 多轮对话**已实现**（`internal/evaluator/multiturn.go`）：`input.turns` 逐轮执行、保持 session、支持每轮 `post_condition` 断言和变量捕获（`capture`），但**"用户"是预写脚本，无 LLM 模拟用户**
- 凭据管理按 runner/judge 角色解析（config > env > CLI），日志掩码；OpenTelemetry 默认关闭
- 安全审查结论 CLEAN：无混淆代码、无可疑外联、依赖少且知名（cobra/yaml/otel/OpenSandbox SDK）、命令执行均符合引擎调用预期

## 4. Workspace 模型与"真实仓库上下文"问题

skill-up 有**两个 workspace**：

- **执行 workspace**: 每 case 一个隔离空目录（`none` runtime 用 `os.MkdirTemp`），agent 以此为 cwd。**不会在真实仓库中运行**，仓库上下文靠 fixture 声明式重建：

| 机制 | 配置 | 作用 |
|------|------|------|
| repo_fixture | `context.repo_fixture` | 把策展的样本仓库目录（可含 `.git`、`AGENTS.md`）整个拷入 workspace 根 |
| git 操作 | `context.git.init/checkout/apply_diff/remotes` | git init、切分支、打 patch |
| 内联文件 | `context.files` | 写任意文件（如 AGENTS.md）到指定路径 |
| setup_steps | `environment.setup_steps` | workspace 内执行任意 shell，可 `git clone` pinned commit 的真实仓库快照 |

- **产物 workspace**: `<skill>-workspace/iteration-N/`，只存 result/transcript/报告

**设计权衡**: 不在真仓库跑是 feature（真仓库漂移 → 评测不可复现），代价是 fixture 维护成本和保真偏差；`none` runtime 下 agent 有宿主机真实权限，评测有副作用的 skill 应换 docker/opensandbox。

## 5. 结合实际 skill 的可评估性分析（核心结论）

对三类高频 skill 的分析表明：skill-up 对流程型/交互型 skill 的有效定位是**「行为约束的回归测试」**（skill 修改后硬规则还在不在），而非「效果好坏的质量度量」。

### 5.1 grilling（`~/.agents/skills/grilling`）—— ★★★☆☆

- **skill 本质**: 纯对话行为（一次一问、未确认不动手、能查代码就不问人），交互对象只有用户和代码库
- **可测**: 行为约束类断言——post_condition 数问题数；`tool_called` 断言全程无 `edit`/`write`；fixture 埋"答案在代码里"的决策点验证先探索后提问；`input.turns` 预写用户回答模拟多轮
- **不可测**: 对意外回答的适应性（脚本用户不会跑题）；问题质量上限（agent_judge 打分有噪声）
- **fixture 成本**: 低-中（含可探索决策点的迷你代码库）

### 5.2 chrome-agent（`~/.agents/skills/chrome-agent`）—— 路由层 ★★★★ / 抓取层 ★

- **skill 本质**: 两层结构——意图路由层（doctor 预检 → 外部 CLI vs 浏览器后端决策树）+ 真实抓取执行层
- **路由层可测且价值高**: `setup_steps` 往 PATH 注入 stub `chrome-agent` CLI（返回预制 doctor JSON 各档结果 + 记录调用日志），断言 doctor failure 时停止并返回 remediation、只读平台优先外部 CLI、partial_success 时中断等**决策正确性**——恰好覆盖最易改坏的部分
- **抓取层不可测**: 真实网站漂移/反爬/rate limit 不可复现；沙箱无 Chrome 登录态；`none` runtime 摸真浏览器等于让评测操作真实账号
- **fixture 成本**: 中（stub CLI 返回契约需与真 CLI doctor schema 同步维护）

### 5.3 trellis-brainstorm（`neonnew/.agents/skills/trellis/`）—— ★★☆☆☆

- **skill 本质**: 重度依赖 neonnew 全仓 + trellis runtime 脚本 + AiDoc 真源文档；严格流程 Directive（Step 0→8 顺序、0.5b 前禁止调查类工具、全程禁止编辑/任务脚本）；交互式逐问；唯一产物 handoff 文档
- **fixture 挑战最大**: repo_fixture 需装下 trellis runtime + AiDoc 文档树，快照大且随 neonnew 演化快速过时，而 skill 价值恰在导航真实文档库；编辑器状态验证在 headless runtime 物理上无法复现
- **甜蜜点**: Directive 约束全是 `tool_called` 可精确断言的（前 N 轮无 grep/edit、全程无 task.py、产出 handoff 结构完整）——适合当**防退化回归**，不需要 fixture 高保真

### 5.4 汇总

| skill | 可测层 | 不可测层 | fixture 成本 | 定位 |
|-------|--------|----------|-------------|------|
| grilling | 行为约束（一次一问/未确认不动手/先探索再问） | 追问适应性、问题质量上限 | 低-中 | 试点首选 |
| chrome-agent | 意图路由 + doctor 契约遵守（stub CLI） | 真实网站抓取效果 | 中 | 只测路由层 |
| trellis-brainstorm | Directive 约束回归 + handoff 结构 | 编辑器状态、真实文档导航质量 | 高 | 仅防退化回归 |

## 6. 接入路径备忘（未来重启时参考）

⚠️ skill-up **不是 Pi package**，是独立 Go CLI（`install.sh` 装二进制），不能走 `pi install`：

1. **仅装 CLI + 手写 eval.yaml**: 用 custom engine `local` 包装 `pi -p "%s"` 作为被测引擎，给本仓 skill 建评测集。改动最小
2. **移植 skill-upper 为 Pi skill**: `skills/skill-upper/SKILL.md` 是标准格式，但其 references 以 claude/codex 语境编写，需适配
3. **试点顺序建议**: grilling（成本最低、断言最硬）→ chrome-agent 路由层 → trellis 防退化回归

## 7. 不接入的理由（2026-07-25 决策）

- 当前 skill 以流程型/交互型为主，skill-up 只能覆盖"行为约束回归"，测不到这些 skill 的核心价值（交互质量、真实环境效果）
- fixture 策展与维护是持续成本，现阶段 skill 变更后的回归风险靠人工 review 可控
- 评测本身消耗模型调用费用，ROI 在当前规模下为负
- **重启信号**: skill 数量继续增长 / 多人协作修改 skill / 出现 skill 修改导致的行为退化事故 / 需要 CI 强制门禁时
