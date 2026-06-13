# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无（本 change 不涉及外部标准页引用，notion-cli 是独立的全局 skill）
- `project_page_ref`: `.pi/capabilities.yaml`（全局 skill 注册清单）、`~/.pi/agent/skills/notion-cli/`（同步目标）
- `additional_context_refs`: Notion CLI 官方文档 https://developers.notion.com/cli/get-started/overview

## Source of Truth

- 行为规范真源：`specs/notion-cli/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `CONTEXT.md`（OpenSpec 索引更新，在 skill 能力域组追加 `notion-cli` slug）
- `writeback_owner`: 主 agent
- `writeback_timing`: change 完成后，归档前

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- skill 源码位于 `.pi/skills/notion-cli/`，通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/skills/notion-cli/`，不手动拷贝

## 待确认项

- [x] 已确认标准页引用（无外部标准页）
- [x] 已确认项目页引用（capabilities.yaml + sync 目标）
- [x] 已确认回写目标与权限（CONTEXT.md 索引更新）
- [x] 已确认异常处理与冲突策略（sync 脚本覆盖式同步，capabilities.yaml 为唯一注册入口）
