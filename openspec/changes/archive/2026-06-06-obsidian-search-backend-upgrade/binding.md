# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无外部标准页引用（本 change 为 pi-config 仓库 obsidian-tools 扩展的修改，不涉及 orbitos 规范页）
- `project_page_ref`:
  - `repo://my-wiki/docs/design/obsidian-search-backend-upgrade.md` — 上游设计文档，记录 jieba+FFF 方案验证与决策
  - `.pi/capabilities.yaml` — 能力清单（如有新增/变更）
- `additional_context_refs`:
  - `repo://my-wiki` vault — 目标验证环境，已安装 `@ff-labs/pi-fff` 扩展，已在测试中确认 FFF multiGrep 性能

## Source of Truth

- 行为规范真源：`specs/` 目录下的 delta specs
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://my-wiki/docs/design/obsidian-search-backend-upgrade.md` — 更新实现结论、状态与验证结果摘要
  - `.pi/capabilities.yaml` — 若本次变更涉及 capability 能力范围变化，需更新清单
- `writeback_owner`: 执行本 change 的 agent
- `writeback_timing`: tasks 全部验证完成后，在 verification + writeback 阶段执行回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 上游设计文档 `repo://my-wiki/docs/design/obsidian-search-backend-upgrade.md` 中的决策记录不变，仅补充实现状态
- 本 change 不涉及全局同步（不修改 `~/.pi/agent/` 下的文件），因此无需 `scripts/sync-pi-agent.sh` 执行

## 待确认项

- [x] 已确认标准页引用 — 无外部标准页
- [x] 已确认项目页引用 — my-wiki 设计文档已确认
- [x] 已确认回写目标与权限 — my-wiki 仓库可写
- [ ] 已确认异常处理与冲突策略 — FFF/jieba 均保留回退机制
