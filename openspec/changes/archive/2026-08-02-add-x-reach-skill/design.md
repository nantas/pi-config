# Design

## Context

`agent-reach` 的 twitter 后端在本机不可用（`twitter` CLI 未装，退化到 OpenCLI 浏览器自动化），X 检索频繁超时/限流/掉会话。调研选定 `vladkens/twscrape`（2643★，2026-07-31 仍活跃，账号池轮换 + SQLite 持久会话 + JSONL 输出 + cookie 认证）作为稳定检索后端。本 design 说明如何实现 `specs/x-reach-skill/spec.md` 定义的行为。

参考证据：
- twscrape CLI 能力面（README）：search / tweet_details / tweet_replies / tweet_thread / retweeters / user_by_login / user_tweets(_and_replies) / following / followers / lists / communities / trends
- twscrape 无全局默认 db，仅 `--db` 参数 → 命令模板必须固定 `--db ~/.x-reach/accounts.db`
- 账号管理：`add_cookie`（cookie 模式，立即可用）/ `add_accounts`+`login_accounts`（账密模式，需 IMAP/手动验证码）
- 限流：按账号×端点追踪，限流即锁定该账号该操作至重置时间并切下一个活跃账号
- 环境变量：`TWS_PROXY`（中国大陆必需）/ `TWS_RAISE_WHEN_NO_ACCOUNT` / `TWS_HTTP_BACKEND=curl`（TLS 指纹）

## Goals / Non-Goals

**Goals:**
- 文档 skill + `x-reach-init.sh`，对齐 agent-reach 极简风格（零 wrapper CLI，命令模板带 `--db`）
- 固定 db 路径 `~/.x-reach/accounts.db`，cookie 本地化永不进仓
- 跨环境可复现：init 脚本装 pipx+twscrape、建目录、引导 cookie 导入、doctor 自检
- 文档主推 2-3 号轻量账号池 + 限流自动轮换 + 重试链（含 GraphQL 端点漂移的预期管理）
- 与 agent-reach 按场景分工，不动 agent-reach 文件
- manifest 登记 `global.skills`

**Non-Goals:**
- 不做写操作（twscrape 只读，YAGNI）
- 不写 wrapper CLI（命令模板带 `--db` 即可）
- 不做 cookie 跨机器同步（安全红线）
- 不改 agent-reach
- 不把 twscrape 声明为 Pi package（系统级 Python 工具，由 init 脚本管理）

## Decisions

**D1 架构 = 文档 skill + init 脚本（grilling 决策①）**
理由：agent-reach 风格，agent 读文档直接调 twscrape CLI。唯一脚本 `x-reach-init.sh` 解决「跨环境复现」+「固定 db 路径」两个摩擦，其余靠文档命令模板。无 wrapper CLI（YAGNI）。

**D2 cookie 永不同步，`~/.x-reach/accounts.db` 本地化（grilling 决策②，安全边界）**
理由：X `auth_token`+`ct0` = 账号登录态，泄露即盗号。pi-config 会 `sync-pi-agent.sh` 全局分发，任何进 `.pi/skills/x-reach/` 的文件都会被同步。仓库只放 `accounts.txt.example` 占位模板；新机器跑 init 重导自己的 cookie。此决策值得 ADR（architecture.md 记录），因满足「难逆转 + 需背景 + 真实权衡」三标准。

**D3 日常命令模板统一带 `--db ~/.x-reach/accounts.db`（grilling 决策⑤）**
理由：twscrape 无全局默认 db，漏带会在 cwd 建空 db 并报错（安全失败，不泄密）。文档模板统一带 `--db`，agent 照抄，对齐 agent-reach「`twitter search -n 10` 带参数」的自然写法，零额外脚本。

**D4 账号池 = 2-3 号轻量池（grilling 决策③）**
理由：账号轮换抗限流的最佳甜点，多号管理/封号风险又不高。文档主推 cookie 模式（无头/SSH 可用，相对 OpenCLI 的核心优势），`add_cookie` 即激活无需 login 流程。

**D5 与 agent-reach 按场景分工，不改 agent-reach 文档（grilling 决策④）**
理由：agent-reach 是第三方包的副本，上游更新时改动易被覆盖。靠 SKILL.md description wording（专注稳定/专门/批量 X）区分，综合多平台调研仍走 agent-reach。

**D6 安装走 pipx（ponytail 默认）**
理由：与 agent-reach 生态一致（twitter-cli/bili-cli 都走 pipx）。init 脚本先确保 pipx 存在。本机当前无 pipx，init 负责补齐。

**D7 只读范围（ponytail 默认）**
理由：twscrape 本身是只读 scraper。spec 明确排除写操作，YAGNI 不预留接口。

**D8 桌面 cookie 抓取为可选便利，手贴为主推（apply 阶段补充）**
理由：apply 中用 `browser_cookie3` 从 Chrome 提 cookie 跑通了 live 验证，固化成 `x-reach-grab-cookie.sh` 可解决「桌面首账号初始化」摩擦。但手贴仍是全环境通用 baseline（无头/SSH 无浏览器，自动抓取正交于 x-reach 的无头卖点）。抓取脚本设为**可选**，失败优雅 fallback 到手贴指引。三硬约束文档化：① 只抓当前登录号（多号要切浏览器账号）；② Chrome 137+ app-bound encryption 可能失效；③ Keychain 每次弹授权。`browser_cookie3` 装在独立 `~/.x-reach/grab-venv`（机器本地，不进仓），不污染 twscrape 的 pipx 环境。

## Risks / Migration

**R1 GraphQL 端点漂移（不可控外部风险）**
twscrape 同样依赖 X GraphQL 端点（与 twitter-cli 同源问题）。X 改端点会导致临时 404/failure，只能靠 twscrape 维护者跟进修端点（issue #322/#325 模式，活跃）。本 skill 通过重试链缓解（重试→upgrade twscrape→稳定命令兜底→agent-reach OpenCLI 兜底），**不能消除**。文档须明确预期管理，避免误以为 twscrape 免疫端点变更。

**R2 账号封禁风险**
多账号 + 高频调用有封号风险（尤其 VPS/数据中心 IP）。文档须警告：住宅代理或本地环境优先，`following`/`followers` 谨慎调用。cookie 来源的号需信任度评估。

**R3 cookie 泄露面 = 本机所有可读进程**
`~/.x-reach/accounts.db`（SQLite，明文 cookie）可被本机任意同权限进程读取。这是 cookie 模式的固有代价，换取无 GUI/无头可用。文档注明风险，建议单用户机器/受限权限目录。不可通过加密同步解决（D2 已排除跨机同步）。

**R4 漏带 `--db` 的安全失败**
无 `--db` 会在 cwd 建空 `accounts.db` 并报「no accounts」。安全（不泄密）但浪费一次调用。文档标注为已知 sharp edge，靠命令模板约定规避。不为此写 wrapper（YAGNI，D1）。

**Migration**：无既有 x-reach 用户，无迁移。从 agent-reach twitter 迁移是可选的、按场景的（D5），agent-reach twitter 模块保留作 fallback，不强制切换。
