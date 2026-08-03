---
name: x-reach
description: >
  专门用于 X/Twitter（推特）的稳定检索通道，twscrape 账号池驱动（2-3 号轮换
  抗限流 + SQLite 持久会话 + JSONL 输出）。MUST USE 当用户需要稳定/专门/批量
  X 检索，或 agent-reach 的 twitter 后端不可用/超时/限流时——例如「批量抓某
  用户的推文」「X 上搜某关键词」「稳定读一条推文和回复」「抓某 List/Community
  的推文」。

  与 agent-reach 分工：agent-reach 管「多平台综合调研里的轻量 X」；x-reach 管
  「稳定/专门/批量/agent-reach-X-挂了」的场景。只读，不支持发帖/点赞/关注。

  【后端】twscrape CLI（async scraper，账号池轮换 + cookie 认证，无头环境可用）。
  【部署】未初始化时先跑 .pi/skills/x-reach/scripts/x-reach-init.sh。
triggers:
  - 批量/稳定 X 检索: 批量抓推特/批量抓X/抓某用户全部推文/stable twitter/stable X
  - X 搜索: x.com 搜/X 上搜/推特搜关键词/twitter search/搜推文
  - 读推文: 读这条推文/推文回复/twitter thread/X 长文/推文详情
  - List/Community: X list/X 社区/X community/推特列表
  - agent-reach 兜底: agent-reach twitter 挂了/twitter 超时/twitter 限流/推特抓不到
metadata:
  homepage: https://github.com/vladkens/twscrape
---

# x-reach — X/Twitter 稳定检索通道

twscrape 账号池驱动。**专门/批量/稳定 X 检索用它，不要自己发明方案，也不要在
agent-reach 的 twitter 后端挂掉时反复重试。**

## 常驻规则（全程适用）

1. **动手前自检账号池**：`twscrape --db ~/.x-reach/accounts.db accounts`
   ——确认有 `logged_in=True` 的账号，否则先初始化（见下）。
2. **声明你在用 x-reach**：开始干活前说一句「使用 x-reach 检索 X」。
3. **命令必须带 `--db`**：所有 twscrape 调用统一带 `--db ~/.x-reach/accounts.db`，
   且 `--db` 在子命令**之前**（twscrape `--db <path> search ...`）。
   漏带会在 cwd 建空 `accounts.db` 并报错——安全失败（不泄密）但浪费一次调用。
4. **输出是 JSON Lines**：一行一个 JSON 对象，agent 直接消费；写 `/tmp/` 落盘。
5. **失败按重试链处理**（见下），不要瞎猜命令。

## 首次/新机器初始化

```bash
# 1. 复现环境（装 pipx+twscrape、建 ~/.x-reach/、自检、引导导入）
bash .pi/skills/x-reach/scripts/x-reach-init.sh

# 2. 导入 cookie（主推：手贴，全环境通用）
#    浏览器登录 x.com → DevTools(F12) → Application → Cookies → 复制 auth_token 和 ct0
twscrape --db ~/.x-reach/accounts.db add_cookie myacc "auth_token=xxx; ct0=yyy"
```

> 🪄 **桌面可选便利（抓当前激活号）**：Chrome 已登录 x.com 时，可用 `bash .pi/skills/x-reach/scripts/x-reach-grab-cookie.sh myacc`
> 自动从浏览器提**当前激活号**的 cookie 导入。多号 = 每号各抓一次（切换激活号后重跑，见 [setup.md](references/setup.md)）。
> 真正会让某号失效的是浏览器里**登出**它，切换/添加号不影响。

> ℹ️ **大多数场景单号就够**。即使只一个号，twscrape（持久 session + TLS 指纹）已远超 agent-reach
> OpenCLI 后端。多账号是「单号不够用时按需升级」，见 setup.md「多账号升级」。

## 常用命令（命令模板，照抄）

```bash
# 搜索推文（JSONL）
twscrape --db ~/.x-reach/accounts.db search "openai lang:en" --limit=20

# 单条推文 + 回复
twscrape --db ~/.x-reach/accounts.db tweet_replies TWEET_ID --limit=20
twscrape --db ~/.x-reach/accounts.db tweet_details TWEET_ID
twscrape --db ~/.x-reach/accounts.db tweet_thread TWEET_ID --limit=20

# 用户资料 / 时间线 / 媒体
twscrape --db ~/.x-reach/accounts.db user_by_login USERNAME
twscrape --db ~/.x-reach/accounts.db user_tweets USER_ID --limit=20
twscrape --db ~/.x-reach/accounts.db user_media USER_ID --limit=20

# 转推者 / 关注关系
twscrape --db ~/.x-reach/accounts.db retweeters TWEET_ID --limit=20
twscrape --db ~/.x-reach/accounts.db following USER_ID --limit=20
twscrape --db ~/.x-reach/accounts.db followers USER_ID --limit=20

# List / Community / Trends
twscrape --db ~/.x-reach/accounts.db list_timeline LIST_ID --limit=20
twscrape --db ~/.x-reach/accounts.db community_tweets COMMUNITY_ID --limit=20
twscrape --db ~/.x-reach/accounts.db trends news
```

> 完整命令面（含 search 语法、输出字段、--raw）见 [references/commands.md](references/commands.md)。

## 失败重试链（按序执行，成功即停）

1. **直接重试一次**（偶发失败常见）。
2. **升级 twscrape**（X 改了 GraphQL 端点，维护者已修）：`pipx upgrade twscrape`
3. **换稳定命令兜底**：search 失败时改用 `user_tweets` / `tweet_details`（不同端点）。
4. **降级到 agent-reach OpenCLI**：`opencli twitter search "query" -f yaml`（桌面，浏览器登录态）。

### 特殊错误：`XClIdAccountError: Logged-out X web app`

**不在重试链里**——这不是偶发/限流，是 **session 服务端失效**，重试和升级都救不了。根因：
- 浏览器里**登出**了某号（cookie 模式最常见；切换/添加其他号不影响，每号独立 session）
- 或 IP 被风控（共享代理被标记）

恢复：账密号 `relogin`，cookie 号删号重加。⚠️ `reset_locks` **无效**（只清限流锁）。
详见 [setup.md](references/setup.md)「诊断与恢复」。

> ⚠️ **预期管理**：twscrape 同样依赖 X 的 GraphQL 端点。X 改端点会导致临时 404/failure，
> 只能靠 twscrape 维护者跟进修端点（活跃，几乎每天提交）。这是不可控外部风险，**任何
> scraper 都不能免疫**，区别在于 twscrape 限流/超时/掉会话问题被账号池+持久会话系统性解决。

## 常用搜索语法

twscrape 用 X 原生搜索语法（`twitter-advanced-search` 完整指南）：

```
"openai lang:en"              关键词 + 语言
"from:elonmusk"               某用户发的
"since:2026-01-01 until:2026-02-01"  时间范围
"openai min_faves:100"        最少点赞
"$AAPL"                       $话题符号
```

## 与 agent-reach 的分工

| 场景 | 用谁 |
|------|------|
| 多平台综合调研（X 只是其中一站） | agent-reach（其 twitter 模块作轻量兜底） |
| 专门/批量/稳定抓 X（用户时间线、批量 search、List/Community） | **x-reach** |
| agent-reach 的 twitter 超时/限流/不可用 | **x-reach** |

x-reach 不修改 agent-reach 任何文件，纯靠场景分工共存。

## 详细文档

- [setup.md](references/setup.md) — 初始化、账号池运维（add/stats/reset_locks/relogin）、跨环境复现、代理
- [commands.md](references/commands.md) — 完整只读命令面、search 语法、JSONL 输出字段
- [architecture.md](references/architecture.md) — 设计决策与 ADR（cookie 本地化安全边界）

## 安全红线

- `~/.x-reach/accounts.db` 含明文 X cookie = 账号登录态，**仅限本机**。
- 永不进 pi-config 仓库、永不随 `sync-pi-agent.sh` 同步、每台机器各自重导。
- 仓库内只有 `scripts/accounts.txt.example` 占位模板。
