# Verification

## 验证结论

本 change 的所有 spec requirement 均已实现并验证，全部 17 个 task 完成。仓库内变更（manifest / AGENTS.md / CONTEXT.md / ADR）通过 grep 校验零残留；全局 runtime 变更（settings.json 同步 / node_modules 卸载）通过实际执行 sync + pi remove 验证。唯一剩余项是新 session 工具列表验证，需用户新开 session 确认（本次 session 已加载 snap-edit，无法自验）。

## Spec-to-Implementation Coverage

### global-agent-guidance

| Requirement | 状态 | 实现证据 |
|---|:---:|---|
| `tool-call-guidelines-sections`（MODIFIED） | ✅ | `.pi/agent/AGENTS.md` L16–25 恢复为原生 `### Edit Tool`，含三项自检硬约束；grep 确认无 `quick_edit`/`target_edit`/`pi-snap-edit` |
| `fff-edit-workflow-mapping`（MODIFIED） | ✅ | `.pi/agent/AGENTS.md` 编辑工作流表（L92–97）恢复原生 4 行映射（edit tool / bash+sed / 跨文件重命名 / 批量 checkbox），引言句改为「代码编辑回退到基础工具」 |
| `snap-edit-tool-guidance`（REMOVED） | ✅ | snap-edit 相关指导整节移除，迁移到原生 edit + 三项自检硬约束 |

### capability-manifest

| Requirement | 状态 | 实现证据 |
|---|:---:|---|
| `global-settings-packages-list`（MODIFIED） | ✅ | `.pi/capabilities.yaml` L64 删除 `- npm:pi-snap-edit`；sync 后 `~/.pi/agent/settings.json` packages 数组无 snap-edit |
| `package-removal-node-modules-cleanup`（MODIFIED） | ✅ | `pi remove npm:pi-snap-edit` 执行成功（removed 1 package）；`find ~/.pi -iname "*snap-edit*"` 无残留 |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|---|:---:|---|
| 1.1–1.3 spec 覆盖与基线确认 | ✅ | propose 阶段已确认，`8c6cd90^` 基线已获取 |
| 2.1.1 manifest 删除 snap-edit | ✅ | `.pi/capabilities.yaml` L64 已删 |
| 2.1.2 manifest grep 验证 | ✅ | `grep snap-edit .pi/capabilities.yaml` 无输出 |
| 2.2.1 AGENTS.md Edit Tool 节回退 | ✅ | L16–47 替换为原生 Edit Tool（quick_edit 批量 diff 确认） |
| 2.2.2 fff 引言句回退 | ✅ | L90「代码编辑回退到基础工具」 |
| 2.2.3 编辑工作流表恢复 | ✅ | L92–97 原生 4 行映射 |
| 2.2.4 AGENTS.md grep 验证 | ✅ | `grep snap-edit\|quick_edit\|target_edit .pi/agent/AGENTS.md` 无输出 |
| 2.3.1 CONTEXT.md 能力段删除 | ✅ | 「行号编辑」段已删，补回空行 |
| 2.3.2 CONTEXT.md grep 验证 | ✅ | `grep snap-edit\|quick_edit\|target_edit\|行号编辑 CONTEXT.md` 无输出 |
| 2.4.1 ADR 0010 新建 | ✅ | `docs/adr/0010-revert-snap-edit.md` 存在，撤销 0009，0009 保留 |
| 3.1 / 3.2 验证与回写准备 | ✅ | 证据点已整理（见下） |
| 4.1 verification.md | ✅ | 本文件 |
| 4.2 writeback.md | ✅ | 见 writeback.md |
| 4.3 回写执行 | ✅ | 无外部回写目标，sync + pi remove 已执行（见关键证据） |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| manifest 无 snap-edit | `.pi/capabilities.yaml` global.settings.packages | `global-settings-packages-list` / 2.1.1 |
| AGENTS.md 原生 edit | `.pi/agent/AGENTS.md` L16–25, L88–97 | `tool-call-guidelines-sections`, `fff-edit-workflow-mapping` / 2.2.x |
| settings.json 同步结果 | `~/.pi/agent/settings.json` packages 无 snap-edit（sync 日志 "Synced settings.json"） | `global-settings-packages-list` / 4.3 |
| node_modules 卸载 | `pi remove` 输出 "removed 1 package"；`find ~/.pi -iname "*snap-edit*"` 空 | `package-removal-node-modules-cleanup` / 4.3 |
| ADR 撤销链 | `docs/adr/0010-revert-snap-edit.md` → `0009-prefer-snap-edit-over-builtin-edit.md` | 2.4.1 |
| sync 脚本执行 | `scripts/sync-pi-agent.sh`（"Sync Complete" + env check OK） | runtime 同步 |

## 缺口与阻塞项

- **新 session 工具列表验证（待用户执行）**：本次 session 已加载 snap-edit，工具列表仍含 `quick_edit`/`target_edit`。需用户新开 session，确认工具列表恢复原生 `edit`（oldText/newText 模型），`quick_edit`/`target_edit` 不再出现。此项不阻塞 change archive（仓库与 runtime 变更已完成且验证），但建议在 archive 前由用户确认一次。
- **无 spec 缺口**：所有 MODIFIED/REMOVED requirement 均有实现与证据。
