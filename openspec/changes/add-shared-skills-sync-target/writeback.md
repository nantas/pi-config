# Writeback

## 回写摘要

- change：`add-shared-skills-sync-target`
- 回写结论：实现完成并经隔离环境验证；capability manifest 新增 `global.shared_skills` 共享层技能声明，agent-reach 迁入该层（内容同步合并上游 2026-09-13 演进版），pi 专属层退役该 skill 的全局安装
- 关键结果：跨 harness 共享层 `~/.agents/skills/` 进入 manifest 管理范围（只增量同步、不清理未声明内容）；`~/.pi/agent/skills/agent-reach/` 将在下次 sync 自动移除

## Capability / Spec 增量摘要

| Capability | 变更类型（New/Modified/Removed/Renamed） | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `capability-manifest` | Modified | `openspec/changes/add-shared-skills-sync-target/specs/capability-manifest/spec.md` | ADDED：Shared Skills Layer Declaration（字段语义）、Shared Skills Sync Is Non-Destructive To Foreign Content（无清理硬约束 + 双列表重复声明拒绝）、Shared Skills Count As Active Capabilities For Env Validation；MODIFIED：Skills Manifest Sync Whitelist（迁出条目经 stale 清理自动退役） |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 4 Requirement 全覆盖（隔离环境 Round A/B/C + 代码级审查） | `verification.md` § Spec-to-Implementation |
| Task-to-Evidence | 6/6 实现任务完成，每项附证据 | `verification.md` § Task-to-Evidence |
| 未验证项 | 真实环境迁移效果留待 closeout 用户确认后执行（行为已由 Round C 等价模拟） | `verification.md` § 未验证项 |

## 回写目标与字段映射

binding.md 已确认全部产出为仓库内文件（无 `repo://` 跨仓回写）：

| 回写目标 | 字段/内容映射 | 状态 |
| --- | --- | --- |
| `.pi/capabilities.yaml` | `global.skills` 移除 agent-reach；新增 `global.shared_skills: [agent-reach]` + 语义注释 | 已随实现完成 |
| `scripts/sync-pi-agent.sh` | node 同步段 + 重复声明校验 + Python active_ids + help 文本 | 已随实现完成 |
| `.pi/skills/agent-reach/` | SKILL.md、references/*（career/search/social/video/web/finance）合并，SKILL_en.md 保留 | 已随实现完成 |
| `README.md` | 工作流技能·共享层小节、env 节能力 ID 对应、速查表 | 已随实现完成 |
| `docs/getting-started.md` | 全局同步能力表（技能行修正 + 共享层技能行） | 已随实现完成 |
| `AGENTS.md` | 资源类型 Skills 说明 + 治理表 shared-layer 行 | 已随实现完成 |

## 回写执行结果

| 目标 | 结果 | 说明 |
| --- | --- | --- |
| 上述 6 个仓库内文件 | 成功 | 实现与文档同步完成，验证见 verification.md |
| 运行时同步（`~/.agents/skills/agent-reach/` 更新、`~/.pi/agent/skills/agent-reach/` 退役） | 待执行 | 需用户在 closeout 确认后运行 `scripts/sync-pi-agent.sh`；结果记录于下方「运行时同步执行记录」 |

### 运行时同步执行记录

- 执行时间：2026-09-14（本次 closeout，用户确认后执行）
- 结果：成功（`bash scripts/sync-pi-agent.sh` exit 0）
- 关键输出：`Removed stale skill: agent-reach`（pi 层退役）；`Synced shared skill: agent-reach/ -> C:/Users/nanta/.agents/skills`；其余 4 个 global.skills 条目正常刷新
- 终态验证：`~/.pi/agent/skills/` 仅含 4 个声明 skill；`~/.agents/skills/` 共 34 个 skill 全部完好（code-review、codebase-design 等非管理内容未动）；`diff -rq` 确认 `~/.agents/skills/agent-reach/` 与仓库版完全一致（含 SKILL_en.md）
- 附注：sync 顺带清理了 3 个既存 stale extension（eko24ive-pi-ask.json、herdr-agent-state.ts、pi-codex-image-gen-install.json），属既有 stale 清理逻辑的正常行为，非本次变更引入

## 回写前置条件

- 真实全局 sync 须经用户确认（`docs/pi-change-closeout-governance.md`）
- sync 执行时无并发 pi session 依赖 `agent-reach` skill 的旧路径（`~/.pi/agent/skills/agent-reach/`）；pi 对 `~/.agents/skills/` 的发现路径已存在，无需额外配置

## 不回写的内容

- spec delta 全文、design 决策细节、tasks 清单（留在 change 目录，归档后经 openspec/specs 主 spec 承载）
- `~/.agents/skills/` 未声明内容清单（非管理对象）
- agent-reach CLI 本体安装状态（skill 只管指令文档）
