# Proposal

## 问题定义

`.pi/skills/agent-reach/` 与 `~/.agents/skills/agent-reach/` 是同一 skill 的**分叉版本**而非重复拷贝：

- 仓库版（提交 038f38f，2026-07-24 引入，登记于 `global.skills`）：含 `SKILL_en.md` 与 `triggers:` frontmatter（无任何消费方，属上游历史遗留）
- 上游演进版（`~/.agents/skills/`，2026-09-13）：新增 finance 频道（`references/finance.md`）、修正 mcporter 调用语法（`key=value` 形式）、补强登录态/Cookie 安全指引、新增 yt-dlp 字幕失败重试链

两个问题：

1. **内容分叉**：仓库管理的版本落后于上游演进，且 `~/.pi/agent/skills/agent-reach/`（由 sync 维护的全局副本）与 pi 实际也会加载的 `~/.agents/skills/agent-reach/` 内容不一致，同一 skill 出现两个不同版本供 agent 使用。
2. **安装位置错配**：`~/.agents/skills/` 是跨 harness 共享层（claude 系 harness 与 pi 共用），agent-reach 这类与 pi 无耦合的平台路由 skill 更适合安装在该共享层；而当前 sync 只支持 `global.skills` → `~/.pi/agent/skills/` 单一目标。

## 范围边界

**做**：

- 合并上游演进内容到仓库 `.pi/skills/agent-reach/`（以上游为基底，保留仓库独有的 `SKILL_en.md`；`triggers:` frontmatter 随上游弃用）
- `capabilities.yaml` 新增 `global.shared_skills` 字段（同步目标 `~/.agents/skills/`，替换式同步、不做 stale 清理），agent-reach 从 `global.skills` 迁入该字段
- `sync-pi-agent.sh`：新增 shared skills 同步段；`global.env` 校验的 active_ids 纳入 shared_skills；更新 help 文本
- README「工作流技能」与 AGENTS.md 治理表同步更新
- 一次性退役 `~/.pi/agent/skills/agent-reach/`（由现有 stale 清理自动完成，无需脚本新逻辑）

**不做**：

- 不改动 `global.skills` 其余条目（obsidian-search、worktrunk-isolation 等）的同步行为
- 不做 `~/.agents/skills/` 未声明内容的清理或迁移（该目录含大量非本仓库管理的 skill）
- 不改动 catalog 发布逻辑（shared_skills 不进 catalog）
- 不处理 agent-reach CLI 本体的安装（skill 只是指令文档）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `capability-manifest`: manifest 新增 `global.shared_skills` 字段语义（共享层技能声明与同步目标），sync 执行器支持该字段的替换式同步且不清理共享目录未声明内容

## Impact

- `.pi/capabilities.yaml`：新增 `global.shared_skills`，迁移 agent-reach 条目
- `scripts/sync-pi-agent.sh`：node 同步段、Python env 校验、help 文本
- `.pi/skills/agent-reach/`：SKILL.md + references/* 内容合并，保留 SKILL_en.md
- `README.md`：能力描述（工作流技能节 + 环境变量节的能力 ID 对应关系说明）
- `AGENTS.md`：Capability Manifest Governance 工作流表新增 shared_skills 行
- 运行时（经用户确认的 sync）：`~/.agents/skills/agent-reach/` 更新为仓库版；`~/.pi/agent/skills/agent-reach/` 移除；pi 加载行为不变（`~/.agents/skills/` 本就在 pi 的 skill 发现路径中）

## 关联绑定

- 标准页：`openspec/specs/capability-manifest/spec.md`（见 binding.md `spec_standard_ref`）
- 项目页与回写目标：见 binding.md「回写目标」——全部为仓库内文件，无跨仓 `repo://` 回写；运行时同步操作在 closeout 经用户确认后执行
