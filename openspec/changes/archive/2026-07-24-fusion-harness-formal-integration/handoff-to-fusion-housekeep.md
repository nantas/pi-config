# Handoff — fusion-harness-formal-integration → fusion-housekeep

> 本文档是 `fusion-harness-formal-integration` change 的交付物，为新 change（`/fusion-housekeep` slash command）提供完整上下文。
> 新 change 从本文档起步，无需重复 grilling 过程。

---

## 一、背景

`fusion-harness-formal-integration` 完成了 fork 改造与正式注册，三命令（`/opinion`、`/fusion`、`/auto-validate`）已可用。过程 artifact 全部落在 `.scratch/fusion-harness/<run-dir>/`，包含 worker 原始输出、gate 脚本、gate run 日志、FUSION agent session 日志等。

这些 artifact 目前无索引、无生命周期管理——用户需要手动 `ls` 才能找到某个 run，`rm -rf` 才能清理。

## 二、artifact 分类

| 类别 | 文件 | 处理策略 |
|------|------|---------|
| **最终可读产物** | `fused-report-*.md` | 由 `/fusion` prompt 指定目标路径（如 `output/`），不留在 `.scratch/` |
| **可复用工具** | `gate.py`（auto-validate 产出的验证脚本） | 归档时可迁入项目 governance 工具目录 |
| **过程调试证据** | `architect.md`, `builder.md`, `gate-round-N.txt`, `gate-baseline.txt`, `validator.md`, `builder-round-N.md`, `fusion/*.jsonl` | 留在 `.scratch/`，用户按需清理 |
| **元数据** | `summary.json`, `prompt.md` | `summary.json` 用于索引；`prompt.md` 可弃 |

### 索引方案

Extension 在每个 run 完成后追加一行到 `.scratch/fusion-harness/run-index.jsonl`：

```jsonl
{"ts":"2026-07-24T11:11","command":"fusion","prompt":"...","ok":true,"dir":"fusion-harness-89FlCp","cost":0.0069,"durationMs":57328}
```

`/fusion-housekeep` 以此文件为索引源。

## 三、`/fusion-housekeep` 设计

### 命令形态

Slash command，注册在 fusion-harness extension 内（与 artifact 管理内聚）。

### 路由

```
/fusion-housekeep status   → 列出 run-index，显示每个 run 的 command/prompt/cost/时间
/fusion-housekeep archive [dir]  → 交互式归档：选择 run → fused-report → 目标路径，gate.py → governance
/fusion-housekeep clean [--keep N | --all] → 清理过程文件，默认保留最近 5 个 run
```

### 交互流程（archive）

1. 显示 run-index 列表
2. 用户选择 dir
3. 显示该 run 的 artifact 清单
4. 逐项确认：fused-report → 写入哪个目标路径？gate.py → 是否迁入治理工具？过程文件 → 保留/丢弃？
5. 归档完成后标记 run 为 archived

### 清理策略

- **不自动清理**——用户通过 `/fusion-housekeep clean` 主动管理
- 默认保留最近 N 个 run
- `--all` 清空全部

## 四、管道模式预留

最终需求：`/opinion` → `/fusion` → `/auto-validate` 可串联，后一步直接消费前一步的 artifact，无需重新 spawn worker。

当前 artifact 结构已支持这一模式：

| 跳转 | 输入 | 关键文件 |
|------|------|---------|
| opinion → fusion（跳过 worker） | architect.md + builder.md | 同一 run dir 下 |
| fusion → auto-validate | fused-report.md + gate.py（可选） | 同一 run dir 下 |

`summary.json` 含 `command` 和 `sessions` 字段，管道编排只需读此文件即可定位上游 artifact。

管道模式是独立 change，`/fusion-housekeep` 不在 scope 内。

## 五、实现指引

1. **添加 `run-index.jsonl` 写入**：在 fusion-harness.ts 的 `/opinion`、`/fusion`、`/auto-validate` 各 handler 完成处，追加 `saveArtifactsIndex()` 调用。复用已有 `summary.json` 的数据。
2. **注册 `/fusion-housekeep` 命令**：在 fusion-harness.ts 末尾 `pi.registerCommand("fusion-housekeep", ...)`。
3. **无需子 agent**：housekeeping 是纯文件操作（read/bash），不需要 spawn 子 pi 进程。
4. **不要重复造轮子**：`run-index.jsonl` 和 `summary.json` 的数据结构有大量重叠——考虑 `run-index.jsonl` 是否可以直接引用 `summary.json` 的路径而非重复存储字段。

## 六、已解决的 grilling 决策

| # | 决策 | 结论 |
|---|------|------|
| 1 | 命令形态 | slash command，注册在 fusion-harness extension |
| 2 | 是否合并 | 一个命令，内部路由 archive/clean/status |
| 3 | 清理触发 | 用户主动，不自动 |
| 4 | 最终产物去向 | prompt 指定目标路径，不留在 `.scratch/` |
| 5 | 子 agent 上下文 | 不读主 session，artifact 作为跨 run 记忆桥 |
