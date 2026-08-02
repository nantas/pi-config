# Proposal

## 问题定义

`add-x-reach-skill`（已归档）引入的**多账号工作流是错的**，会导致已存账号失效。实测确认：在同一 Chrome profile 里换号登录第二个账号后，db 中之前存的 acc1 报 `XClIdAccountError: Logged-out X web app`。

**根因（twscrape 源码 + 实战证据双重确认）**：
- `auth_token` 是会话凭证，**登出即作废**（X 服务端标记 invalid，非本地 db 问题）
- twscrape 每次请求前请求 X 首页解析 JS bundle；若 X 返回 `entry-client-logged-out` bundle，判定 session 已死（`xclid.py:83`），抛 `XClIdAccountError`，冷却 15min 换号（`queue_client.py:332`）——但 session 本质已失效，冷却后仍错
- 原 change 的 R9 scenario「Multi-account requires browser re-login」+ setup.md「加第 2、3 个号要先在浏览器切/重登 x.com」**正是元凶**：同浏览器 profile 反复登入登出，必然让上一个号的 cookie 快照失效

**twscrape 官方正道**（README + issue #268 二年生产用户）：
- 多账号 = 账密 `login_accounts`（twscrape 对每号跑独立 login 流程，session 互不顶替，email_password 走 IMAP 收验证码）
- cookie 模式 = 仅单账号，或多 cookie 来自**独立环境**（不同浏览器 profile / 不同设备 / 不同 IP，且抓完不在浏览器动那个号）
- 账号轮换本身不封号；失效主因是 `ct0 not found / IP ban`（共享 spam 代理），修复 = 换代理 + relogin，非重抓 cookie

## 范围边界

**纳入**
- 修正主 spec R5（账号池运维）：**cookie 单号为务实默认**（实测 Chrome 单槽一次一号），账密 `login_accounts` 为按需升级路径，明确「同浏览器换号=登出=失效」硬警告
- 修正主 spec R9（grab 便利）：降级为「仅首账号」，删除「换浏览器号抓多账号」错误指引，加硬警告
- 新增主 spec R10（logged-out 错误处理）：根因说明 + `relogin`/`relogin_failed` 修复路径
- 修正 `references/setup.md` 多账号段、`scripts/x-reach-grab-cookie.sh` 警告、`SKILL.md` 预期管理

**不纳入**
- 删除 grab-cookie.sh（降级保留为单账号便利，仍有用）
- 改 capabilities.yaml（skill 已注册，无变更）
- 改 CONTEXT.md（slug 已登记）
- 引入代理管理脚本（issue #268 提及，但超出本次修正范围，YAGNI，留作后续）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `x-reach-skill`: 修正账号池鉴权工作流——cookie 单号为务实默认（实测 Chrome 单槽一次一号），账密 `login_accounts` 降为按需升级路径；明确警告「同浏览器换号=登出=失效」；新增 logged-out 错误处理规范（relogin，非 reset_locks）

## Capabilities 待确认项

- [x] 能力清单已确认（根因已由 twscrape 源码 + 实战证据锁定，修正方向无歧义；用户指令「请根据分析和发现重新整理修改方案并创建 change」）

## Impact

- **修改文件**：
  - `openspec/specs/x-reach-skill/spec.md`（R5 MODIFIED、R9 MODIFIED、R10 ADDED）
  - `.pi/skills/x-reach/references/setup.md`（多账号段重写）
  - `.pi/skills/x-reach/scripts/x-reach-grab-cookie.sh`（降级警告 + 删除多账号换号误导）
  - `.pi/skills/x-reach/SKILL.md`（预期管理补 logged-out 错误）
- **不改文件**：capabilities.yaml、CONTEXT.md、agent-reach、accounts.txt.example、x-reach-init.sh
- **全局同步**：修正后 `sync-pi-agent.sh` 分发更新到 `~/.pi/agent/skills/x-reach/`
- **风险**：修正会推翻原 change 的部分文档表述，但属纠错，越早改越好（当前指引会让用户持续丢账号）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`CONTEXT.md`（slug 已登记，不新增）、`.pi/capabilities.yaml`（已注册，不改）
  - 回写目标：无（纯 spec/文档修正）
