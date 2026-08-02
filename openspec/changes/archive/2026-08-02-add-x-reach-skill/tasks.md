# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 通读 `specs/x-reach-skill/spec.md`，确认 8 条 requirement 的实现落点（SKILL.md / references / init 脚本 / manifest 各覆盖哪些）
- [x] 1.2 确认外部依赖前置：`pipx` 可装、`twscrape` 通过 `pipx install twscrape` 可用、`~/.x-reach/` 目录约定

## 2. 核心实现任务

- [x] 2.1 本地可行性验证（先验证工具能跑通再写文档，避免脱节）
  - 装 `pipx` + `pipx install twscrape`（可选 `twscrape[curl]` TLS 指纹）
  - 建 `~/.x-reach/`，导入一个真实 cookie 账号
  - 跑通 `twscrape --db ~/.x-reach/accounts.db user_by_login <known-user>` 与一次 `search`，确认 JSONL 输出可消费
  - 验证方式：命令成功返回 JSONL，账号 `logged_in=True`
  - **完成**：twscrape 0.19.2 已装；cookie 账号已导入并跑通两条真实查询——`user_by_login elonmusk`（返回 Elon 真实资料 JSONL，2.4亿粉丝）+ `search "AI agents lang:en" --limit=3`（返回 23 行 JSONL，首条可解析）；样例落 /tmp/x-reach-search.jsonl
- [x] 2.2 写 `scripts/x-reach-init.sh`（覆盖 requirement: Init Script Shall Reproduce The Environment）
  - 确保 pipx → 装 twscrape → 建 `~/.x-reach/` → doctor/自检 → 打印 cookie 导入命令
  - headless 分支推荐 `add_cookie`（不推荐 GUI 依赖路径）
  - 幂等：已配置机器重跑不覆盖 `accounts.db`，仅报账号池状态
  - 验证方式：fresh 模拟下脚本能走到「打印导入命令」；重跑幂等
- [x] 2.3 写 `scripts/accounts.txt.example`（占位模板，覆盖 requirement: Credentials Shall Never Leave The Local Machine）
  - 仅占位符（`auth_token=REPLACE_ME; ct0=REPLACE_ME`），头部注明真实文件只放 `~/.x-reach/`、永不进仓
  - 验证方式：`grep` 确认无任何真实凭证；git 不追踪 `~/.x-reach/`
- [x] 2.4 写 `SKILL.md`（覆盖 requirement: Skill Shall Provide ... / Differentiate From Agent-Reach / Manage Expectations）
  - description：定位稳定/专门/批量 X 只读检索，不与 agent-reach 抢通用触发词
  - 常驻规则：动手先跑 doctor/`accounts` 自检、声明在用 x-reach、失败按重试链
  - 命令模板统一带 `--db ~/.x-reach/accounts.db`
  - 重试链：重试 → `pipx upgrade twscrape` → 稳定命令兜底 → agent-reach OpenCLI 兜底
  - 预期管理：twscrape 依赖 GraphQL 端点，端点漂移靠上游跟进
  - 验证方式：description wording 不与 agent-reach 冲突；所有命令含 `--db`
- [x] 2.5 写 `references/setup.md`（覆盖 requirement: Account Pool Shall Persist / Document Account Pool Operation）
  - cookie 导入步骤（`add_cookie`）、2-3 号轻量池默认、`accounts`/`stats`/`reset_locks`/`relogin_failed`/`delete_inactive` 维护
  - 跨环境复现：新机器 init + 重导 cookie
  - 限流自动轮换说明
  - 验证方式：按文档步骤可在新目录复现一个可用账号池
- [x] 2.6 写 `references/commands.md`（覆盖完整只读命令面）
  - search / tweet_details / tweet_replies / tweet_thread / retweeters / user_by_login / user_about / user_tweets(_and_replies) / user_media / following / followers / verified_followers / lists / communities / trends，全部带 `--db` 与 JSONL 说明
  - 验证方式：命令清单与 twscrape README 一致，全部含 `--db`
- [x] 2.7 写 `references/architecture.md`（含 ADR：cookie 本地化安全边界）
  - 记 D2 决策（难逆转 + 需背景 + 真实权衡），解释为何不跨机同步 cookie
  - 记与 agent-reach 分工、twscrape 依赖 GraphQL 的预期管理
  - 验证方式：ADR 三标准自检通过
- [x] 2.8 manifest 登记（覆盖 requirement: Skill Shall Be Registered In The Capability Manifest）
  - `.pi/capabilities.yaml` 的 `global.skills` 追加 `x-reach`
  - 验证方式：`sync-pi-agent.sh --dry-run`（若有）或人工核对条目存在
- [x] 2.9 桌面 cookie 抓取便利脚本（覆盖 requirement: Skill MAY Offer A Desktop Cookie-Grab Convenience With Manual Fallback）
  - 写 `scripts/x-reach-grab-cookie.sh`：browser_cookie3 从 Chrome 提 auth_token+ct0 → add_cookie，失败 fallback 手贴指引
  - 手贴仍为 SKILL/setup 主推（全环境通用）；grab 为桌面可选便利
  - browser_cookie3 装独立 `~/.x-reach/grab-venv`，不污染 twscrape 的 pipx 环境
  - 验证方式：实测 `grab-cookie.sh acc2` 成功导入 acc2 入池（与 acc1 同浏览器登录态，脚本逻辑验证通过）

## 3. 收敛与验证准备

- [x] 3.1 整理 spec-to-implementation 覆盖矩阵：8 条 requirement → 对应文件/脚本段落（见 verification.md）
- [x] 3.2 整理 task-to-evidence：每个任务的实际验证命令输出（init 跑通截图、search JSONL 样例、manifest 条目 diff）
- [x] 3.3 安全自查：`git status` 确认 `~/.x-reach/` 与任何 `accounts.db`/cookie 未进仓；`.gitignore` 必要时补 `~/.x-reach/` 外溢防护
  - 已验证：`~/.x-reach/` 在 home 目录、仓库天然隔离；仓库内所有 `auth_token=` 后均为占位符（xxx/yyy/REPLACE_ME），无真实 cookie 痕迹

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification 结论生成 `writeback.md`（目标=`CONTEXT.md`，字段映射=OpenSpec 索引「扩展」组追加 `x-reach-skill` slug）
- [x] 4.3 执行 writeback：归档阶段追加 `CONTEXT.md` OpenSpec 索引，记录可审计证据（提交链接、时间）
  - **完成**：`CONTEXT.md` 「扩展」组追加 `X 检索、Twitter 检索、twscrape | x-reach-skill`；主 spec 已同步到 `openspec/specs/x-reach-skill/spec.md`（`openspec spec list` 识别）
