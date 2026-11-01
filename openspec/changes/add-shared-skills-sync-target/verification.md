# Verification

## Spec-to-Implementation

对照 `specs/capability-manifest/spec.md` 的 4 个 Requirement：

| Requirement | 实现落点 | 证据 |
|---|---|---|
| Shared Skills Layer Declaration | `.pi/capabilities.yaml` 新增 `global.shared_skills: [agent-reach]`；`sync_from_manifest` node 段 `extractItems("global", "shared_skills")` | YAML 解析输出 `shared_skills: ['agent-reach']`；Round A 隔离 sync 中 `Synced shared skill: agent-reach/` 指向 `AGENTS_SKILLS_ROOT` 目标 |
| Shared Skills Sync Is Non-Destructive To Foreign Content | node 段 shared 同步段：仅对声明条目 `rm+cpSync`，无 stale 清理循环；缺失源目录仅 WARNING | Round A：预置 `dummy-foreign-skill/` 完整保留（SKILL.md 内容 `foreign` 未变）；Round C：共享层 `keepme/` 保留 |
| Shared Skills Count As Active Capabilities For Env Validation | Python env 校验段 `for skill in (global_section.get("shared_skills") or []): active_ids.add(skill)` | 代码级验证（agent-reach 无 env 条目，无运行时差异；bash -n + Round A 全量 sync exit 0 覆盖该段执行） |
| Skills Manifest Sync Whitelist（MODIFIED） | `global.skills` 移除 agent-reach；既有 stale 清理逻辑未改动 | Round C：临时 pi 层预置 `agent-reach/` 旧目录 → sync 输出 `Removed stale skill: agent-reach`，最终 pi 层仅 4 个声明 skill |
| 重复声明拒绝（Scenario: conflicts） | node 段 extract 后、任何同步动作前 `process.exit(1)`；`set -euo pipefail` 保证整脚本中断 | Round B：注入双列表重复 → `ERROR: skill 'agent-reach' is declared in both...` + exit 1，无任何同步副作用 |

## Task-to-Evidence

- [x] 1.1 实现落点确认：见上表四行
- [x] 1.2 合并前 `diff -rq`：差异文件清单 = SKILL.md + references/{career,search,social,video,web}.md + finance.md（新增）+ SKILL_en.md（仓库独有），无意外差异
- [x] 2.1 合并后 `diff -rq .pi/skills/agent-reach ~/.agents/skills/agent-reach` → 仅 `Only in .pi/skills/agent-reach: SKILL_en.md`
- [x] 2.2 manifest 迁移：`skills: [install-from-pi-config, notion, x-reach, worktrunk-isolation]`、`shared_skills: [agent-reach]`、交集为空
- [x] 2.3-2.5 脚本：`bash -n` 通过；Round A/B/C 隔离运行覆盖同步段、报错分支、stale 清理
- [x] 2.6 README「工作流技能」新增共享层小节（agent-reach 移入，描述补雪球）；env 节能力 ID 对应关系补 `global.shared_skills`；速查表 `.pi/skills/` 行更新；AGENTS.md 资源类型说明 + 治理表新增 shared-layer 行；docs/getting-started.md 能力表同步（agent-reach → 共享层行，并补上先前遗漏的 x-reach）

## 验证环境说明

Round A/B/C 均在隔离环境执行：`PI_AGENT_HOME`、`AGENTS_SKILLS_ROOT` 指向 `mktemp -d` 临时目录，真实 `~/.pi/agent/` 与 `~/.agents/skills/` 未被触碰。Round B 测试用的 manifest 重复注入已恢复（恢复后解析输出与预期一致）。

## 未验证项（留待真实 sync）

- 真实环境的迁移效果（`~/.pi/agent/skills/agent-reach/` 退役、`~/.agents/skills/agent-reach/` 更新为含 SKILL_en.md 的仓库版）：行为已由 Round C 等价模拟，执行留待 closeout 用户确认
