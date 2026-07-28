# Verification

> 状态：**已恢复，待重新执行**。本 change 曾于 2026-07-26 归档（verification 标 PASS），但归档后的实现证据失效——当时的单行改动仅存在于全局 managed clone `~/.pi/agent/git/github.com/nantas/fusion-harness/` 的工作树中，**从未 commit/push 回 fork 仓库**；后续某次 `pi install -l` 重置 managed clone 至 origin/main（v0.2.2），改动丢失。fork 远程历史无任何 boot banner commit，全局 clone 当前 `fusion-harness.ts:1767` 仍为 `panel({ kind: "boot", ok: true }, "FUSION HARNESS")`。
>
> 已从 main spec 回滚本次归档合并的 Boot Banner requirement（`openspec/specs/fusion-harness-integration/spec.md`），change 恢复为活跃状态重新执行。下方骨架待重新实现后由 `/opsx-verify` 补全证据。

## spec-to-implementation coverage

| Spec Requirement | 实现落点 | 状态 | 证据 |
|---|---|---|---|
| Boot Banner Context Hygiene（delta: ADDED） | `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts` boot `panel()` 调用 content 实参 → `""` | 待实现 | _TBD_ |

## task-to-evidence coverage

| Task | 完成标准 | 状态 | 证据 |
|---|---|---|---|
| 2.1 boot panel content 置空 | git diff 显示 `"FUSION HARNESS"` → `""` 单行改动 | 待实现 | _TBD_ |
| 2.2 details/display 不变 | content 空 + `{kind:"boot",ok:true}` + `display:true` 保持 | 待实现 | _TBD_ |
| 2.3 banner 视觉渲染不变 | TUI 目测 + renderer 零 content 引用分析 | 待验证 | _TBD_ |
| 3.1 其它 panel content 未改 | git diff 仅 boot 行 | 待实现 | _TBD_ |
| 3.2 headless/非 startup 未受影响 | 三个 session_start 守卫未改 | 待验证 | _TBD_ |
| 4.1-4.4 verification + writeback + ship | fork commit + push + manifest | 待执行 | _TBD_ |

## 关键执行约束（重新执行时必须遵守）

- **改 dev clone，不改 managed clone**：实现必须落 `/Users/nantasmac/projects/forks/fusion-harness`（`repo://fusion-harness`），Phase E commit + push 后，managed clone 由 `pi install -l` 拉取更新。**禁止直接改 `~/.pi/agent/git/...` 工作树**——这是上次丢失改动的根因。
- **版本号**：fork origin/main 现为 v0.2.3（output confinement，本 session 刚 ship）。本次 boot banner 重新 ship 时版本号 = **v0.2.4**（manifest 的虚假 v0.2.3 记录已被纠正为 output confinement，不再是 boot banner）。

## 缺口

- 当前无实现（managed clone 已重置，dev clone 在 v0.2.3 output confinement，均无 boot banner 改动）
- 所有 task 重置为未完成，待重新执行
