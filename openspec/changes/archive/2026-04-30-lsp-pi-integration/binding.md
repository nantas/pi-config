# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无外部标准引用（本 change 为本地仓库配置变更）
- `project_page_ref`: `openspec/pkg-backlog.md` — lsp-pi 全局决策记录
- `additional_context_refs`: `tsconfig.json` — 项目根 TypeScript 配置

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`（本次无新 capability）
- 项目页面角色：pkg-backlog.md 记录 package 决策历史
- 非真源说明：本次 change 不涉及新的规格 capability，仅为配置变更

## 回写目标

- `writeback_targets`: 无（`.pi/settings.json` 和 `tsconfig.json` 已在本地仓库，无需跨仓回写）
- `writeback_owner`: @nantasmac
- `writeback_timing`: 归档前验证完成即可

## 同步约束

- `.pi/settings.json` 变更已通过 `scripts/sync-pi-agent.sh` 同步到全局
- `tsconfig.json` 仅在项目本地生效，无需同步
- `openspec/pkg-backlog.md` 中的 lsp-pi 条目已记录

## 待确认项

- [x] 已确认标准页引用 — 不适用
- [x] 已确认项目页引用 — `pkg-backlog.md`
- [x] 已确认回写目标与权限 — 不涉及跨仓回写
- [x] 已确认异常处理与冲突策略 — 无冲突
