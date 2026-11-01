# Design

## Context

`capability-manifest` spec 新增 shared skills 层（见 `specs/capability-manifest/spec.md`）。当前实现事实：

- `scripts/sync-pi-agent.sh` 的 `sync_from_manifest`（node 内嵌脚本）用 `extractItems("global", keyword)` 提取 `global.{extensions,agents,skills,prompts}` 白名单，逐条 wholesale 替换到 `TARGET_ROOT`（`~/.pi/agent/`）对应子目录，随后对每个子目录做 stale 清理
- `extractItems` 的关键词匹配为 `trimmed === keyword + ":"` 精确形式，`shared_skills:` 不会被 `skills` 关键词误匹配（反之亦然），无需改解析器
- env 校验（Python 段）从 `global_section` 的 packages/extensions/skills/agents 汇总 `active_ids`
- `~/.agents/skills/` 已是 pi 的 skill 发现路径之一（按 skill 名去重），仓库另有项目级 `.agents/skills/` 约定可参照

## Goals / Non-Goals

**Goals:**

- `global.shared_skills` 声明 → `~/.agents/skills/<name>/` 替换式同步，无 stale 清理
- `global.skills` 白名单语义不变（其 stale 清理自动退役迁出条目，即本次的 `~/.pi/agent/skills/agent-reach/`）
- env 校验 active_ids 纳入 shared_skills
- agent-reach 内容合并：上游演进版为基底 + 保留仓库独有 `SKILL_en.md`

**Non-Goals:**

- 不支持声明式移除共享层 skill（`~/.agents/skills/` 未声明内容一概不动；移除属手工操作）
- 不改 catalog 发布、不改 `global.skills` 其余行为
- 不做 agent-reach CLI 安装管理

## Decisions

1. **字段名 `global.shared_skills`**：语义直指「跨 harness 共享层技能」；与 `global.skills`（pi 专属层）形成清晰对照，且 `extractItems` 关键词匹配天然无歧义。
2. **同步位置**：node 同步段插在「STALE SKILL CLEANUP」与「SYNC PROMPTS」之间，复用同一 `rm+cpSync` 模式；共享层根路径经新 env `AGENTS_SKILLS_ROOT`（默认 `~/.agents/skills`）传入，与 `SOURCE_ROOT`/`TARGET_ROOT` 的传参风格一致。
3. **无 stale 清理为硬约束**：共享目录非本仓库独有，白名单清理会误删其他 harness 安装的 skill；「移除已同步的共享 skill」在脚本层没有自动路径，由操作者手工执行。
4. **重复声明报错**：同名出现在 `global.skills` 与 `global.shared_skills` 时 sync 直接报错退出，避免两个目标写入两份副本造成加载歧义（pi 对同名 skill 的去重顺序不应成为依赖项）。
5. **合并基底取上游版**：`.agents` 版（2026-09-13）为上游演进（finance 频道、mcporter `key=value` 语法、登录态/Cookie 安全指引、字幕重试链）；repo 版独有差异仅 `SKILL_en.md`（保留）与 `triggers:` frontmatter（全仓 grep 无消费方，随上游弃用）。
6. **退役路径复用现有 stale 清理**：`global.skills` 移除条目后，`~/.pi/agent/skills/agent-reach/` 在下一次 sync 被自动删除，无需新脚本逻辑。

## Risks / Migration

- **风险：sync 误删共享目录内容** —— 已由决策 3 硬约束规避；sync 后验证步骤须显式 diff 共享目录仅 agent-reach 变化。
- **风险：`.agents` 版含未落仓库的本地定制** —— 合并前以 `diff -r` 逐文件核对，除已知清单（SKILL.md、5 个 references 差异、finance.md 新增）外不得有其他差异文件。
- **迁移**：一次 sync 完成三件事——共享层写入合并版、pi 层删除 agent-reach、其余 global.skills 条目原样刷新；closeout 时向用户展示 dry-run 式清单后再执行。
- **回滚**：字段从 `shared_skills` 移回 `skills` + 恢复合并前提交，再 sync 即回到旧布局。
