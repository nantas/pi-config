# Design

## Context

- 规范真源：`specs/fusion-harness-integration/spec.md`（本 change delta）
- 实现仓：`repo://fusion-harness` → `extensions/fusion-harness/fusion-harness.ts`
- 现状：三命令已写 run dir + 多数写 `summary.json`；无 index、无 housekeep
- ARTIFACT_ROOT：`path.join(process.cwd(), ".scratch", "fusion-harness")`
- 约束：不 spawn 子 agent；纯文件 + 既有 `ctx.ui`（`notify` / `input` / 列表选择）

## Goals / Non-Goals

**Goals:**

1. 双写 + reconcile 的 `run-index.jsonl`，使 status 对旧 run / 缺 summary 的 run 仍可用
2. `/fusion-housekeep status|archive|clean` 完成「看得见、迁得出、删得掉」
3. clean 默认 keep=3、整 dir 删；未归档高价值文件触发一次确认
4. archive 浅交互：高价值文件逐个问路径、拷贝、index 标 archived

**Non-Goals:**

- 管道编排、语义 gate、sessions 清理、自动清理、跨项目 housekeep、governance 自动落点

## Decisions

### D1 — 数据源：扫 dir 为发现真源，index 为可变状态

- housekeep 任意子命令入口：`reconcile()`
  - 枚举 `ARTIFACT_ROOT/fusion-harness-*`（排除名称恰好为 sessions 的非 run 树；sessions 目录名为 `fusion-harness-sessions`，与 `fusion-harness-<id>` 可区分）
  - 有 `summary.json` → 填 command/ok/cost/duration
  - 无 summary → mtime + basename，command/ok 可空
  - 写回完整 `run-index.jsonl`（重写或 upsert；实现选**整文件重写**更简单、避免 JSONL 脏追加）
- 三命令结束：`appendIndex(row)`（热路径）；随后 housekeep reconcile 可纠偏
- `archived` / `copied[]` **只存在 index**；index 丢失则归档态丢失（可接受，spec 已记）

### D2 — index 行最小字段

```ts
type RunIndexRow = {
  ts: string;           // ISO
  command?: string;     // opinion|fusion|auto-validate
  ok?: boolean;
  dir: string;          // basename only
  cost?: number;
  durationMs?: number;
  prompt?: string;      // truncated optional
  archived?: boolean;
  copied?: { from: string; to: string }[];
};
```

与 `summary.json` 允许重叠；index 是列表缓存 + 归档态，不是 summary 的替代。

### D3 — 命令面

```
/fusion-housekeep status
/fusion-housekeep archive [dir]
/fusion-housekeep clean [--keep N | --all]
```

- 人对 flag 无负担；agent 可传 `--keep` / `--all`
- 默认 `clean` ≡ `--keep 3`
- 无子 agent；逻辑进 extension（优先同文件小函数；若 ts 过长再拆 `housekeep.ts` 同目录 import——仅当单文件增量明显难读）

### D4 — 高价值文件与 archive

- 匹配：run 根下 `fused-report*.md`、`fused.md`、`gate.py`
- 选 run：有 `dir` 参数则用；否则 `ctx.ui` 选择（无现成 select 则编号列表 + `input` 选号）
- 每文件 `ctx.ui.input("Copy <name> to (empty=skip):", defaultHint?)`
- `fs.copyFile` / `fs.promises.copyFile`；目标父目录 `mkdir` recursive
- 完成后该 row `archived: true` + `copied` 记录成功项；**不删** run dir

### D5 — clean 策略

1. reconcile
2. 按 `ts`（缺则 dir mtime）降序，保留前 N，其余入 delete set
3. 若 delete set 中存在 `!archived && hasHighValue(dir)` → 打印清单 → **一次**确认（`input` y/N）
4. 确认失败 → 全部不删；成功 → `rm -rf` 各 dir，并重写 index 去掉这些行

### D6 — 三命令挂钩点

在现有写 `summary.json` 的 `finally`/成功路径旁调用 `appendIndex`，数据优先来自刚写的 summary + `artifactsDir` basename。失败路径若已有 dir 也建议 append（`ok: false`）。

### D7 — 实现位置与发版

- 开发：fork local path（已在 settings）+ `/reload`
- ship：fork commit/tag + 更新 `forks/manifest.yaml` `changes_summary`（及版本若需要）
- pi-config 本 change 不实现业务逻辑，只持 OpenSpec + 元数据回写

## Risks / Migration

| 风险 | 缓解 |
|------|------|
| index 手删丢 archived | 文档说明；reconcile 恢复目录列表；需重新 archive |
| clean 确认后不可恢复 | 确认文案列 dir；默认 keep 3 |
| 并发双写 index 损坏 | 单用户本地工具；整文件写用 tmp+rename |
| 旧 run 无 summary | reconcile 降级行，status 仍可见 |
| `89FlCp` 类缺 summary 的 fusion | 文件名可提示有 fused-report，command 可猜 fusion，非必须 |
| sessions 误删 | clean 明确跳过 `fusion-harness-sessions` |
| 与 upstream 分叉再增大 | housekeep 为 fork 独有；changelog 写清 |

**迁移：** 无需数据迁移脚本；首次 `/fusion-housekeep status` 即 reconcile 生成 index。
