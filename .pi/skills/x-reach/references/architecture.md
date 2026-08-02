# 架构与设计决策

## 定位

x-reach 是 X/Twitter **只读检索**通道，twscrape 账号池驱动。解决 agent-reach 的
twitter 后端（依赖 twitter-cli 单账号或 OpenCLI 浏览器自动化）超时/限流/掉会话问题。

## 后端选型：为何是 twscrape

| 候选 | 结论 |
|------|------|
| **vladkens/twscrape** ✅ | 2643★，2026-07-31 仍活跃提交；账号池轮换（核心）+ SQLite 持久会话 + cookie 认证（无头可用）+ JSONL 输出 |
| trevorhobenshield/twitter-api-client | 1892★ 但 2024-05 停更 2 年，排除 |
| d60/twikit | 活跃但限流处理不如 twscrape 系统化，单账号为主 |
| twitter-cli（agent-reach 现用） | 依赖 GraphQL 端点 + 无账号轮换，单号限流即整链失败 |

twscrape 最新 commit 正是 `fix: cap NetworkError retries per account, backoff then rotate`
（限制单账号重试，退避后轮换）——直接对症超时/限流。

## 核心机制

### 账号池轮换（抗限流）
twscrape 按**账号 × 端点**追踪限流。某账号某操作被限流时，锁定该账号该操作至重置时间
（通常约 15min），自动切下一个活跃账号。**正常请求成功后立即解锁**（不占用账号），
只有限流才会锁定——所以多账号场景下账号轮换只在需要时发生，不是每次请求都换号。
单号被限流时只能等解锁，这是多账号升级的核心价值。

### SQLite 持久会话
会话存 `~/.x-reach/accounts.db`，重启不丢登录态。相对 OpenCLI「每次依赖浏览器 GUI」，
twscrape cookie 模式在 SSH/Docker/无头环境可用。

### JSONL 输出
一行一个 JSON 对象，agent 天然友好（`jq` 或直接消费）。相对 twitter-cli 的 yaml，
更适合程序化处理。

## 预期管理：twscrape 不是银弹

**twscrape 同样依赖 X 的 GraphQL 端点。** X 改端点会导致临时 404/failure，
只能靠 twscrape 维护者跟进修端点（issue #322/#325 模式，活跃，几乎每天提交）。

twscrape 系统性解决的是：
- ✅ 限流（账号池轮换）
- ✅ 超时（NetworkError 退避 + 轮换，commit #325）
- ✅ 掉会话（SQLite 持久化）

twscrape **不能**消除的是：
- ❌ X 改 GraphQL 端点的临时失效（靠上游维护者跟进）
- ❌ 账号封禁风险（多号高频调用固有问题）

应对：重试链（重试 → upgrade twscrape → 稳定命令兜底 → agent-reach OpenCLI 兜底）。

---

## ADR-001：Cookie 永不跨机同步

**状态**：Accepted
**日期**：2026-08

### 背景

X 的 `auth_token` + `ct0` cookie = 账号登录态，泄露即被盗号。pi-config 仓库通过
`sync-pi-agent.sh` 全局分发到 `~/.pi/agent/`，任何放进 `.pi/skills/x-reach/` 的文件
都会被同步到所有机器。用户明确要求「在其他环境初始化依赖」，因此账号跨机器复现是刚需。

### 决策

`accounts.db`（含 cookie/session）固定放 `~/.x-reach/accounts.db`（机器本地），
**永不进 pi-config 仓库、永不随 sync-pi-agent.sh 同步**。仓库只放
`scripts/accounts.txt.example` 占位模板。每台机器各自重导自己的 cookie。

### 三标准自检（满足才记 ADR）

1. **难逆转** ✅ —— 一旦 cookie 进过仓库/git 历史，撤销成本极高（需强制重写历史 + 撤销所有 cookie）。
2. **需背景** ✅ —— 未来读者会问「为何不加密同步 cookie 省去每台机重导？」需解释泄露面权衡。
3. **真实权衡** ✅ —— 备选方案（环境变量编码同步 / age 加密同步 git）存在，被否决：
   - 环境变量：`.env` 仍是明文 cookie，泄露面 = 任何能读该文件的进程；
   - 加密同步：需管理加密密钥，密钥泄露即全军覆没，且超出 agent-reach 极简风格。

### 权衡代价

- 跨机复现需每台机手动重导 cookie（init 脚本引导，约 2 分钟）。
- 便利性损失换取零 cookie 出本机的安全边界。

### 泄露面声明

`~/.x-reach/accounts.db` 是 SQLite，cookie 明文存储，可被本机任意同权限进程读取。
这是 cookie 模式换取无 GUI/无头可用的固有代价。建议：单用户机器、`~/.x-reach/` 权限 700
（init 脚本已设置）。不可通过加密同步解决（本 ADR 已排除跨机同步）。

---

## ADR-002：不写 wrapper CLI，命令模板带 --db

**状态**：Accepted

### 背景

twscrape 无全局默认 db，仅 `--db` 参数。漏带会在 cwd 建空 `accounts.db` 并报错。

### 决策

不写 wrapper CLI 包装 twscrape。SKILL.md / references 的命令模板统一带
`--db ~/.x-reach/accounts.db`，agent 照抄（对齐 agent-reach「`twitter search -n 10` 带参数」
的自然写法）。

### 理由

- 对齐 agent-reach 极简风格（文档 skill，零可执行代码）。
- 漏带 `--db` 是安全失败（建空 db 报错，不泄密），风险可接受。
- wrapper CLI 增加维护成本（PATH、升级、错误处理），YAGNI。

---

## 与 agent-reach 的分工

不修改 `.pi/skills/agent-reach/` 任何文件（agent-reach 是第三方包副本，上游更新时改动
易被覆盖）。靠 SKILL.md description wording 按场景分工：

- **agent-reach**：多平台综合调研（X 只是其中一站，其 twitter 模块作轻量兜底）
- **x-reach**：专门/批量/稳定抓 X，或 agent-reach twitter 不可用时

共存不冲突。不强制从 agent-reach 迁移，agent-reach twitter 模块保留作 fallback。
