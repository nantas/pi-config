# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `repo://orbitos/30_研究/知识库/Obsidian_CLI.md` — 官方 Obsidian CLI 研究文档，检索能力矩阵与 benchmark 结论
  - `docs/reference/pi-obsidian-cli-tool-layer-analysis.md` — 社区包 `@haispeed/pi-obsidian` 调研报告与 tool-vs-skill 对比分析

## Source of Truth

- 行为规范真源：`specs/obsidian-tools/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner（当前仓库）
- `writeback_timing`: verification 完成、change 进入 archival 或 summary sync 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `docs/reference/pi-obsidian-cli-tool-layer-analysis.md` 为实现前参考输入，change artifacts 覆盖该文档的设计建议时以 artifacts 为准
- 本 change 与 `repo://orbitos/.agents/skills/obsidian-cli/` 为替代关系：实现完成后该旧 skill 不应同时激活

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：与旧 obsidian-cli skill 为替代关系，实施时需注意全局启用后避免重复触发
