# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `.pi/skills/pkg-research/SKILL.md` — 当前 pkg-research 技能文件，本 change 修改其 Phase 2/3/4
  - `openspec/specs/pkg-security-review/spec.md` — 安全审查阶段（本 change 不修改，仅在新分支中复用 clone）
  - `openspec/specs/pkg-install-research/spec.md` — 安装与研究阶段（本 change 新增 raw extension 分支）
  - `openspec/specs/pkg-decision-backlog/spec.md` — 包决策工作流（本 change 修改选项语义、backlog schema）
  - `openspec/specs/pkg-global-sync/spec.md` — 包全局同步（本 change 扩展 extension 的 global 同步路径）
  - `openspec/pkg-backlog.md` — 当前 backlog 文件（本 change 扩展其 entry schema）
  - `.pi/capabilities.yaml` — 能力清单 manifest（本 change 扩展其 catalog 管理路径）
  - `openspec/changes/archive/2026-05-02-capability-manifest-decouple/` — 能力清单脱耦 change，本 change 继承其 global/catalog 分层模型

## Source of Truth

- 行为规范真源：`specs/pkg-research-raw-extension/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner（当前仓库）
- `writeback_timing`: verification 完成、change 进入 archival 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 修改 `.pi/skills/pkg-research/SKILL.md` 和 `openspec/pkg-backlog.md`，通过当前仓库的 github 提交管理
- 本 change 不修改 `scripts/sync-pi-agent.sh`，仅调整 capabilities.yaml 的 catalog 写入方式（由 sync 脚本在下次运行时自动发布）
- 本 change 涉及 backlog schema 变更，需要迁移已有 backlog 条目

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：backlog schema 迁移需向后兼容
