# Verification

## Spec-to-Implementation 覆盖矩阵

`specs/x-reach-skill/spec.md` 定义 8 条 requirement，全部有实现落点：

| # | Requirement | 实现落点 | 状态 |
|---|-------------|---------|------|
| R1 | Skill Shall Provide Twscrape-Driven Read-Only X Retrieval | SKILL.md「常用命令」+ references/commands.md（完整只读命令面，明确排除写操作） | ✅ |
| R2 | Account Pool Shall Persist In A Fixed Local Database | SKILL.md 常驻规则3「命令必须带 `--db`」+ 所有命令模板统一 `--db ~/.x-reach/accounts.db` + commands.md | ✅ |
| R3 | Credentials Shall Never Leave The Local Machine | scripts/accounts.txt.example（占位模板）+ SKILL.md「安全红线」+ binding/architecture ADR-001；安全自查通过（仓库内 auth_token= 后均为占位符） | ✅ |
| R4 | Init Script Shall Reproduce The Environment Cross-Machine | scripts/x-reach-init.sh（实测跑通、幂等、headless cookie 引导） | ✅ |
| R5 | Skill Shall Document Account Pool Operation For Rate-Limit Resilience | references/setup.md「轻量账号池」+「账号池运维」+「限流自动轮换说明」 | ✅ |
| R6 | Skill Shall Manage Expectations On Graphql Endpoint Drift | SKILL.md「失败重试链」+「预期管理」+ architecture.md「预期管理」段 | ✅ |
| R7 | Skill Shall Differentiate From Agent-Reach By Scenario | SKILL.md description（场景化触发词）+「与 agent-reach 的分工」表；确认未改 .pi/skills/agent-reach/ | ✅ |
| R8 | Skill Shall Be Registered In The Capability Manifest | .pi/capabilities.yaml `global.skills` 已含 `x-reach` | ✅ |
| R9 | Skill MAY Offer A Desktop Cookie-Grab Convenience With Manual Fallback | scripts/x-reach-grab-cookie.sh（browser_cookie3 抓取 + fallback 手贴，实测跑通）；手贴仍为 SKILL/setup 主推 | ✅ |

## Task-to-Evidence

### 准备与依赖
- **1.1 spec 覆盖确认**：见上矩阵，8 条全覆盖。
- **1.2 依赖前置**：`pipx`（brew install）+ `twscrape 0.19.2`（`pipx install twscrape`）已装于本机；`~/.x-reach/` 约定生效。

### 核心实现
- **2.1 本地可行性验证** ✅（live）
  - twscrape CLI surface 核实：`twscrape --help` 列出全部 30 子命令，与 README 一致；抓到并修正文档漂移（`search_user`/`search_trend` 是 Python API 非 CLI）
  - live 查询1：`twscrape --db ~/.x-reach/accounts.db user_by_login elonmusk` → 返回单条 JSONL，含 `id:44196397`、`followersCount:241113243`（Elon 真实数据）
  - live 查询2：`twscrape --db ~/.x-reach/accounts.db search "AI agents lang:en" --limit=3` → 返回 23 行 JSONL（limit=目标数，X 每页返回更多），首条 `id:2083760290487746695` 可解析 `rawContent`/`likeCount`/`user.username`
  - 样例落盘 `/tmp/x-reach-search.jsonl`
- **2.2 x-reach-init.sh** ✅：实测两跑——首跑（装 pipx→twscrape→建目录 700→自检→引导 cookie 导入分支）、重跑（幂等，不覆盖 db）；修了一个 `grep -c \|\| echo 0` 整数比较 bug
- **2.3 accounts.txt.example** ✅：占位符模板，安全自查无真实 cookie
- **2.4 SKILL.md** ✅：description 场景化触发词（不与 agent-reach 通用 X 词正面冲突）；所有命令含 `--db`
- **2.5 setup.md** ✅：cookie 导入、轻量池、运维命令、跨环境复现、代理、TLS 指纹、环境变量表；补了 cookie 模式 `logged_in=0` 的说明
- **2.6 commands.md** ✅：完整只读命令面，全部带 `--db`；修正了 search_user/search_trend 漂移
- **2.7 architecture.md** ✅：ADR-001（cookie 本地化，三标准自检通过）、ADR-002（不写 wrapper）、预期管理、分工
- **2.8 manifest 登记** ✅：`.pi/capabilities.yaml` 的 `global.skills` = `[..., agent-reach, x-reach, worktrunk-isolation]`
- **2.9 桌面 cookie 抓取便利** ✅（live）：`x-reach-grab-cookie.sh acc2` 实测成功——首次自举 `~/.x-reach/grab-venv`（装 browser_cookie3），读 Chrome x.com cookie，导入 acc2 入池；抓取失败路径（无浏览器/未登录/加密漂移/Keychain 拒绝）fallback 到手贴指引 + exit 1

### 收敛
- **3.1 覆盖矩阵**：见上。
- **3.2 task-to-evidence**：见上；search JSONL 样例落盘可复现。
- **3.3 安全自查** ✅：`~/.x-reach/` 在 home 仓库天然隔离；仓库内 grep `auth_token=[a-f0-9]{15,}` 无匹配（所有 `auth_token=` 后为 xxx/yyy/REPLACE_ME/.../粘贴值）；临时 cookie 提取 venv+脚本已删，cookie 值仅在 shell env 存活至进程退出。

### 验证与回写
- **4.1 verification.md**：本文件。
- **4.2 writeback.md**：目标=CONTEXT.md，见 writeback.md。
- **4.3 执行 writeback**：前置=archive 完成（specs/ delta 晋升为主 spec 后才更新 CONTEXT.md 索引，依 AGENTS.md 规则）。归档阶段执行。

## 验证结论

- 行为规范真源 8 条 requirement 全部实现并覆盖。
- live 检索链验证通过（user_by_login + search 均返回真实 JSONL）。
- 安全边界守住（cookie 零进仓，仓库内仅占位符）。
- 已知 sharp edge 已文档化：① cookie 模式 `logged_in=0` 误导显示（以 total_req/实际请求为准）；② 漏带 `--db` 安全失败（建空 db 报错）；③ GraphQL 端点漂移靠上游跟进（不可控外部风险）。

**结论：verification 通过，change 可进入 archive 阶段。archive 后执行 writeback（更新 CONTEXT.md 索引）。**
