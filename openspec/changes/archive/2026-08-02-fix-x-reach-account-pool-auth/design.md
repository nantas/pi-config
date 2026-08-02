# Design

## Context

`add-x-reach-skill`（已归档）引入的账号池工作流存在致命缺陷：实测同浏览器 profile 换号后，db 中之前存的账号报 `XClIdAccountError: Logged-out X web app`。根因经 twscrape 源码 + 实战证据锁定，需修正 spec R5/R9 + 文档。

**证据链**（本 design 全部决策的事实基础）：
1. `auth_token` 是会话凭证，登出即 X 服务端作废
2. twscrape `xclid.py:65-83`：每次请求前请求 X 首页解析 JS bundle，若 X 返回 `entry-client-logged-out` bundle（正则 `entry-client-logged-out(?:[-.][^/?#]+)?\.js`），抛 `XClIdAccountError("Logged-out X web app")`
3. twscrape `queue_client.py:332-335`：捕获后冷却 15min 换号——但 session 本质已死，冷却后仍错，唯一恢复是 relogin
4. **实测（Chrome cookie 库）：`x.com` 域下 `auth_token`/`ct0` 各只 1 份**。X 的浏览器内多账号切换器本质是「切换 active session」——切号时替换单槽 cookie。因此 cookie 模式天然一次一号，抓第二个号必先切换，而切换触发服务端失效。这不是偶发，是必然构造
5. README「Accounts」段：账密 `login_accounts` 是 twscrape 提供的多账号官方路径（独立 login + email_password IMAP，session 互不顶替）——定位为本 change 的「按需升级」路径
6. issue #268（@BonifacioCalindoro，2 年生产用户）：账号轮换不封号；失效主因 = ct0/IP ban（共享 spam 代理）；正解 = 批量账号 + 批量独立代理 + 每账号永久绑定代理 + relogin；reset_locks 无法修 logged-out（只清限流锁）

## Goals / Non-Goals

**Goals:**
- spec R5/R9 修正：**cookie 单号为务实默认**，明确「Chrome 单槽→一次一号」实测铁证与同浏览器换号=登出=失效硬警告；账密 `login_accounts` 降为**按需升级**路径，非默认推荐
- spec R10 新增：logged-out 错误的根因 + relogin 修复路径（明确 reset_locks 无效）
- setup.md 账号池段重写为「单号默认 + 多号升级」、grab-cookie.sh 降级+警告、SKILL.md 预期管理补错

**Non-Goals:**
- 不删 grab-cookie.sh（降级保留为单账号首导入便利）
- 不做代理管理脚本（issue #268 提及，YAGNI，留后续）
- 不改 capabilities.yaml / CONTEXT.md
- 不重新设计 cookie 同步策略（ADR-001 安全红线不变）

## Decisions

**D1 cookie 单号为务实默认，多号按需升级（修正核心，实测后调整）**
理由：实测确认 Chrome cookie 库 `x.com` 域 `auth_token`/`ct0` 各只 1 份，X 切换器切换=替换单槽，cookie 模式天然一次一号。但单号 twscrape（持久 session + TLS 指纹 + 活跃维护）已远超 agent-reach OpenCLI 后端，覆盖多数检索场景。账密 `login_accounts` 需准备 email_password（X 几乎必触发验证码），门槛较高，应定位为「单号不够用时按需升级」而非默认推荐。setup.md 以单号为主路径，多号为独立升级章节。

**D2 cookie 模式重新定位：单号务实默认（实测构造决定，非「优先」妥协）**
理由：原 change 把 cookie 当多账号默认是错的，但反向把账密当唯一正道也用力过猛。实测后的准确表述：cookie 因 Chrome 单槽构造 = 一次一号，但单号已足够务实；多号必须来自独立环境（不同 profile/设备/IP），且抓完不在源浏览器动那个号。同浏览器换号抓取 = 登出 = 旧快照失效，硬禁止。

**D3 grab-cookie.sh 降级为单账号便利，删除多号换号误导**
理由：原脚本定位「桌面便利」没错，但 R9 的「Multi-account requires browser re-login」scenario 是错误指引来源。修正：脚本保留，加硬警告「抓完别动浏览器，多号走账密」；删除任何「换浏览器号抓多账号」表述。

**D4 R10 新增 logged-out 错误处理，明确 reset_locks 无效**
理由：实测错误 `XClIdAccountError: Logged-out X web app` 是 server-side 失效信号，非限流。`reset_locks` 只清限流锁，对已死 session 无效——这是易踩的坑，必须文档化。恢复 = relogin/relogin_failed（账密重登，独立浏览器）或 del_accounts 删号。

## Risks / Migration

**R1 已按错误指引操作的现有用户**
有用户可能已用 cookie 建了多号池（部分已失效）。修正文档不强制迁移他们的 db，但 setup.md 加「诊断与恢复」段：失效号用 relogin_failed 或 del_accounts，之后改走 login_accounts。无数据丢失风险（失效号本就不可用）。

**R2 login_accounts 需 email_password + IMAP**
账密模式要求 email_password（X 几乎必触发验证码）。这比 cookie 门槛高，但 cookie 多号本就不可行，无替代。setup.md 明确写清要求。

**R3 代理管理未纳入**
issue #268 表明 IP 风控是失效主因之一，但代理管理脚本超出本次修正范围。文档加「代理与 IP 风控」段提示，脚本留后续 change（YAGNI）。

**Migration**：无数据格式变更。主 spec R5/R9 修正 + R10 新增，archive 时同步覆盖主 spec。
