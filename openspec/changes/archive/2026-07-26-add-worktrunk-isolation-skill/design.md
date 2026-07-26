# Design

## Context

用户多 session 并行作业，需各 session agent 工作互不影响（独立 working tree / branch），且合入须人确认。已选社区工具 worktrunk（CLI `wt`），用户不敲 CLI，由 agent 管理。需求真源为 `docs/plans/worktrunk-isolation-skill-handoff.md`（~300 行），需用 skill 设计原则压成精简 model-invoked skill。

本仓已有 skill 惯例（`.pi/skills/<name>/SKILL.md` + `references/`），并有 `capabilities.yaml` 的 `global.skills` 同步机制与 `scripts/sync-pi-agent.sh`。设计需遵循 `writing-great-skills` 术语（信息层级、progressive disclosure、leading word、negation→positive、single-source-of-truth）与本仓 README 治理。

## Goals / Non-Goals

**Goals:**

- 实现单一 New Capability `worktrunk-isolation`（specs/worktrunk-isolation/spec.md 为行为真源）。
- SKILL.md 主体为生命周期 steps + 合并门禁 + 命令 recipes + config，约 ~100 行。
- 安装/冲突/平台/shell 集成下沉 `references/install.md`（progressive disclosure）。
- preflight checklist 即 doctor，单一来源，无独立脚本。
- 登记 `global.skills`，README/getting-started 加一行。

**Non-Goals:**

- 不做多 agent 编排器、任务板、端口分配、worklease（spec 已排除）。
- 不自研完整 CLI 包装，不绑定特定 product worktree 模式。
- 不强制 project hooks / baseline tests。
- 不替用户决定 merge 策略（squash vs merge commit），默认跟用户 worktrunk config。
- 不实现 doctor 脚本（spec 禁止）。

## Decisions

1. **Invocation = model-invoked**（留 description）。理由见 spec：触发是「每当需要并行隔离」，应 agent 自主加载；付一份 context load 可接受。触发词中英文双覆盖。

2. **SKILL.md 结构 6 节**（信息层级——steps 为主层）：
   - When to use / not
   - Preflight（链 `references/install.md`）
   - Protocol（create|reuse → work_only_in_path → commit_on_branch → report → await human → merge | remove），每步 completion criterion
   - Merge gate（顶层加粗，leading word「门禁」）
   - Command recipes（一律 `--no-cd --format json`）
   - Config（推荐 user config `worktree-path`，不碰 project hooks）

3. **Leading words**：「门禁 / merge gate」锚定唯一不可越线纪律；「隔离 path」锚定 cwd 约定。反复用 token 而非句子（术语表 leading word）。

4. **Merge gate 用 positive 措辞主轴**（反 negation 失败模式）：主轴写「merge/remove 只在人确认后；未表态则停、只 report」，仅保留无法正向表述的硬护栏为禁止项（`wt switch -x`）。

5. **Progressive disclosure 裁剪**：
   - `references/install.md`：brew/cargo 安装、`wt` vs `wiredtiger` / `git-wt` 冲突、平台矩阵、shell 集成（pointer 触发）。
   - 删 `command-cheatsheet.md`（与 SKILL.md recipes 重复语义 → duplication）。
   - 平台矩阵 / shell 集成细节下沉 install.md，SKILL.md 不展开。

6. **preflight checklist 即 doctor**：agent 逐条跑命令 + 解析输出已等价 doctor；写脚本 = duplication + 违反 single-source-of-truth（ponytail YAGNI）。

7. **Granularity = 单 skill 不拆**：生命周期是连续 steps，无独立 leading word 值得切；merge gate 风险靠人确认门禁防住，不需 sequence split 藏后续。

8. **目录落点**：`.pi/skills/worktrunk-isolation/{SKILL.md, references/install.md}`，与现有 skill 惯例一致；登记 `global.skills`（非 catalog，因需 ambient 跨项目触发）。

## Risks / Migration

| 风险 | 说明 | 缓解 |
|------|------|------|
| `wt` 二进制冲突 | macOS 与 `wiredtiger` 争 `wt`；Windows 可能是 `git-wt` | install.md 专节 + preflight 第 1 项校验真实来源 |
| agent 已在主树改脏 | create 前主树 dirty | preflight warn，不自动 stash（spec：warn 不自动处理） |
| `wt merge` 较全能 | 可能 auto-commit/squash 超出预期 | 门禁要求 merge 前展示将执行策略；用户 config `remove=false` |
| 用户拒绝集中 path | 已有自定义模板 | spec：保留用户配置，不覆盖 |
| 与 superpowers worktree skill 混用 | 行为冲突 | SKILL.md 写一句默认禁用混用 |
| `--fix` 自动安装安全敏感 | 可能乱装系统包 | 默认只打印命令；`--fix` 需当次授权（即使实现也仅文档提及） |

**Migration**：纯新增 skill，无既有行为变更，无迁移成本。同步后对所有 Pi session 立即生效，agent 在遇到并行隔离语义时自主加载。
