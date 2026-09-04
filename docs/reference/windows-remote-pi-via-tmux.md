# 从 Windows 通过 SSH 和 tmux 使用 Mac 上的 Pi

本文说明如何从局域网内的 Windows 电脑连接到 Mac，在 Mac 上的持久 tmux session 中运行 Pi。

## 1. 架构与配置边界

连接链路：

```text
Windows Terminal → Windows OpenSSH Client → macOS sshd → Mac 上的 tmux → Mac 上的 Pi
```

配置职责：

- **Mac**：运行 SSH server、tmux 和 Pi；`~/.tmux.conf` 也配置在 Mac。
- **Windows**：运行终端和 SSH client；配置 Windows Terminal 的按键转发。
- Windows 不需要安装 Pi 或 tmux。若从 WSL 发起 SSH，也不要在 WSL 和 Mac 中重复嵌套 tmux。

## 2. 本机检查结论

检查时的状态：

- macOS ARM64。
- Pi `0.85.0`，安装于 Homebrew 全局路径。
- tmux 已从 `3.6a` 升级到 `3.7c`，满足 Pi 对 CSI-u 配置要求的最低版本 `3.5`。
- Homebrew 提供的最新稳定版为 `3.7c`。
- tmux 运行依赖完整：`libevent 2.1.13`、`ncurses 6.6`、`utf8proc`、`jemalloc 5.3.1`。
- `screen-256color` 和 `tmux-256color` terminfo 均可用。
- OpenSSH server 端口 22 可连接，当前 macOS 用户属于 SSH 访问组。
- Mac 接通电源时系统睡眠已禁用，网络唤醒已启用。
- 当前没有运行中的 tmux server，因此重启或升级 tmux 不会终止现有 session。
- 当前 `~/.ssh/authorized_keys` 不存在；可先用 Mac 密码登录，之后再配置公钥。

### 仅源码构建时缺少的工具

现有 tmux 二进制和 Homebrew 升级不受影响。只有手工从源码编译时才需要补齐：

- release tarball：`pkg-config`；
- Git checkout：额外需要 `autoconf`、`automake`；
- 本机已有系统 `yacc`，Homebrew 安装会自行管理其构建依赖。

## 3. Mac 上的 tmux 配置

当前 `~/.tmux.conf` 已完成 Pi 推荐配置：

```tmux
set -g extended-keys on
set -g extended-keys-format csi-u
```

最小完整配置：

```tmux
set -g mouse on
set -g default-terminal "tmux-256color"
set -g extended-keys on
set -g extended-keys-format csi-u
```

`screen-256color` 是 tmux 手册允许的值，不必为了 Pi 修改。tmux 上游示例使用更精确的：

```tmux
set -g default-terminal "tmux-256color"
```

本机已采用该值，并已通过独立 tmux server 验证。

### 为什么需要 extended keys

Pi 优先协商 Kitty keyboard protocol；不可用时会请求 xterm mode-2 extended keys。tmux 默认关闭 `extended-keys`，可能把 `Enter`、`Shift+Enter`、`Ctrl+Enter` 都退化为普通 Enter。

CSI-u 模式下典型序列为：

```text
Shift+Enter → ESC [ 13 ; 2 u
Ctrl+Enter  → ESC [ 13 ; 5 u
Alt+Enter   → ESC [ 13 ; 3 u
```

Pi 同时支持 CSI-u 和 tmux 的 xterm `modifyOtherKeys` 格式，但官方文档推荐 CSI-u。

### 重新加载

Pi 文档要求完整重启 tmux：

```bash
tmux kill-server
tmux
```

`tmux kill-server` 会结束所有 session 及其进程。执行前先用 `tmux ls` 确认没有需要保留的工作。

## 4. tmux 升级结果

判断：

- 原版本 `3.6a` 已满足 Pi 要求，因此本次升级不是兼容性硬性要求。
- 已升级至稳定版 `3.7c`，获得 macOS 内存分配及 Windows Terminal 粘贴处理等修复。

已执行：

```bash
brew upgrade tmux
```

升级后确认：

```bash
tmux -V
tmux new -d -s tmux-check
tmux show -gv extended-keys
tmux show -gv extended-keys-format
tmux kill-session -t tmux-check
```

预期输出包含：

```text
on
csi-u
```

## 5. Windows Terminal 配置

Pi 的 Windows Terminal 文档要求显式转发 `Shift+Enter`。

打开：

```text
Windows Terminal → Settings → Open JSON file
```

在 `actions` 数组中加入：

```json
{
  "command": {
    "action": "sendInput",
    "input": "\u001b[13;2u"
  },
  "keys": "shift+enter"
}
```

完整结构示例：

```json
{
  "actions": [
    {
      "command": {
        "action": "sendInput",
        "input": "\u001b[13;2u"
      },
      "keys": "shift+enter"
    }
  ]
}
```

如果文件已有 `actions`，只追加对象，不要创建第二个 `actions` 字段。修改后完全关闭并重新打开 Windows Terminal。

Windows Terminal 默认使用 `Alt+Enter` 切换全屏；若需要把它交给 Pi，还需删除该默认动作并配置对应的 `sendInput`，本方案不要求这样做。

## 6. Windows OpenSSH 配置

先检查 Windows 端：

```powershell
Get-Command ssh
ssh -V
Get-AppxPackage Microsoft.WindowsTerminal | Select-Object Name, Version
Test-NetConnection <mac-lan-ip> -Port 22
```

创建或编辑：

```text
%USERPROFILE%\.ssh\config
```

示例：

```sshconfig
Host mac-pi
    HostName <mac-lan-ip>
    User <mac-user>
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Mac 的当前地址可在 Mac 上查询：

```bash
ipconfig getifaddr en1
whoami
```

局域网 IP 可能由 DHCP 改变，建议在路由器中为 Mac 设置 DHCP 地址保留。若 Windows 能解析 Bonjour/mDNS，也可以把 `HostName` 设置为 Mac 的 `<local-host-name>.local`。

## 7. 指定工作目录并启动 Pi

### 推荐：一个项目一个 session

直接在指定目录创建或重新连接 session，并让 tmux 启动 Pi：

```powershell
ssh -t mac-pi "tmux new-session -A -s pi-config -c /Users/<mac-user>/projects/pi-config /opt/homebrew/bin/pi"
```

参数含义：

- `-t`：要求 SSH 分配伪终端；tmux/Pi 的交互模式需要它。
- `-A`：session 已存在时 attach，不存在时创建。
- `-s pi-config`：session 名称。
- `-c ...`：新建 session 的起始工作目录。
- 最后的 `/opt/homebrew/bin/pi`：tmux 新 session 中直接执行 Pi。

如果 session 已经存在，`-A` 会直接 attach；新的 `-c` 和启动命令不会重建现有 session。因此建议每个项目使用固定且不同的 session 名，例如 `pi-config`、`pi-mono`。

### 先进入 shell，再手动运行 Pi

```powershell
ssh -t mac-pi "tmux new-session -A -s pi-config -c /Users/<mac-user>/projects/pi-config"
```

进入后：

```bash
pi
```

这种方式在退出 Pi 后仍会保留 shell。直接把 Pi 作为 pane 命令时，退出 Pi 通常也会结束该 pane；如果它是 session 中最后一个 pane，session 随之结束。

## 8. SSH 公钥登录

当前 Mac 尚未配置 `authorized_keys`，可以先使用账户密码。需要免密登录时，在 Windows PowerShell 执行：

```powershell
ssh-keygen -t ed25519
Get-Content "$HOME\.ssh\id_ed25519.pub" |
  ssh <mac-user>@<mac-lan-ip> "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

然后在 Windows SSH 配置的 `Host mac-pi` 中加入：

```sshconfig
IdentityFile ~/.ssh/id_ed25519
```

只复制 `.pub` 公钥；不要发送、上传或粘贴私钥。

## 9. tmux 基础用法

创建或连接 session：

```bash
tmux new -As pi
```

管理 session：

```bash
tmux ls
tmux attach -t pi
tmux kill-session -t pi
```

默认前缀为 `Ctrl-b`。按下并松开前缀，再按命令键：

```text
Ctrl-b d       脱离 session，进程继续运行
Ctrl-b c       新建 window
Ctrl-b n/p     下一个/上一个 window
Ctrl-b 0..9    切换到指定 window
Ctrl-b %       左右分屏
Ctrl-b "       上下分屏
Ctrl-b 方向键  切换 pane
Ctrl-b z       放大/还原当前 pane
Ctrl-b [       进入复制和滚动模式
Ctrl-b ?       查看完整快捷键
```

tmux server、session、window、pane 的关系：

- 一个用户通常运行一个 tmux server；
- server 管理多个 session；
- session 包含多个 window；
- window 可拆分为多个 pane；
- SSH 断线只会失去 client，server 和 session 继续运行。

## 10. 端到端验证

Windows 连接：

```powershell
ssh -t mac-pi "tmux new-session -A -s pi-check -c /Users/<mac-user>/projects/pi-config /opt/homebrew/bin/pi"
```

在 Pi 中验证：

1. 输入一行文字，按 `Shift+Enter`，确认插入换行而不是提交。
2. 按普通 `Enter`，确认提交消息。
3. 按 `Ctrl-b d` 脱离。
4. 重复连接命令，确认恢复同一个 Pi session。
5. 关闭并重开 Windows Terminal，再重复一次，确认设置持久生效。

排查命令：

```bash
tmux -V
tmux show -gv extended-keys
tmux show -gv extended-keys-format
echo "$TERM"
infocmp "$TERM" >/dev/null && echo "terminfo ok"
```

若 Pi 内仍无法区分 `Shift+Enter`：

1. 确认 Windows Terminal 的 `sendInput` action 已加载；
2. 确认连接命令包含 SSH `-t`；
3. 确认 Mac 的 tmux 输出为 `on` 和 `csi-u`；
4. 完整结束旧 tmux server 后重新创建 session；
5. 避免在 WSL 本地 tmux 中再次连接 Mac tmux。

## 11. 安全注意事项

- macOS 应用防火墙检查时处于关闭状态；只应在可信局域网暴露 SSH，并建议后续启用防火墙。
- 优先使用 SSH 公钥而不是长期依赖密码。
- 不要把 API token、密码或私钥写入本文档或 Windows SSH 配置。
- 本机 shell 启动文件中存在明文凭据；在扩大 SSH 使用前，建议迁移至安全凭据存储并轮换。

## 12. 依据

- [tmux source repository](https://github.com/tmux/tmux)
- [tmux source manual (`tmux.1`)](https://github.com/tmux/tmux/blob/master/tmux.1)
- [tmux example configuration](https://github.com/tmux/tmux/blob/master/example_tmux.conf)
- [tmux release changes](https://raw.githubusercontent.com/tmux/tmux/3.7c/CHANGES)
- [Pi tmux documentation](https://pi.dev/docs/latest/tmux)
- 本机安装包文档：`/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/tmux.md`
- 本机安装包终端文档：`/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/terminal-setup.md`
