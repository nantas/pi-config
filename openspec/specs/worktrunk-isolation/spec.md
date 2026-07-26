# Specification — worktrunk-isolation

## Purpose

跨项目、agent 驱动的 worktrunk 协议 skill：用 git worktree 给多 session 并行作业做文件系统隔离，强制人确认合入门禁。管隔离与门禁，不管多 agent 编排。

## Requirements

### Requirement: Skill 存在性与 invocation 模式

系统 SHALL 提供一个名为 `worktrunk-isolation` 的 model-invoked skill（保留 `description` 字段），位于 `.pi/skills/worktrunk-isolation/SKILL.md`，使 agent 能在用户表达并行隔离意图时自主加载并遵循。

`description` 的触发词 SHALL 覆盖中英文：worktree / worktrunk / `wt` / 并行 session / 隔离 / 多 agent 同仓 / independent branch / isolate。

#### Scenario: 用户要求并行隔离
- **WHEN** 用户说「另开一条线做 X / 不要动我现在的工作区 / 在隔离环境改 / 多 session 并行」且当前在 git 仓
- **THEN** agent 自主加载并遵循本 skill

#### Scenario: 不触发
- **WHEN** 任务为纯问答、只读检索，或用户明确要求在当前目录改且接受互相覆盖
- **THEN** skill 不触发

### Requirement: 生命周期协议为唯一 steps 主轴

SKILL.md 的主体 SHALL 是有序生命周期协议，每个 step 带可检查的完成标准（completion criterion），顺序固定为：

`preflight → create|reuse → work_only_in_path → commit_on_branch → report → (await human) → merge | remove`

任何实现/文档不得把协议拆成多个 skill，也不得在 SKILL.md 之外另起一套协议。

#### Scenario: 协议完整覆盖
- **WHEN** agent 在隔离场景下工作
- **THEN** agent 沿此顺序执行，每个 step 到达其完成标准后才进入下一步

### Requirement: Preflight checklist 即 doctor（单一来源）

skill SHALL 以一份 preflight checklist 同时承担环境就绪检查（doctor）职责，且 SHALL NOT 额外提供 `scripts/worktrunk-doctor.sh` 或任何独立 doctor 脚本。

Preflight checklist SHALL 逐项检查并在失败时给出安装/修复指令：

1. `command -v wt` 可执行；失败 → 安装指引（references/install.md）
2. `wt --version` 可解析版本
3. 当前目录为 git work tree / 能解析 repo root（`git rev-parse --show-toplevel` 成功）
4. 用户 worktrunk config 存在或可安全使用默认（`wt config show` 可运行）
5. `worktree-path` 意图：尊重用户已有 config；若无配置则推荐写入集中路径模板，写入前说明，不覆盖用户已有非默认模板
6. 目标父目录可创建（`mkdir -p` 成功）

Agent 非交互场景 SHALL 始终使用 `--no-cd --format json`，不依赖 shell 集成。

#### Scenario: wt 未安装
- **WHEN** preflight 第 1 项失败
- **THEN** agent 停止，指向 `references/install.md` 给出最短安装路径，不静默乱装

#### Scenario: 一切就绪
- **WHEN** preflight 全绿（shell 集成缺失视为 ok）
- **THEN** agent 进入 create|reuse

### Requirement: 创建/复用命令约定

skill SHALL 教授以下命令作为创建/复用 worktree 的唯一方式（agent 非交互）：

```bash
wt switch --create <branch> --no-cd --format json   # 新建
wt switch <branch> --no-cd --format json            # 已存在复用
```

Agent SHALL 解析返回 JSON 的 `path` / `branch`，此后所有文件读写、bash 的 cwd、commit 均使用该 `path`。

skill SHALL NOT 教授 `wt switch -x` / `--execute`（不在 skill 内拉起 agent/editor；session 生命周期由宿主 harness 管）。仅在 `wt` 完全不可用且用户明确授权时，才允许降级到 `git worktree add`，否则禁止降级。

#### Scenario: 同名 worktree 已存在
- **WHEN** 目标分支 worktree 已存在
- **THEN** agent reuse，不盲删

#### Scenario: 解析 path 后约束 cwd
- **WHEN** 创建成功返回 `path`
- **THEN** 此后所有 bash/cd 使用该 path，主 checkout 视为只读（除非用户明确要求改主树）

### Requirement: 合并门禁（核心纪律）

skill SHALL 在 SKILL.md 顶层、加粗呈现唯一的硬护栏：merge / remove 仅在用户明确确认后执行；未表态则停止、只 report。

具体门禁矩阵：

| 用户意图 | Agent 动作 |
|----------|------------|
| 明确「合入 / merge / 合回 main」 | 可执行 `wt merge`（或用户偏好 git/PR 流程）；执行前用 `wt list` / diff 再确认一次摘要 |
| 明确「丢弃 / 删掉这条线」 | `wt remove`；dirty 时非用户明确 force 不用 `-f`；未合并分支不用 `-D` 除非用户确认 |
| 未表态 | 停止，只 report，不 merge/remove |

skill SHALL 用 positive 措辞为主轴（「merge/remove 只在人确认后；未表态则停、只 report」），仅保留无法正向表述的硬护栏为禁止项。

#### Scenario: 未获确认不合入
- **WHEN** 用户未明确表达合入/丢弃
- **THEN** agent 不执行 `wt merge`、不向基底 `git merge`、不 push 合入结果，只 report（branch/path/commit/wt list 状态/建议下一步）

#### Scenario: 确认合入
- **WHEN** 用户明确「合入 / merge / 合回 main」
- **THEN** agent 可执行 `wt merge`，执行前再次展示摘要

#### Scenario: 确认丢弃
- **WHEN** 用户明确「丢弃 / 删掉这条线」且 worktree dirty
- **THEN** agent 仅在用户明确 force 时用 `-f`；未合并分支仅在用户确认时用 `-D`

### Requirement: 汇报内容

agent 结束一轮实现后 SHALL 汇报：branch、path、关键 commit（若有）、`wt list` 中该行状态（dirty / ahead）、建议的人下一步（合入 / 继续改 / 丢弃）。

#### Scenario: 一轮实现后汇报
- **WHEN** agent 完成一轮实现
- **THEN** 汇报上述全部项，然后停在门禁前等待人确认

### Requirement: 推荐 path 模板与 config 边界

skill SHALL 在 user config 层推荐以下 `worktree-path` 模板（写入 `~/.config/worktrunk/config.toml`，非 project config）：

```toml
worktree-path = "~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}"
```

效果为 `~/projects/worktrees/<repo-name>/<branch-sanitized>/`。

skill SHALL 保留用户已有自定义 `worktree-path`，仅当无配置时推荐写入；可选保守段 `[merge] remove = false` 仅在用户同意时写入。

skill SHALL NOT 擅自写 project `.config/wt.toml` hooks（`pre-start` / `pre-merge` 等）。

#### Scenario: 用户已有自定义模板
- **WHEN** `wt config show` 显示用户已设非默认 `worktree-path`
- **THEN** 保留用户配置，仅在 show 里展示当前生效值，不覆盖

### Requirement: 安装参考下沉（progressive disclosure）

skill SHALL 把安装/doctor 细节、平台矩阵（macOS brew / cargo / Windows `wt` vs `git-wt` 冲突 / `wiredtiger` 冲突）、shell 集成下沉到 `references/install.md`，由 SKILL.md 通过 context pointer 触发，SHALL NOT 在 SKILL.md 主体展开这些细节。

#### Scenario: 环境未就绪时触发安装参考
- **WHEN** preflight 失败需要安装/冲突排查
- **THEN** agent 读取 `references/install.md`

### Requirement: 命令白名单与黑名单

skill SHALL 明确命令白名单（教授）与黑名单（默认禁止）：

白名单：`wt --version`、`wt config show`、`wt config create`、`wt config shell install`（仅在 preflight 缺集成且用户同意时）、`wt list [--format json]`、`wt switch --create <branch> --no-cd --format json`、`wt switch <branch> --no-cd --format json`、`wt switch ^ --no-cd`、`wt remove <branch> [-f|-D]`（门禁下）、`wt merge [target]`（门禁下）。

黑名单（默认禁止）：`wt switch -x` / `--execute` 拉起 claude/codex/pi；未确认的 `wt merge`；未确认的 `wt remove -f` / `-D`；擅自写 project hooks；启用 LLM commit generation / CI summary 作为必选依赖；调用 superpowers `using-git-worktrees` 或其它强制 setup+test 的 worktree skill。

#### Scenario: 混用其它 worktree skill
- **WHEN** 环境同时存在 superpowers `using-git-worktrees`
- **THEN** 本 skill 默认禁用混用，SKILL.md 写一句说明即可

### Requirement: Catalog 登记与全局同步

`.pi/capabilities.yaml` 的 `global.skills` SHALL 追加 `worktrunk-isolation`，使其经 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/skills/`，对所有 Pi session ambient 可用。

README 与 `docs/getting-started.md` SHALL 按 `docs/reference/readme-governance.md` 增加一行能力描述。

#### Scenario: 同步后全局可用
- **WHEN** 执行 `scripts/sync-pi-agent.sh`
- **THEN** `~/.pi/agent/skills/worktrunk-isolation/` 存在且被 pi-core 识别
