# Writeback: pkg-research-raw-extension-support

## Summary

pkg-research 技能新增 raw extension 支持，重构三选项语义对齐 global/catalog 模型。

## Deliverables

| # | Deliverable | Details |
|---|---|---|
| 1 | Raw Extension Phase 2 分支 | 源类型检测（package vs raw-extension）+ test-first 流程（扩展列表展示、npm 依赖检测、pi -e 测试命令、用户反馈等待），不修改 `.pi/` |
| 2 | Clone 生命周期优化 | Phase 1 clone 保留到 Phase 3 回收，避免重复 clone；Phase 3 各选项末尾统一清理 |
| 3 | 新三选项模型 | A: 加入本仓库能力 → 子选 Global(A1) / Catalog(A2)；B: backlog 纯记录（不安装、不写 manifest）；C: 放弃（可选拒绝记录） |
| 4 | Backlog Schema 扩展 | 新增 Source Type、Source Repo、Install Method、Has Dependencies 四个可选字段；向后兼容 |
| 5 | Phase 4 触发约束 | 仅 Option A1 (Global) 后触发；新增 extension global sync 验证 |
| 6 | AGENTS.md 治理更新 | 选项语义、clone 生命周期、backlog 记录规则、manifest 写入规则 |

## Capabilities Delivered

- `pkg-raw-extension-research` (new) — raw extension research workflow
- `pkg-security-review` (modified) — clone lifecycle
- `pkg-install-research` (modified) — source type branching
- `pkg-decision-backlog` (modified) — decision model + schema

## Verification

✅ 所有 22 个任务完成。见 `verification.md`。
