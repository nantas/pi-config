# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `openspec/specs/pi-runtime-bootstrap-sync/spec.md` — 当前 sync 合同（全量覆盖），本 change 改造为选择性 sync
  - `openspec/specs/pi-global-subagent-package-delivery/spec.md` — 包驱动全局分发模型，本 change 继承并扩展
  - `openspec/specs/pi-project-source-layer/spec.md` — Phase 1 管理路径定义，本 change 将其纳入 capabilities.yaml 治理
  - `openspec/specs/pi-global-runtime-sync-confirmation/spec.md` — 同步确认规则，本 change 不改变
  - `openspec/specs/pkg-decision-backlog/spec.md` — 包决策工作流，本 change 需增强以包含 capabilities.yaml 写入
  - `openspec/specs/pkg-global-sync/spec.md` — 包全局同步，本 change 修改其同步策略（白名单过滤）
  - `openspec/specs/pkg-install-research/spec.md` — 包安装研究阶段
  - `openspec/specs/pkg-security-review/spec.md` — 包安全审查阶段
  - `openspec/specs/pi-extension-dev-skill/spec.md` — 扩展开发技能，本 change 需增强能力清单写入步骤
  - `openspec/specs/extension-dedup-standard/spec.md` — 扩展自去重标准，不受本 change 影响
  - `openspec/specs/pi-global-agent-md-sync/spec.md` — AGENTS.md 全局同步，不受本 change 影响（保持全量同步）
  - `.pi/skills/pkg-research/SKILL.md` — 当前 pkg-research 技能工作流
  - `.pi/skills/pi-extension-dev/SKILL.md` — 当前 pi-extension-dev 技能工作流
  - `AGENTS.md` — 当前仓库治理指导

## Source of Truth

- 行为规范真源：`specs/` 目录（本 change 的 delta specs）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner（当前仓库）
- `writeback_timing`: verification 完成、change 进入 archival 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 修改 `scripts/sync-pi-agent.sh` 的行为，需通过 sync 确认规则走用户确认流程
- 本 change 新增的能力清单与安装技能属 pi-config 仓库独有基础设施，不回写至项目页面
- 现有全局同步的 extension/agent/AGENTS.md 行为在本 change 中保持不变或收紧（全量→白名单），不回退已有全局能力

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：sync 脚本改动需走 glboal-runtime-sync-confirmation 规则
