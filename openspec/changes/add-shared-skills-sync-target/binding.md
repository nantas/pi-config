# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/specs/capability-manifest/spec.md`（本仓 pi-config，capability = `capability-manifest`）
- `project_page_ref`:
  - `.pi/capabilities.yaml`（manifest 实例：新增 `global.shared_skills` 字段并迁移 agent-reach 条目）
  - `scripts/sync-pi-agent.sh`（同步执行器：新增 shared skills 同步段）
  - `README.md`（「工作流技能」节能力描述）
  - `AGENTS.md`（Capability Manifest Governance 工作流表）
- `additional_context_refs`:
  - 现场证据：`~/.agents/skills/agent-reach/`（上游 2026-09-13 演进版，合并基底）
  - 现场证据：`~/.pi/agent/skills/agent-reach/`（仓库源 038f38f 的全局安装副本，本次退役对象）
  - `openspec/specs/capability-manifest-governance/spec.md`（manifest 变更治理要求）

## Source of Truth

- 行为规范真源：`specs/capability-manifest/spec.md`（本次 change 在其下新增 spec delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`.pi/capabilities.yaml` 是 manifest 实例、`README.md` 是能力描述展示页，均不替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无跨仓 `repo://` 回写目标；全部产出为仓库内文件
- 运行时副本（非 repo 回写，属全局同步操作，需用户确认后执行）：
  - `~/.agents/skills/agent-reach/` ← 仓库合并版（经 sync 覆盖为真源内容）
  - `~/.pi/agent/skills/agent-reach/` 退役删除（由 `global.skills` 白名单 stale 清理自动完成）
- `writeback_owner`: 本 change 实现者
- `writeback_timing`: verification 完成后按 `docs/pi-change-closeout-governance.md` 询问用户，确认后执行 `scripts/sync-pi-agent.sh`

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `~/.agents/skills/` 为跨 harness 共享目录，sync 对其只做声明条目的替换式同步，绝不清理未声明内容

## 待确认项

- [x] 已确认标准页引用（`openspec/specs/capability-manifest/spec.md`）
- [x] 已确认项目页引用（manifest 实例 + sync 脚本 + README/AGENTS.md）
- [x] 已确认回写目标与权限（全部为仓库内文件；运行时同步待用户确认）
- [ ] 已确认异常处理与冲突策略 —— 全局 sync 执行与否及执行时点由用户在 closeout 时决定
