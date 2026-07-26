---
name: worktrunk-isolation
description: 用 git worktree 给多 session 并行作业做文件系统隔离，并强制人确认合入门禁。MUST USE 当用户提到 worktree / worktrunk / `wt` / 并行 session / 多 agent 同仓 / 另开一条线 / 不要动我现在的工作区 / 在隔离环境改 / independent branch / isolate / parallel sessions 时。管隔离与门禁，不管多 agent 编排。
---

# worktrunk-isolation

让 **agent** 用社区工具 worktrunk（CLI 名 `wt`）管理 git worktree，实现多 session 工作互不影响。工具面选定 `wt`，不自研编排。**人**负责开多 session、审 diff、口头确认合入或丢弃。

## 何时使用 / 不使用

**使用**（agent 自主加载）：用户提到 worktree / worktrunk / `wt` / 并行 session / 多 agent 同仓 / 「另开一条线做 X」/「不要动我现在的工作区」/「在隔离环境改」，且当前在 git 仓。

**不使用**：纯问答、只读检索；或用户明确要求在当前目录改且接受互相覆盖。

## Preflight（每次隔离前先做，全绿才继续）

Preflight **就是**环境就绪检查（doctor），无需独立脚本。逐项跑，失败则停止并读 `references/install.md`：

| # | 检查 | 通过 | 失败动作 |
|---|------|------|----------|
| 1 | `command -v wt` | 可执行 | 安装指引（`references/install.md`） |
| 2 | `wt --version` | 可解析版本 | 同上 |
| 3 | `git rev-parse --show-toplevel` | 成功 | 提示不在 git 仓 |
| 4 | `wt config show` | 可运行 | 引导 `wt config create` |
| 5 | `worktree-path` 解析 | 已配置或已按下方推荐写入 | 写入前说明，不覆盖用户已有非默认模板 |
| 6 | 目标父目录可创建 | `mkdir -p` 成功 | 报权限/路径错误 |

shell 集成缺失视为 **ok**——agent 自动化始终 `--no-cd --format json`，不依赖它。

## Protocol（生命周期，唯一步骤主轴）

```
preflight → create|reuse → work_only_in_path → commit_on_branch → report → (await human) → merge | remove
```

每步**完成标准**（满足才进下一步）：

- **preflight**：上表 6 项全绿。
- **create|reuse**：已解析返回 JSON 的 `path` 与 `branch`。同名 worktree 已存在则 **reuse**，不盲删。
- **work_only_in_path**：此后所有文件读写、bash 的 cwd、commit 均落在该 `path`。主 checkout 视为只读，除非用户明确要求改主树。
- **commit_on_branch**：改动已提交到隔离分支（或用户明确说先不提交）。
- **report**：已汇报 branch、path、关键 commit、`wt list` 该行状态（dirty / ahead）、建议的人下一步（合入 / 继续改 / 丢弃）。
- **await human**：停在门禁前，等用户明确意图。

> **隔离 path** 是本协议的执行约定锚点：拿到 `path` 后，一切后续操作都在它上面。

## 🚷 合并门禁（merge gate）

> **唯一硬护栏，反复回到这里**：merge / remove 只在用户**明确确认**后执行；未表态则**停止**，只 report。

| 用户意图 | Agent 动作 |
|----------|------------|
| 明确「合入 / merge / 合回 main」 | 执行前用 `wt list` / diff 再展示一次摘要，然后可 `wt merge`（或用户偏好的 git/PR 流程） |
| 明确「丢弃 / 删掉这条线」 | `wt remove`；dirty 时**仅**在用户明确 force 时用 `-f`；未合并分支**仅**在用户确认时用 `-D` |
| 未表态 | **停止**，只 report，不 merge / remove |

默认保守：合入后是否删 worktree 跟随用户 worktrunk config（`merge.remove`）。

## Command recipes（命令白名单）

```bash
# 查询
wt --version
wt config show
wt list [--format json]

# 创建 / 复用（agent 一律 --no-cd --format json）
wt switch --create <branch> --no-cd --format json     # 新建，解析返回 JSON 的 path/branch
wt switch <branch>      --no-cd --format json         # 复用已存在
wt switch ^             --no-cd                       # 回默认分支 worktree

# 门禁下才执行
wt merge [target]                                     # 用户明确合入后
wt remove <branch>            ;干净时
wt remove <branch> -f         ;用户确认丢弃脏树
wt remove <branch> -D         ;用户确认删未合并分支

# 配置（preflight 缺集成且用户同意时）
wt config create
wt config shell install zsh -y
```

**命令面边界**：`wt merge` / `wt remove -f` / `-D` 一律走上方门禁（未确认就不动）。其余边界——`wt switch -x` / `--execute` 不用（session 生命周期交给宿主 harness）；只写 user config，不写 project `.config/wt.toml` hooks；LLM commit generation / CI summary 为可选而非必选；与 superpowers `using-git-worktrees`（强制 setup+test）**默认禁用混用**。

## Config（推荐 user config，不碰 project hooks）

推荐写入 **user** config `~/.config/worktrunk/config.toml`（非项目 config）：

```toml
worktree-path = "~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}"
# 可选保守段，仅在用户同意时写：
[merge]
remove = false   # 合入后保留 worktree，便于人审
```

效果：`~/projects/worktrees/<repo-name>/<branch-sanitized>/`，多仓互不踩路径。**用户已有自定义 `worktree-path` 则保留**，仅在 `wt config show` 里展示当前生效值。

---

preflight 失败 → `references/install.md`（brew/cargo 安装、`wt` vs `wiredtiger` / Windows `git-wt` 冲突、平台矩阵、shell 集成）。
