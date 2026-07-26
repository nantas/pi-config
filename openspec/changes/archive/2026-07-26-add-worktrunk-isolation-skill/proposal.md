# Proposal

## 问题定义

用户习惯同时开多个 session 与不同 agent 讨论/执行需求，需要各 session 的 agent 工作互不影响（独立 working tree / 独立 branch），且每次工作结束后由人类确认再合入基底分支。当前仓内没有任何协议约束 agent 如何用 git worktree 做隔离，也没有合并门禁，agent 可能在主 checkout 直接落地改动或擅自合入。

用户已选定社区工具 worktrunk（CLI 名 `wt`），定位为面向 AI agent 工作流的 git worktree 管理；用户自己不想敲 CLI，期望由 agent 管理 worktree。需要一个跨项目通用的 skill，让 agent 在「需要并行隔离」时自主用 worktrunk 创建/进入隔离工作树，并强制「人确认合入」门禁。

需求真源见 `docs/plans/worktrunk-isolation-skill-handoff.md`。

## 范围边界

**范围内**：

- 新建 model-invoked skill `worktrunk-isolation`：跨项目通用，agent 驱动。
- 定义 worktrunk 生命周期协议：preflight → create|reuse → work_only_in_path → commit_on_branch → report → (await human) → merge | remove。
- 强制合并门禁：未获用户明确确认，禁止 merge / push 合入结果；未确认丢弃不 force-remove。
- 提供 runtime preflight checklist（即 doctor）与安装指引（progressive disclosure 至 references）。
- 推荐集中 path 模板写入 user config，不碰 project hooks。
- 登记 `capabilities.yaml` 的 `global.skills`，同步到 `~/.pi/agent/skills/`。

**范围外（MUST NOT）**：

- 不实现多 agent 编排器、任务板、端口分配、worklease。
- 不绑定 Claude Code / Cursor / Codex 的 product worktree 模式。
- 不强制 project hooks、pre-start 装依赖、baseline tests。
- 不自研完整 CLI 包装；只教 worktree 生命周期命令。
- 不实现 doctor 脚本（preflight checklist 即 doctor，单一定义）。
- 不替用户做 merge 策略产品决策（squash vs merge commit），默认跟用户 worktrunk config。

## Capabilities

### New Capabilities

- `worktrunk-isolation`: 跨项目、agent 驱动的 worktrunk 协议 skill——用 worktree 实现多 session 文件系统隔离，强制人确认合入门禁，管隔离不管编排。

### Modified Capabilities

（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：单一 New Capability `worktrunk-isolation`，model-invoked，同步至 global.skills

## Impact

- 新增 `.pi/skills/worktrunk-isolation/SKILL.md` 与 `references/install.md`。
- `.pi/capabilities.yaml` 的 `global.skills` 追加 `worktrunk-isolation`。
- README 与 `docs/getting-started.md` 按 `docs/reference/readme-governance.md` 加一行能力描述。
- 经 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/skills/`，对所有 Pi session 生效。
- 不影响现有 skill；不修改任何既有 extension/agent/runtime 行为。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
