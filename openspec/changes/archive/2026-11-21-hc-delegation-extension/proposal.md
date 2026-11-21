# Proposal

## 问题定义

当前 `hc` 与 `subagent()` 的委派治理依赖三类静态提示：

1. `.pi/agent/AGENTS.md` 中的 17 行委派总则无条件注入所有 5 类运行角色（Lead、hc worker、hc peer、pi-subagents 子进程、非 hc 独立会话），造成禁止委派的子进程和独立会话白白消耗上下文，且硬边界只写了“≥2 个文件改动”，导致 Lead 在多文件只读核查场景下绕过委派直接大量 `read`/`grep`。
2. `.pi/agent/AGENTS.d/hc-delegation.md`（174 行）与 `subagent-usage.md`（195 行）把 `SPACE_ID`、`TAB_ID`、`herdr-app ls` 反查、`tab.rename`、`first_message.sent` 校验等易错流程交给模型按需读取并手写 bash/python3 胶水，摩擦成本远高于模型直接动手，削弱了委派服从率。
3. `.pi/herdr-templates/grunt.md` 与 `workhorse.md` 存在 67 行完全重复正文，通过 `hc run` 粘贴进首条用户消息，易受压缩影响且增大首消息投递体积。

## 范围边界

- 新增全局 Pi 扩展 `.pi/extensions/hc-delegation.ts` 及零依赖单测 `tests/hc-delegation.test.ts`。
- 扩展按运行时角色（`hc_lead` / `hc_worker` / `hc_peer` / `subagent` / `standalone`）动态管理激活工具、独立系统提示 `<section>` 注入及运行时护栏（Lead 多文件写入硬拦截——对所有路径一视同仁，含 OpenSpec 工件/spec/plan/ADR 等流程化产物，不设工作流豁免，保持仓库无关性；Lead 多次直接探查提醒；Lead 裸跑 `hc run <template>` 重定向；验证分工提醒——Worker 执行构建/测试/lint/验证命令并回报观测输出或日志路径，Lead 只审查证据与 diff，Lead 直接跑验证套件时非阻塞 `[hc-delegation]` 提醒；Worker/Peer/Subagent 反递归硬拦截）。
- 精简 `.pi/agent/AGENTS.md`、移除被取代的 `.pi/agent/AGENTS.d/hc-delegation.md` 与 `subagent-usage.md`、将 `.pi/herdr-templates/{grunt,workhorse,peer}.md` 精简为纯 frontmatter 启动清单、更新 `.pi/capabilities.yaml` 与相关文档。
- 不修改或 fork `@johnnywu/pi-subagents`，不改动 `.pi/settings.json`，不在未经用户确认前执行 `scripts/sync-pi-agent.sh`。

## Capabilities

### New Capabilities
- `hc-delegation-extension`: Role-aware Pi extension providing `hc_worker` / `hc_report` tools, dynamic delegation/worker system prompt sections, strict repo-agnostic Lead delegation guards (uniform ≤1-file write boundary including workflow/planning artifacts), verification division-of-labor nudges (workers run suites, Lead audits evidence), anti-recursion enforcement, and frontmatter-only Pi `hc` template support.

### Modified Capabilities
- `global-agent-guidance`: Remove static delegation rules and on-demand `hc-delegation.md` / `subagent-usage.md` manuals from `.pi/agent/AGENTS.md` and `.pi/agent/AGENTS.d/` now managed dynamically by `hc-delegation`.

## Capabilities 待确认项

- [x] 能力清单已基于用户明确诉求收敛（优化系统提示、hc 使用场景提示注入与模板加载，严格约束面向人类的 Lead 委派行为）。

## Impact

- `.pi/extensions/hc-delegation.ts`（新增）
- `tests/hc-delegation.test.ts`（新增）
- `.pi/agent/AGENTS.md`（精简）
- `.pi/agent/AGENTS.d/hc-delegation.md`、`.pi/agent/AGENTS.d/subagent-usage.md`（删除）
- `.pi/herdr-templates/grunt.md`、`workhorse.md`、`peer.md`（精简为纯 frontmatter）
- `.pi/capabilities.yaml`、`README.md`、`CONTEXT.md`（更新清单与索引）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：`repo://pi-config/docs/agents/issue-tracker.md`、`repo://pi-config/CONTEXT.md`
