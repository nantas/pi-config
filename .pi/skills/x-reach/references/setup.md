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
- **仅首账号便利**——抓完**别动浏览器**：不登出、不在 X 切换器切到别的号（会触发服务端失效，见下警告）
- 失败（无浏览器/未登录/Chrome 加密漂移/Keychain 被拒）自动回退手贴指引
- 无头/SSH 环境不可用 → 直接走手贴

> ⚠️ **同浏览器换号 = 必然失效（实测铁证）**：Chrome 的 `x.com` 域下 `auth_token`/`ct0` 各只存 1 份，
> X 的浏览器内多账号切换器本质是「替换单槽 session」。在浏览器里切号会触发服务端把旧 session 标记失效，
> 导致 db 里之前存的 cookie 快照报 `XClIdAccountError: Logged-out X web app`。**这不是偶发，是构造性必然。**
> 多账号需求见下文「多账号升级（可选）」，不要靠浏览器换号抓取。

## 单号 cookie 模式（务实默认）

**大多数场景单号就够。** 即使只一个号，twscrape 相比 agent-reach OpenCLI 后端已有质变提升：
持久 session（重启不丢登录态）+ TLS 指纹伪装（降风控）+ 活跃维护者跟进 GraphQL 端点。
单号被限流时 twscrape 会锁定该账号该操作至重置时间（默认等约 15min）自动重试，无需人工。

```bash
# 验证池状态（单号也是“池”，只是只有 1 个）
twscrape --db ~/.x-reach/accounts.db accounts
twscrape --db ~/.x-reach/accounts.db stats
```

> ℹ️ **cookie 模式下 `logged_in` 可能显示 `0`/`False`**（该字段本用于账密 login 流程），
> 不代表 cookie 失效。以 `total_req` 增长 + 实际请求成功为准。跑一次
> `user_by_login <known-user>` 即可验证 cookie 是否真的工作。

> ⚠️ **保持浏览器里那个号登录着**。单号模式下 cookie 是那个号 session 的快照——
> 一旦你在浏览器里登出它（或在 X 切换器切到别的号），服务端 session 失效，
> db 里的快照会报 `XClIdAccountError: Logged-out`。详见「诊断与恢复」。

## 多账号升级（可选，单号不够用时）

**为什么需要**：单号被频繁限流、等待明显；或担心单号失效无冗余。twscrape 多账号会
**自动轮换**——某号某操作被限流即锁，自动切下一个活跃账号。

**为什么 cookie 做不了多号**：实测 Chrome `x.com` 域 `auth_token`/`ct0` 各只 1 份，
X 切换器换号=替换单槽 session 并触发服务端失效。要凑多号，必须用账密 `login_accounts`，
twscrape 对每号跑独立 login 流程，session 互不顶替。

```bash
# 1. 准备账号文件 ~/.x-reach/accounts.txt（每行：用户名:密码:邮箱:邮箱授权码）
#    邮箱授权码：Gmail 开两步验证后生成「应用专用密码」；QQ邮箱用授权码；飞书需开 IMAP 客户端授权
acc_a:PassA:acc_a@gmail.com:GmailAppPass
acc_b:PassB:acc_b@example.com:EmailAppPass

# 2. 追加到 db（重名自动跳过，不覆盖已有账号）
twscrape --db ~/.x-reach/accounts.db add_accounts ~/.x-reach/accounts.txt \
  username:password:email:email_password

# 3. login 新加的未激活账号（已登录的老号零干扰）
twscrape --db ~/.x-reach/accounts.db login_accounts

# 4. 验证
 twscrape --db ~/.x-reach/accounts.db accounts
```

**账密模式要点**：
- `login_accounts`（无参数）只 login `active=false` 的号，**热扩安全**——边用边加，老号继续可用
- X 几乎必触发邮箱验证码，twscrape 通过 IMAP 自动读（需邮箱开启 IMAP + 应用专用密码）
- 可选每账号绑独立代理（issue #268 实战：IP 风控是失效主因，独立代理能大幅降低）
- 检索时**轮换全自动**，agent/用户无需手动切号

## 账号池运维（限流/失效恢复）

```bash
# 某号被限流、累计失败、或报 Logged-out → 用账密重登（独立 login，不经浏览器）
twscrape --db ~/.x-reach/accounts.db relogin acc1        # 指定号
twscrape --db ~/.x-reach/accounts.db relogin_failed      # 批量重登所有失败号

# 重置所有限流锁（账号被限流后强制解锁，谨慎用）
# ⚠️ 只能清限流锁，救不活 server-side 失效的 session（见「诊断与恢复」）
twscrape --db ~/.x-reach/accounts.db reset_locks

# 清理失活账号 / 删除指定账号
twscrape --db ~/.x-reach/accounts.db delete_inactive
twscrape --db ~/.x-reach/accounts.db del_accounts acc3
```

## 诊断与恢复：logged-out 与其他错误

### `XClIdAccountError: Logged-out X web app`（session 服务端失效）

**根因**（非限流，非偶发）：X 服务端判定该 session 已死。两个原因：
1. **浏览器里登出/切号了**——cookie 模式最常见。登出即作废 auth_token，db 里的快照同步失效
2. **IP 风控**——共享/被标记的代理 IP 被服务端拒绝（issue #268 实战：这是失效主因之一）

**恢复**：
```bash
# 账密模式导入的号 → 直接 relogin（twscrape 重跑 login，不经浏览器）
twscrape --db ~/.x-reach/accounts.db relogin acc1

# cookie 模式导入的号 → 没有账密无法 relogin，只能删号重加
#   重新抓取前确保浏览器里那个号是登录着的状态（没被登出/切走）
twscrape --db ~/.x-reach/accounts.db del_accounts acc1
#   然后重新 add_cookie 或 grab-cookie.sh
```

⚠️ **`reset_locks` 不能救 logged-out**——它只清限流锁，对服务端已死的 session 无效。
遇到 Logged-out 别试 reset_locks，直接 relogin 或删号重加。

### 代理与 IP 风控（多账号场景重点）

issue #268（2 年生产用户）经验：账号轮换本身不会封号；ct0/Logged-out 失效主因是
**共享了被标记的代理 IP**。多账号 + 频繁检索时：
- 避免用最便宜的共享代理（可能与 spammer 共用 IP）
- 每账号绑独立代理（add_account 时传 `proxy=`，或 Python API）
- 某号反复失效 → 先换该号绑的代理再 relogin

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
