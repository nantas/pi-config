# Agent Reach Twitter 登录

Twitter/X 的站内搜索、时间线和回复要在 Agent Reach 专用浏览器里有有效登录。公开网页摘要不算登录成功。上游 skill 只要求用户本人登录，不覆盖本机这种「按钮看得见但点不了」的失败。

## 何时读

用户要站内搜推文、看动态、看回复，或 `agent-reach twitter` 返回 `NEED_LOGIN`，或登录窗口里「登录 / 继续」看得见但点不了。

## 硬边界

- 用户本人在专用窗口登录。不代点、不代填、不索要密码，不把 Cookie 写进日志或命令回显。
- `~/.agent-reach/config.yaml` 里保留的 `twitter_auth_token` / `twitter_ct0` 不是 1.6 的 Twitter 登录。不要灌进浏览器，也不要改走 `twitter` CLI。站内后端是 OpenCLI。
- 验收看真实搜索结果，不看 Cookie 是否存在。

## 1. 确认专用浏览器是 CloakBrowser

```bash
agent-reach browser status
```

可用：`backend` 为 `cloakbrowser`，`fallback_reason` 为 null，`opencli_connected` 为 true。

`backend` 为 `chrome` 且 `fallback_reason` 含 CloakBrowser 失败时，停用当前登录窗口。那是带远程调试的系统 Chrome，`navigator.webdriver` 为 true。X 会画出「使用手机继续 / 继续」，点击被丢掉。小红书和 B 站没有这层检查，它们能登录不能证明 Twitter 窗口可用。

## 2. 修 CloakBrowser，再换窗口

只动 `~/.agent-reach/tools/cloakbrowser/venv`，不关用户日常 Chrome。

1. `cloakbrowser install` 报 `No module named 'playwright._impl._js_handle'`：把该 venv 内 `cloakbrowser/human/engine.py` 的导入改成 `from playwright._impl.js_handle import JSHandle`。Playwright 1.65 改了私有模块名，Agent Reach 钉住的 cloakbrowser 0.6.3 仍用旧名。重装这个 venv 后要再改一次。
2. 接着报 `Using SOCKS proxy, but the 'socksio' package is not installed`：本机 `ALL_PROXY` 是 SOCKS。在同一个 venv 执行 `pip install socksio`，再安装。缓存目录用 `CLOAKBROWSER_CACHE_DIR=~/.agent-reach/cloak-binaries`。
3. 二进制就绪后执行 `agent-reach browser setup --retry-cloak`。这会关掉当前专用窗口，把旧 Chrome 配置改名备份，用 CloakBrowser 开新配置，并写回已保存的 Cookie。`restored_cookies` 大于 0 只表示写入了，不表示每个站仍有效。
4. 再看 `browser status`：`chrome` 指向 `~/.agent-reach/cloak-binaries/` 下的 Chromium。新登录页上 `navigator.webdriver` 应为 false。

端口：9222 若已被用户的 Chrome 监听，执行 `agent-reach configure browser-port <空闲端口>`。本机当前是 9333。专用浏览器听这个端口，不要听 9222，也不要关掉用户那个 Chrome。

## 3. 打开登录

```bash
agent-reach login twitter
```

窗口打开后交给用户。页面可能从 `https://x.com/i/flow/login` 跳到 `/i/jf/onboarding/web?mode=login`。登录期间不要关窗口，不要再开一个系统 Chrome 让用户重试。

Twitter 不跑 `agent-reach login twitter --sync`。`--sync` 是雪球的步骤。

## 4. 验收

用户说登完之后：

```bash
agent-reach twitter search "openai" --limit 2
```

通过：`ok` 为 true，`backend` 为 `opencli`，`items` 里有非空推文正文。失败码按 skill 的 `error.hint` 处理，不循环重开窗口。

## OpenCLI 版本

1.6.1 接受 OpenCLI `>=1.8.7`，排除 `1.8.8`，测试钉死 `1.8.7`。`agent-reach add twitter` 报版本不在范围内时，用户同意后用 `agent-reach add twitter --allow-upgrade`。它安装测试钉死版本，不要改成 npm 最新版。
