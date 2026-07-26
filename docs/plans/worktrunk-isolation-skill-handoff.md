# Handoff：跨项目 Worktree 隔离 Skill（worktrunk）

> **状态**：待在本仓（pi-config）开发  
> **来源 session**：my-wiki 多 agent 同仓并行调研 + worktrunk 选型（2026-07-26）  
> **目标产物**：全局/可安装 skill — 让 **agent** 用 worktrunk 管理 git worktree，实现多 session 文件系统隔离；**人类确认后再合入**  
> **改动规模**：新建 skill（SKILL.md + 可选 doctor 脚本）；可选登记 catalog / 全局安装路径；**不**做 agent 编排器

---

## 一、背景与动机

### 用户真实习惯（需求真源）

1. 习惯**同时开多个 session** 与不同 agent 讨论/执行需求。  
2. 需要不同 session 的 agent **工作互不影响**（独立 working tree / 独立 branch）。  
3. 每次工作结束后，由**人类确认**再合并回基底分支。  
4. **不要**工作流编排与 worktree 耦合（不要 tmux 舰队、不要 auto 启动 agent、不要 claim/lease 编排、不要 DAG）。  
5. 工具面只要 **git worktree 的命令包装**；选定社区工具 **worktrunk**（`wt`），不自研完整 CLI。  
6. 用户**自己不想敲 CLI**；**管理 worktree 的应是 agent**。  
7. 路径偏好集中管理：`~/projects/worktrees/<repo>/<branch>`（已在用户机验证可行）。  
8. Skill 必须 **跨项目通用**（放 pi-config，经 catalog / 全局 skills 安装到各仓与 `~/.pi/agent`）。

### 已验证的本地前提（勿重复调研）

| 项 | 结论 |
|----|------|
| 工具 | `worktrunk`（Homebrew formula，CLI 名 `wt`），定位 “Git worktree management, designed for parallel AI agent workflows” |
| 安装 | `brew install worktrunk`；与 `wiredtiger` 争 `wt` 二进制（macOS 一般无冲突） |
| 文档 | https://worktrunk.dev ；`wt --help` / `wt <cmd> --help` 质量高 |
| 用户配置路径 | `~/.config/worktrunk/config.toml` |
| 用户已定 path 模板 | `worktree-path = "~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}"` |
| 创建 API（agent 友好） | `wt switch --create <branch> --no-cd --format json` → `{"path","branch",...}` |
| 删除 API | `wt remove` 默认拒删 dirty；`-f` / `-D` 分属 worktree / unmerged branch |
| 明确不采用 | Orca / Claude `--worktree` 产品耦合 / worklease / superpowers `using-git-worktrees`（强制 setup+test）/ 自研编排 |

### 与「人类手敲 wt」方案的差异

上一轮融合结论默认「人敲 CLI」。**本 skill 翻转操作主体**：

| 角色 | 职责 |
|------|------|
| 人 | 开多个 session、分配任务、审 diff、**口头/明确指令确认合入或丢弃** |
| Agent | preflight、创建/定位 worktree、在正确 cwd 工作、提交、汇报、**仅在确认后** merge/remove |
| Skill | 跨项目协议 + 运行时检查/安装指引 + 命令白名单与禁令 |

---

## 二、目标 / 非目标

### 目标（MUST）

1. **跨项目通用** skill：不依赖 my-wiki 路径、不依赖特定业务仓结构。  
2. Agent 在「需要并行隔离」或「用户要求独立工作树」时，**主动**用 worktrunk 创建/进入 worktree。  
3. **Runtime 环境检查**：`wt` 是否安装、版本、shell 集成、用户 config、`worktree-path`、目标目录可写、当前是否 git 仓、default branch 可解析。  
4. **安装指导**：缺依赖时给出最短安装路径（brew / cargo / 校验命令），**不静默乱装**（除非用户明确授权安装）。  
5. **合入门禁**：未获用户明确确认，禁止 `wt merge` / 向基底 `git merge` / `push` 合入结果。  
6. **纯净命令面**：只教 worktree 生命周期；hooks / `-x` 启 agent / LLM commit / CI 装饰为可选且默认不启用。  
7. 产出可被 `install-from-pi-config` 或全局 skill 同步路径消费（本仓惯例）。

### 非目标（MUST NOT）

- 不实现多 agent 编排器、任务板、端口分配、worklease。  
- 不绑定 Claude Code / Cursor / Codex 的 product worktree 模式。  
- 不强制 project hooks、`pre-start` 装依赖、baseline tests。  
- 不替代用户的 merge 策略产品决策（squash vs merge commit 可配置提示，默认跟用户 worktrunk config）。  
- 不要求每个仓提交 `.config/wt.toml`（项目级 hooks 默认不引入）。

---

## 三、Skill 行为规格

### 3.1 触发条件

Agent 在以下情况 **应加载并遵循** 本 skill：

- 用户提到：并行 session、多 agent 同仓、互不干扰、worktree、worktrunk、`wt`、独立分支作业。  
- 用户说：另开一条线做 X / 不要动我现在的工作区 / 在隔离环境改。  
- 当前 session 被要求在「非主 checkout」落地改动，且仓库是 git。

不触发：纯问答、只读检索、明确要求在当前目录改且接受互相覆盖。

### 3.2 生命周期协议（核心）

```text
preflight → create|reuse → work_only_in_path → commit_on_branch → report →
  (await human) → merge | remove | leave
```

#### A. Preflight（每次需要隔离时先做）

按顺序检查，失败则停止并给安装/修复指令（见 §四）：

| # | 检查 | 通过标准 | 失败动作 |
|---|------|----------|----------|
| 1 | `command -v wt` | 可执行 | 安装指引 §4.1 |
| 2 | `wt --version` | 可解析版本 | 同上 |
| 3 | 当前目录为 git work tree / 能解析 repo root | `git rev-parse --show-toplevel` 成功 | 提示不在 git 仓 |
| 4 | 用户 config 存在或可安全使用默认 | `wt config show` 可运行 | 引导 `wt config create` + 写入 path 模板 |
| 5 | `worktree-path` 意图 | 优先尊重用户已有 config；若无配置，**推荐**写入集中路径模板（§3.4），写入前说明 | 不覆盖用户已有非默认模板除非用户同意 |
| 6 | 目标父目录可创建 | `mkdir -p` 成功 | 报权限/路径错误 |
| 7 | shell 集成（可选） | 交互 shell 下 `wt switch` 能 cd | agent 非交互场景用 `--no-cd --format json`，不强制 shell 集成 |

**Agent 非交互强制约定**：创建/查询一律带：

```bash
wt switch --create <branch> --no-cd --format json
# 或已存在：
wt switch <branch> --no-cd --format json
```

解析 JSON 的 `path` / `branch`，后续所有文件与 bash 的 cwd 使用该 `path`。

#### B. Create / Reuse

- 分支命名：短、可读、`sanitize` 安全（避免奇怪字符）；可用 `topic-<slug>` / 用户指定名。  
- 已存在同名 worktree：reuse，不要盲删。  
- **禁止** `wt switch -x ...` 启动 agent/editor（session 生命周期由人/宿主 harness 管）。  
- **禁止** 为「方便」fallback 到 `git worktree add` 除非 `wt` 不可用且用户授权降级。

#### C. Work

- 所有读写、测试、commit 仅在 worktree `path`。  
- 主 checkout（基底）视为只读，除非用户明确要求改主树。  
- 不跨 worktree 改同一未提交文件集。

#### D. Finish / Report

Agent 结束一轮实现后必须汇报：

- `branch`
- `path`
- 关键 commit（若有）
- `wt list` 中该行状态摘要（dirty / ahead）
- 建议的人下一步：`合入` / `继续改` / `丢弃`

#### E. Merge / Remove（门禁）

| 用户意图 | Agent 动作 |
|----------|------------|
| 明确「合入 / merge / 合回 main」 | 可执行 `wt merge`（或用户偏好的 git/PR 流程）；执行前用 `wt list` / diff 再确认一次摘要 |
| 明确「丢弃 / 删掉这条线」 | `wt remove`；有未提交时先说明，**非**用户明确 force 不用 `-f`；未合并分支不用 `-D` 除非用户确认 |
| 未表态 | **停止**，只汇报，不 merge/remove |

默认保守：`merge.remove = false` 时合入后 worktree 仍在，需用户再让 remove（与当前用户 config 一致即可）。

### 3.3 命令白名单 / 黑名单

**白名单（skill 应教授）**

```bash
wt --version
wt config show
wt config create
wt config shell install zsh -y    # 仅在 preflight 缺集成且用户同意时
wt list
wt list --format json
wt switch --create <branch> --no-cd --format json
wt switch <branch> --no-cd --format json
wt switch ^ --no-cd               # 回默认分支 worktree（若需要）
wt remove <branch>                # 干净时
wt remove <branch> -f             # 仅用户确认丢弃脏树
wt remove <branch> -D             # 仅用户确认删未合并分支
wt merge [target]                 # 仅用户确认合入
wt merge --no-remove ...          # 若需保留树
```

**黑名单（默认禁止）**

- `wt switch -x` / `--execute` 拉起 claude/codex/pi  
- 未确认的 `wt merge`  
- 未确认的 `wt remove -f` / `-D`  
- 擅自写 project `.config/wt.toml` hooks（`pre-start`/`pre-merge` 等）  
- 启用 LLM commit generation、CI summary 作为本 skill 必选依赖  
- 调用 superpowers `using-git-worktrees` 或其它「强制 setup+test」worktree skill

### 3.4 推荐默认 path 模板（跨项目）

与用户偏好一致，skill 安装指导中写为 **推荐默认**（写入 **user** config，非项目 config）：

```toml
# ~/.config/worktrunk/config.toml
worktree-path = "~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}"
```

效果：

```text
~/projects/worktrees/<repo-name>/<branch-sanitized>/
```

说明：

- `~` 由 worktrunk 展开。  
- 多仓互不踩路径。  
- 若用户已有自定义 `worktree-path`，**保留用户配置**，仅在 show 里展示当前生效值。

可选保守 merge 段（写入与否由 skill 安装步骤询问或文档建议，不强制覆盖）：

```toml
[merge]
remove = false   # 合入后保留 worktree，便于人审
```

### 3.5 与宿主 session 的衔接（pi / 其它）

Skill 只保证：**给出隔离 path，并在该 path 工作**。

- 若宿主支持「指定 cwd 开 session」：创建后把 `path` 交给宿主。  
- 若已在错误 cwd：agent 应用 `cd`/`-C` 纠正到 worktree path，或请用户在该 path 重开 session。  
- Skill **不**实现 session 多路复用本身。

---

## 四、Runtime 环境检查与安装指导（本需求硬性部分）

### 4.1 安装 worktrunk

**macOS（首选）**

```bash
brew install worktrunk
command -v wt && wt --version
```

注意：Homebrew 声明与 `wiredtiger` 冲突（都提供 `wt`）。若 `wt` 不是 worktrunk，指导：

```bash
brew info worktrunk
type -a wt
# 若被占用：用 cargo 安装并考虑 PATH，或 alias 到 worktrunk 的绝对路径
```

**通用（cargo）**

```bash
cargo install worktrunk
# 确保 ~/.cargo/bin 在 PATH
```

**校验**

```bash
wt --help
wt config show
```

### 4.2 用户配置与集中路径

```bash
# 若无 config
wt config create   # 或 skill 直接写入最小 config

# 推荐最小用户 config（示例）
# worktree-path = "~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}"

mkdir -p ~/projects/worktrees
```

Agent 应用 `wt config show` 确认 `worktree-path` 已生效；可用一次性 create smoke（可选）：

```bash
wt switch --create _wt-skill-smoke --no-cd --no-hooks --format json
# 确认 path 前缀为 $HOME/projects/worktrees/<repo>/
wt remove _wt-skill-smoke --force -D --no-hooks
```

### 4.3 Shell 集成（人用终端有用；agent 非交互可选）

```bash
wt config shell install zsh -y
# 新开终端，或：
eval "$(wt config shell init zsh)"
```

Skill 应写明：

- **Agent 自动化**：始终 `--no-cd --format json`，不依赖 shell 集成。  
- **人类本地**：建议安装 shell 集成，便于自己 `wt switch` 巡视（可选）。

### 4.4 Doctor 输出形态（建议实现）

Skill 宜提供 **一种** doctor 方式（二选一或都有）：

1. **纯文档 checklist**（agent 逐步跑命令）；或  
2. **小脚本** `scripts/worktrunk-doctor.sh`（推荐，退出码非 0 表示未就绪）：

期望输出（人类可读 + 可选 JSON）：

```text
[ok] wt binary: /opt/homebrew/bin/wt (0.69.x)
[ok] git repo: /Users/.../my-wiki
[ok] worktree-path: ~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}
[ok] base dir writable: /Users/.../projects/worktrees
[warn] shell integration: not installed (ok for agent --no-cd)
[fail] wt not found → brew install worktrunk
```

Doctor **不得** 在无用户同意时修改系统；`--fix` 若实现，须分步确认（装 brew 包、写 config、装 shell）。

### 4.5 平台矩阵（文档中写清）

| 平台 | 安装 | 备注 |
|------|------|------|
| macOS + brew | 一等公民 | 本需求主路径 |
| Linux + brew/cargo | 支持 | path 同模板 |
| Windows | `winget install max-sixty.worktrunk`；二进制可能是 `git-wt` | skill 需识别 `wt` vs `git-wt` 冲突 |

---

## 五、建议仓库落点（pi-config 内）

按本仓能力布局惯例（实现时可微调，但 handoff 默认如下）：

```text
pi-config/
  .pi/skills/worktrunk-isolation/     # 或 .agents/skills/... 二选一，与 catalog 一致
    SKILL.md                          # 主协议 + 触发 + 命令 + 门禁
    references/
      install.md                      # 安装与 doctor 详情（progressive disclosure）
      command-cheatsheet.md           # 可选：命令速查
    scripts/
      worktrunk-doctor.sh             # 可选但推荐
  docs/plans/worktrunk-isolation-skill-handoff.md  # 本文件
```

并在实现 PR 中评估：

- `capabilities.yaml` / catalog 是否登记该 skill  
- 全局同步到 `~/.pi/agent/skills/` 的路径是否走现有 `scripts/sync-*.sh`  
- README / getting-started 能力表是否需一行描述（遵循本仓 README 治理）

**命名建议**

- Skill 名：`worktrunk-isolation`（或 `git-worktree-isolation`）  
- 描述关键词：worktree, worktrunk, parallel sessions, isolate, multi-agent same repo, merge gate  

---

## 六、SKILL.md 内容大纲（实现时按此写，勿扩成编排手册）

1. **YAML frontmatter**：name / description（触发词含中英文）  
2. **When to use / When not**  
3. **Preflight**（链到 install.md）  
4. **Protocol**：create → work → report → await → merge/remove  
5. **Command recipes**（copy-paste 级，含 JSON 解析注意）  
6. **Merge gate**（加粗）  
7. **Config**：推荐 `worktree-path`；不碰 hooks  
8. **Failure table**：path occupied / dirty remove / not a git repo / wrong `wt` binary  
9. **Non-goals** 短列表  

文风：短句、表格、命令优先；中文面向用户说明可与英文命令并存（本仓全局 skill 可中英，但 **用户可见说明默认中文** 若与 AGENTS 一致）。

---

## 七、验收标准

### 功能验收

- [ ] 在**未装** worktrunk 的环境，agent 按 skill 给出正确安装命令且不瞎编路径。  
- [ ] 装好后 doctor 全绿（或仅 warn shell 集成）。  
- [ ] 在任意 git 仓：`create` 后 path 落在 `~/projects/worktrees/<repo>/...`（在用户采用推荐 config 时）。  
- [ ] 两 worktree 分别写入互不可见的未提交文件（隔离成立）。  
- [ ] 无用户「合入」指令时，agent 不执行 merge。  
- [ ] 用户确认合入后，变更进入基底分支；确认丢弃后 worktree 清理且无误删主仓。  
- [ ] 全程不出现 `-x claude` / 强制 npm install hooks 等耦合。

### 文档验收

- [ ] SKILL.md 可被新 session 仅读 skill 即执行闭环。  
- [ ] install.md 覆盖 brew/cargo/冲突/`git-wt`。  
- [ ] 明确「人确认合入」门禁。  
- [ ] 与 superpowers worktree skill 的关系：默认禁用/不要混用（写一句即可）。

### 回归

- [ ] `wt remove` 无 `-f` 时拒绝 dirty（skill 描述与实机一致）。  
- [ ] 分支名含 `/` 时 path sanitize 行为与文档一致。

---

## 八、实现任务拆分（建议）

1. 定 skill 目录与命名；写 SKILL.md 大纲落地。  
2. 写 `references/install.md` + doctor 脚本。  
3. 本机两仓 smoke（可 throwaway repo + 一真实仓）。  
4. 登记 catalog / 同步脚本 / README 一行（按治理要求）。  
5. （可选）在 `~/.pi/agent/AGENTS.md` 或模板里加「并行隔离 → 用 worktrunk-isolation」指针——**仅指针，不复制全文**。

---

## 九、风险与开放决策

| 项 | 说明 | 建议默认 |
|----|------|----------|
| `wt merge` 默认较「全能」（可 auto-commit/squash） | 可能超出「只合并已提交历史」预期 | skill 要求 merge 前展示将执行的策略；用户 config 已设 `remove=false` |
| 用户拒绝集中 path | 应用现有 config | 不强制改写 |
| Windows `wt` 冲突 | 需 `git-wt` | install.md 专节 |
| Agent 已在主树改脏 | create 前检测主树 dirty，提示是否先处理 | warn，不自动 stash |
| 是否提供 `--fix` 自动安装 | 安全敏感 | 默认只打印命令；`--fix` 需用户当次授权 |

**开放**：是否在 skill 内支持「仅创建 path、由 repo-agent 起子 session」的一行集成示例——建议 **附录可选**，不进入核心协议。

---

## 十、参考链接（实现时查阅）

- https://worktrunk.dev  
- https://worktrunk.dev/config/ （`worktree-path` 模板）  
- https://worktrunk.dev/switch/ / merge / remove  
- https://github.com/max-sixty/worktrunk  
- 本机已验证 config 样本（用户）：`~/.config/worktrunk/config.toml`  
- 相关调研会话结论：多 agent 同仓以 worktree 为隔离基元；编排层非本 skill 范围  

---

## 十一、给实现者的一句话

> 做一个 **跨项目、agent 驱动、带 doctor/安装指引** 的 worktrunk 协议 skill：管隔离与门禁，不管编排；合入必须人点头。
