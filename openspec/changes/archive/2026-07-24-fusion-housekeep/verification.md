# Verification

## 验证结论

**实现完成，核心行为已用 node 脚本对真实 `.scratch/fusion-harness` 样本验证通过。**  
TUI 内 `/fusion-housekeep` 热加载冒烟未在本会话执行：`.pi/settings.json` 仍 pin `git:...#v0.1.3`，需 ship tag `v0.1.4` 或临时 `file:` 安装后 `/reload` 再验。

实现仓：`repo://fusion-harness`  
- `extensions/fusion-harness/housekeep.ts`（新建）  
- `extensions/fusion-harness/fusion-harness.ts`（`saveSummary` + 注册命令）  
- `package.json` → `0.1.4`

## Spec-to-Implementation Coverage

| Requirement | 实现 | 结果 |
| --- | --- | --- |
| Run Index Dual-Write | `appendIndexFromSummary` 经 `saveSummary` 挂三命令；`reconcileIndex` 在 housekeep 入口 | **PASS**（reconcile 实测 9 rows；append 代码路径已接） |
| Fusion Housekeep Command | `pi.registerCommand("fusion-housekeep")` → `handleHousekeep` | **PASS**（代码）；TUI 冒烟 **DEFERRED** |
| Archive High-Value Artifacts | `handleHousekeep archive` + `highValueFiles` + per-file input + `archived`/`copied` | **PASS**（FX8JR6 `gate.py` 拷到 tmp，源仍在，index archived） |
| Clean Run Directories | `planClean` keep 默认 3；`--keep`/`--all`；高价值一次确认；整 dir `rmSync`；跳过 sessions | **PASS**（abort 不删；fake run keep9 删除 2 个 zzTest） |
| Artifact Persistence (MODIFIED) | housekeep 仅操作 `fusion-harness-*` run dir | **PASS**（`listRunDirs` 排除 sessions） |

## Task-to-Evidence Coverage

| Task | 证据 | 结果 |
| --- | --- | --- |
| 1.1–1.2 | delta spec + fork 路径实现 | PASS |
| 2.1 | reconcile → `.scratch/fusion-harness/run-index.jsonl` 9 行 | PASS |
| 2.2 | 5 处 `saveSummary`（grep） | PASS（代码）；未跑完整 LLM 命令 |
| 2.3–2.4 | `formatStatus` 输出含 command/ok/cost/dir；缺 summary 的 `89FlCp` 仍列出 | PASS |
| 2.5 | archive FX8JR6 拷贝成功 | PASS |
| 2.6 | clean abort；fake dirs 删除 | PASS |
| 3.1–3.2 | 本文件 + writeback 目标 | PASS |
| 4.x | 本文件 + writeback 执行 | 见下 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 源码 | `repo://fusion-harness` `extensions/fusion-harness/housekeep.ts` | 2.1–2.6 |
| 挂载 | `.../fusion-harness.ts` `saveSummary` + `fusion-housekeep` command | 2.2–2.3 |
| Index | `pi-config/.scratch/fusion-harness/run-index.jsonl` | Run Index Dual-Write |
| Archive 实测 | FX8JR6 → `/tmp/.../gate-out.py`，index `archived:true` | Archive |
| Clean 实测 | zzTest1/2 创建后删除；abort 保持 9 dirs | Clean |
| 版本 | fork `package.json` `0.1.4` | ship 准备 |

## 缺口与阻塞项

1. **TUI 冒烟未做**：当前全局/项目包为 `git:...#v0.1.3`。需 `v0.1.4` push+tag 或 `file:` 本地安装后验证 slash 列表与交互 input。  
2. **三命令 live append 未端到端跑 LLM**：仅代码挂钩 + reconcile 覆盖旧 run。  
3. **fork 未 push / 未打 tag**：writeback 更新 manifest 摘要；settings pin 升级留给 ship。

## 复验修复（opsx-verify WARNINGs）

| WARNING | 修复 | 证据 |
| --- | --- | --- |
| 无参默认 status | 空 sub → usage | `housekeep.ts` + selfcheck |
| 早退未写 index | 三命令 `finally` + `partial: true` commitSummary | `fusion-harness.ts` |
| v0.1.4 不可达 | fork commit `8375795` + tag `v0.1.4` push；`.pi/settings.json` pin `#v0.1.4` | git + settings |
| TUI 冒烟 | 仍建议本地 `/reload` 后手测；纯函数 selfcheck 已加 | `housekeep.selfcheck.mjs` |
