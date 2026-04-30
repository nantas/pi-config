# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `additional_context_refs`:
  - `file:///Users/nantasmac/projects/pi-config/AGENTS.md` — 仓库工作流规则
  - `file:///Users/nantasmac/projects/pi-config/docs/plans/pi-customization-blueprint.md` — 蓝图
  - `file:///Users/nantasmac/projects/pi-config/docs/pi-phase1-boundary.md` — 同步范围合约
  - `file:///Users/nantasmac/projects/pi-config/docs/pi-change-closeout-governance.md` — Closeout 治理

## Source of Truth

- 行为规范真源：`specs/readme-documentation/spec.md`、`specs/readme-automation-governance/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - 主产出：`README.md`（仓库根目录，由 design.md 设计方案产出）
  - 治理回写：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`（只写结论与状态摘要）
- `writeback_owner`: nantasmac
- `writeback_timing`: change 归档前执行回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- README.md 为仓库文件，通过 git 管理版本；项目进度页通过 repo://orbitos 回写
- 后续 README 更新应通过 `readme-automation-governance` 中定义的工作流执行

## 待确认项

- [x] 已确认标准页引用 — `repo://orbitos`
- [x] 已确认项目页引用 — `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- [x] 已确认回写目标与权限 — README.md（本地）+ 项目进度页（orbitos）
- [x] 已确认异常处理与冲突策略 — specs 优先，回写仅同步摘要
