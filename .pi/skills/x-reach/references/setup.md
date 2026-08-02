# 初始化与账号池运维

## 一次初始化（新机器）

```bash
# 1. 复现环境（装 pipx+twscrape、建 ~/.x-reach/、自检、引导导入）
bash .pi/skills/x-reach/scripts/x-reach-init.sh

# 2. 导入 cookie（推荐 cookie 模式，无头/SSH/Docker 可用，无需 GUI 登录流程）
#    浏览器登录 x.com → DevTools(F12) → Application → Cookies → 复制 auth_token 和 ct0
twscrape --db ~/.x-reach/accounts.db add_cookie myacc "auth_token=xxx; ct0=yyy"
```

> cookie 模式（含 `ct0`）的账号**立即激活**，无需 `login_accounts` 流程。

### 🪄 桌面可选便利：自动抓取 cookie

Chrome 已登录 x.com 时，可跳过手贴，用脚本自动提 cookie 导入（仅桌面）：

```bash
bash .pi/skills/x-reach/scripts/x-reach-grab-cookie.sh myacc
```

- 首次自举 `~/.x-reach/grab-venv`（装 browser_cookie3，约 10s），之后秒开
- 会弹 macOS Keychain 授权框，点「始终允许」
- **只抓「Chrome 当前登录的那个 x.com 账号」**——加第 2、3 个号要先在浏览器切/重登 x.com
- 失败（无浏览器/未登录/Chrome 加密漂移/Keychain 被拒）自动回退手贴指引
- 无头/SSH 环境不可用 → 直接走手贴

## 轻量账号池（2-3 号，推荐默认）

twscrape 的核心稳定性来自**账号轮换**：单号被限流时自动锁定该账号该操作至重置时间，
切下一个活跃账号。2-3 号是最佳甜点——抗限流够用，多号管理/封号风险又不高。

```bash
# 导入 2-3 个 cookie 账号成池
twscrape --db ~/.x-reach/accounts.db add_cookie acc1 "auth_token=...; ct0=..."
twscrape --db ~/.x-reach/accounts.db add_cookie acc2 "auth_token=...; ct0=..."
twscrape --db ~/.x-reach/accounts.db add_cookie acc3 "auth_token=...; ct0=..."

# 查看池状态
twscrape --db ~/.x-reach/accounts.db accounts
twscrape --db ~/.x-reach/accounts.db stats
```

`accounts` 输出示例：

```
username  logged_in  active  last_used            total_req  error_msg
acc1      True       True    2026-08-01 03:20:40  100        None
acc2      True       True    2026-08-01 03:25:45  120        None
acc3      False      False   None                 120        Login error
```

> ℹ️ **cookie 模式下 `logged_in` 可能显示 `0`/`False`**（该字段本用于账密 login 流程），
> 不代表 cookie 失效。以 `total_req` 增长 + 实际请求成功为准。跑一次
> `user_by_login <known-user>` 即可验证 cookie 是否真的工作。

## 账号池运维（限流/失效恢复）

```bash
# 账号累计登录失败 → 批量重登（cookie 模式极少需要）
twscrape --db ~/.x-reach/accounts.db relogin_failed

# 重置所有限流锁（账号被限流后强制解锁，谨慎用）
twscrape --db ~/.x-reach/accounts.db reset_locks

# 清理失活账号
twscrape --db ~/.x-reach/accounts.db delete_inactive

# 删除指定账号
twscrape --db ~/.x-reach/accounts.db del_accounts acc3
```

## 账密模式（不推荐，仅备选）

cookie 模式不可用时（如无浏览器取 cookie），可走账密 + email 验证码：

```bash
# 占位模板：复制 scripts/accounts.txt.example → ~/.x-reach/accounts.txt，填真实值
twscrape --db ~/.x-reach/accounts.db add_accounts ~/.x-reach/accounts.txt username:password:email:email_password

# 登录所有未激活账号（自动 IMAP 读验证码；不可用时 --manual 手输）
twscrape --db ~/.x-reach/accounts.db login_accounts
twscrape --db ~/.x-reach/accounts.db login_accounts --manual
```

## 跨环境复现

cookie **永不跨机同步**（安全红线）。新机器流程：

1. `sync-pi-agent.sh` 同步 skill 到 `~/.pi/agent/skills/x-reach/`（仅文档+脚本）
2. `bash ~/.pi/agent/skills/x-reach/scripts/x-reach-init.sh` 复现依赖环境
3. 在新机器浏览器登录 x.com，重新取 `auth_token`+`ct0`，导入该机器的 `~/.x-reach/accounts.db`

详见 [architecture.md](architecture.md) 的 ADR（为何不跨机同步 cookie）。

## 代理（中国大陆必需）

x.com 在中国大陆需代理访问。twscrape 支持全局代理或按账号代理：

```bash
# 全局代理（环境变量）
export TWS_PROXY=socks5://user:pass@127.0.0.1:1080
twscrape --db ~/.x-reach/accounts.db search "query" --limit=10

# 或按账号代理（Python API，add_account 时传 proxy=）
```

代理优先级：`api.proxy` > `TWS_PROXY` > 账号 proxy。

## TLS 指纹（可选，降风控）

默认 `httpx` 后端。装 `curl-cffi` 后端可伪装浏览器 TLS 指纹，降低被 X 识别为脚本的概率：

```bash
pipx install 'twscrape[curl]'
export TWS_HTTP_BACKEND=curl
twscrape --db ~/.x-reach/accounts.db search "query" --limit=10
```

## 其他环境变量

| 变量 | 作用 | 默认 |
|------|------|------|
| `TWS_PROXY` | 全局代理 | 无 |
| `TWS_RAISE_WHEN_NO_ACCOUNT` | 无可用账号时抛错而非无限等待 | false |
| `TWS_HTTP_BACKEND` | `httpx` 或 `curl` | httpx |
| `TWS_WAIT_EMAIL_CODE` | email 验证码等待秒数 | 30 |
| `TWS_LOG_LEVEL` | 日志级别 | INFO |
| `TWS_TELEMETRY=0` | 关闭匿名遥测 | 开 |
