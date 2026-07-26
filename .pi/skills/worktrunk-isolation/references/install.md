# 安装与环境排查（worktrunk-isolation）

preflight 失败时读这里。覆盖安装、二进制冲突、平台矩阵、shell 集成。**不静默乱装**——默认只打印命令；需 `--fix` 类自动操作时必须用户当次授权。

## macOS（首选，brew）

```bash
brew install worktrunk
command -v wt && wt --version
```

### `wt` 二进制冲突排查

Homebrew 声明 `worktrunk` 与 `wiredtiger` 都提供 `wt`。若 `wt` 不是 worktrunk：

```bash
type -a wt
brew info worktrunk
# 若被占用：改用 cargo 安装并调整 PATH，或 alias 到 worktrunk 的绝对路径
```

macOS 一般无冲突（`wiredtiger` 少见），但仍需 preflight 第 1 项校验真实来源。

## 通用（cargo）

```bash
cargo install worktrunk
# 确保 ~/.cargo/bin 在 PATH
```

## Windows

```bash
winget install max-sixty.worktrunk
```

Windows 上二进制可能是 `git-wt` 而非 `wt`——skill 需识别二者并选用正确的命令名。

## 平台矩阵

| 平台 | 安装 | 备注 |
|------|------|------|
| macOS + brew | 一等公民 | 主路径 |
| Linux + brew/cargo | 支持 | `worktree-path` 模板同 |
| Windows | `winget` | 注意 `wt` vs `git-wt` |

## 用户配置与集中路径

```bash
# 若无 config
wt config create

# 推荐最小 user config（~/.config/worktrunk/config.toml）
# worktree-path = "~/projects/worktrees/{{ repo }}/{{ branch | sanitize }}"

mkdir -p ~/projects/worktrees
wt config show          # 确认 worktree-path 已生效
```

可选 smoke（确认 path 前缀）：

```bash
wt switch --create _wt-skill-smoke --no-cd --no-hooks --format json
# 确认 path 前缀为 $HOME/projects/worktrees/<repo>/
wt remove _wt-skill-smoke --force -D --no-hooks
```

## Shell 集成（人类本地可选；agent 非交互不用）

```bash
wt config shell install zsh -y
# 新开终端，或：
eval "$(wt config shell init zsh)"
```

- **Agent 自动化**：始终 `--no-cd --format json`，不依赖 shell 集成。
- **人类本地**：建议安装，便于自己 `wt switch` 巡视（可选）。

## 失败对照

| 现象 | 处理 |
|------|------|
| `wt` not found | 按上方安装；排查 `wiredtiger` / `git-wt` 冲突 |
| 不在 git 仓 | `git rev-parse --show-toplevel` 确认 cwd |
| 目标 path 已被占用 | reuse 同名 worktree，不盲删 |
| `wt remove` 拒删 dirty | 正常行为；需丢弃时用户明确 force 才用 `-f` |
| 分支名含 `/` | `{{ branch | sanitize }}` 处理；path 行为与文档一致 |
