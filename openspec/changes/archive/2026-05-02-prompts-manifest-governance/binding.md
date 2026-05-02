# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos` > `99_系统/Harness/OpenSpec_Schema_Source/orbitos-change-v1/`
- `project_page_ref`:
  - `repo://pi-config` > `.pi/capabilities.yaml` — 能力清单真源
  - `repo://pi-config` > `AGENTS.md` — 仓库治理规则
  - `repo://pi-config` > `scripts/sync-pi-agent.sh` — 同步脚本
- `additional_context_refs`:
  - `repo://pi-config` > `.pi/prompts/` — opsx-* 命令模板源
  - `repo://pi-config` > `.pi/agent/AGENTS.md` — 全局 agent 指导

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://pi-config` > `.pi/capabilities.yaml` — manifest 变更
  - `repo://pi-config` > `AGENTS.md` — 治理规则更新
  - `repo://pi-config` > `scripts/sync-pi-agent.sh` — 同步脚本变更
- `writeback_owner`: 实施 agent（当前 session）
- `writeback_timing`: 实施完成后，verification 通过前回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略
