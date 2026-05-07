# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `.pi/skills/pkg-research/SKILL.md` — 现有第三方包研究引入流程，fork 工作流需与之衔接
  - `.pi/skills/pi-extension-dev/SKILL.md` — 自有扩展开发流程，作为 fork 开发流程的设计参照
  - `.pi/capabilities.yaml` — 能力注册清单，新增 skill 需同步更新
  - `.pi/settings.json` — package 配置真源，fork 后需更新来源引用
  - `docs/reference/pi-subagents-extend-agent.md` — 子代理扩展参考，fork 工作流可能涉及 agent 管理

## Source of Truth

- 行为规范真源：`specs/pkg-fork-dev/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner（当前仓库）
- `writeback_timing`: verification 完成、change 进入 archival 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 新增 `pkg-fork-dev` skill，与现有 `pkg-research`、`pi-extension-dev` 互补不冲突：
  - `pkg-research` 负责新包的安全审查与引入决策
  - `pi-extension-dev` 负责自有扩展的完整开发
  - `pkg-fork-dev` 负责已有包的 fork 开发闭环
- `forks/manifest.yaml` 为新增顶层文件，不与现有 `.pi/` 结构冲突

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：与现有 skill 互补，无替代关系；新增 `forks/` 目录不影响现有结构
