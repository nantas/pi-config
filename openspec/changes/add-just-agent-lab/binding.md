# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无现有标准页（本 change 新增能力 `just-agent-lab`，不修改现有 spec）
- `project_page_ref`:
  - `CONTEXT.md`（「Just Agent 实验术语」域词汇章节，已在本 change 前的设计访谈中确认）
  - `README.md` / `docs/getting-started.md`（能力展示页，需按 capability governance 同步）
- `additional_context_refs`:
  - `repo://pi-mono` → `packages/coding-agent/docs/extensions.md`、`docs/skills.md`（Pi Extension/Skill API 真源）
  - `docs/reference/pi-subagents-extend-agent.md`（agent 契约参考）
  - `docs/pi-change-closeout-governance.md`（verification 阶段 closeout 依据）
  - `docs/reference/readme-governance.md`（README 能力更新依据）
  - Just 官方仓库 https://github.com/casey/just（bootstrap 版本钉扎与 SHA256 校验的资产来源）

## Source of Truth

- 行为规范真源：`specs/just-agent-lab/spec.md`（本次 change 下的 spec delta，归档后升级为正式 spec）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`CONTEXT.md` 术语章节与 `README.md` 能力描述不替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `CONTEXT.md`（OpenSpec 索引新增 `just-agent-lab` 条目）
  - `README.md` + `docs/getting-started.md`（catalog extension 能力描述，按 readme-governance）
- `writeback_owner`: agent
- `writeback_timing`: archive 阶段（`/opsx-archive` 后按仓库规则追加 CONTEXT.md 索引更新）

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 不涉及跨仓库回写；不运行 `scripts/sync-pi-agent.sh`（实验保持 project-only，closeout 须记录 sync 未执行）
- project-only 的 agent/skill 不进入 `.pi/capabilities.yaml` catalog（`catalog.agents` 不受支持）；仅独立可用的 Just tool extension 进入 catalog

## 待确认项

- [x] 已确认标准页引用（新增能力，无现有标准页）
- [x] 已确认项目页引用（CONTEXT.md + README/docs/getting-started）
- [x] 已确认回写目标与权限（本仓内，无跨仓库目标）
- [x] 已确认异常处理与冲突策略（无外部标准页冲突；bootstrap 版本钉扎须在实现时以官方 release 资产/校验和为准）
