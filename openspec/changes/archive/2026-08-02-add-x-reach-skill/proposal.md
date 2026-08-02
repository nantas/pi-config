# Proposal

## 问题定义

`agent-reach` 的 twitter 后端在本机实际不可用（`twitter` CLI 未安装，`agent-reach doctor` 退化为仅 OpenCLI 浏览器自动化），导致 X/Twitter 检索频繁超时、限流、会话丢失。即使补装 twitter-cli，它依赖 X GraphQL 端点且**无账号轮换**，单号被限流即整链失败，IP/会话风险高。

需要一个面向 AI agent 的、稳定的 X/Twitter **只读检索**通道，核心诉求：
- 限流可自动恢复（账号池轮换）
- 会话持久化（重启不丢登录态，无需反复 GUI 登录）
- 对 agent 友好的结构化输出（JSONL）
- 无头/SSH 环境可用（cookie 模式，不依赖浏览器 GUI）
- 跨环境可复现的初始化流程（含依赖安装与账号导入）

## 范围边界

**纳入**
- 新建 `x-reach` skill（文档 skill + `x-reach-init.sh` 初始化脚本 + `accounts.txt.example` 占位模板）
- 驱动 `twscrape`（async Python scraper + CLI，账号池轮换，SQLite 持久会话）做只读检索
- 跨环境初始化流程：装 pipx+twscrape → 建 `~/.x-reach/` → 固定 db 路径 → 导入账号 → doctor 自检
- 与 agent-reach 按场景分工（靠 SKILL.md description wording，不改 agent-reach 文档）
- manifest 治理：`.pi/capabilities.yaml` 的 `global.skills` 登记

**不纳入**
- 写操作（twscrape 本身是只读 scraper，不支持发帖/点赞；YAGNI）
- 修改 `.pi/skills/agent-reach/` 任何文件（分工靠 wording，不污染第三方 skill 副本）
- 在 `accounts.db` / cookie 层面做跨机器同步（安全红线：X cookie 永不进仓库，每台机重导）
- 包装 twscrape 为独立 wrapper CLI（命令模板带 `--db` 即可，YAGNI）

## Capabilities

### New Capabilities

- `x-reach-skill`: 面向 AI agent 的 X/Twitter 只读检索能力，twscrape 账号池驱动；含跨环境初始化、固定 db 路径、JSONL 输出消费、重试链、安全边界（cookie 本地化不同步）、桌面可选 cookie 抓取便利（手贴为主推）

### Modified Capabilities

（无）——登记 `x-reach` 到 `.pi/capabilities.yaml` 的 `global.skills` 是套用既有 `capability-manifest` spec 的「Global tier declares skills」requirement，属实现动作而非行为变更，不产生 spec delta。

## Capabilities 待确认项

- [x] 能力清单已与用户确认（grilling 阶段达成完整方案共识；capability 派生唯一：新建 `x-reach-skill`，无歧义）

## Impact

- **新增文件**：`.pi/skills/x-reach/{SKILL.md, references/{setup,commands,architecture}.md, scripts/x-reach-init.sh, scripts/accounts.txt.example}`
- **修改文件**：`.pi/capabilities.yaml`（`global.skills` 追加一行；属套用既有 `capability-manifest` spec 的登记动作，非 capability 行为变更）
- **全局同步**：`sync-pi-agent.sh` 后分发到 `~/.pi/agent/skills/x-reach/`（仅文档+脚本，**不含**任何 cookie/db）
- **运行时依赖**：`pipx` + `twscrape`（pip 安装），由 init 脚本引导，不在 manifest 声明为 package（twscrape 是系统级 Python 工具，非 Pi package）
- **与 agent-reach 关系**：共存不冲突。综合多平台调研走 agent-reach（其 twitter 模块保留作 fallback）；专门/批量/高稳定性 X 检索走 x-reach
- **外部依赖风险**：twscrape 同样依赖 X GraphQL 端点；X 改端点会导致临时失效，靠 twscrape 维护者跟进修端点（活跃，2026-07-31 仍在提交）。此为不可控外部风险，非本 skill 可消除

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`CONTEXT.md`（OpenSpec 索引）、`.pi/capabilities.yaml`（manifest）
  - 回写目标：`CONTEXT.md`（归档后追加 `x-reach-skill` slug）
