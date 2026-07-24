# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 delta spec 四条 ADDED + Artifact Persistence MODIFIED 覆盖 housekeep 行为；OUT 项不进实现（引用 `specs/fusion-harness-integration/spec.md`）
- [x] 1.2 确认实现根：`repo://fusion-harness`（`/Users/nantasmac/projects/forks/fusion-harness`），开发态 local path + `/reload`；不改 pi-config 业务代码

## 2. 核心实现任务

- [x] 2.1 **Index 工具函数**（`fusion-harness.ts` 或同目录小模块）：`indexPath`、`readIndex`、`writeIndex`（tmp+rename）、`rowFromSummary(dir, summary?)`、`listRunDirs(ARTIFACT_ROOT)`、`reconcileIndex()`  
  - 覆盖：Run Index Dual-Write（reconcile 段）  
  - 验证：对现有 `.scratch/fusion-harness/fusion-harness-*` 调用 reconcile 后 `run-index.jsonl` 行数 ≥ run dir 数，且跳过 `fusion-harness-sessions`

- [x] 2.2 **三命令 appendIndex**  
  - 在 `/opinion`、`/fusion`、`/auto-validate` 写 `summary.json` 路径旁 append 一行（含失败但仍有 dir 时 `ok: false`）  
  - 覆盖：Run Index Dual-Write（command completion）  
  - 验证：各跑一次最小命令或单元式调用后 index 新增对应 `dir`

- [x] 2.3 **注册 `/fusion-housekeep`**  
  - 路由 `status` | `archive` | `clean`；无参/未知 → usage  
  - 覆盖：Fusion Housekeep Command  
  - 验证：TUI `/fusion-housekeep` 与 `/fusion-housekeep status` 可用

- [x] 2.4 **status**  
  - 入口 reconcile → 打印 command/ok/ts/cost/archived/dir  
  - 空 ARTIFACT_ROOT 不抛错  
  - 覆盖：Status lists runs；Empty artifact root  
  - 验证：本仓现有 7 个 run 列表可见；缺 summary 的 dir 仍出现

- [x] 2.5 **archive**  
  - 选 dir（参数或 input 选号）；枚举高价值文件；逐文件 `ctx.ui.input` 路径；copy；index `archived` + `copied`  
  - 覆盖：Archive High-Value Artifacts  
  - 验证：对含 `fused-report` 或 `gate.py` 的 run 拷到临时路径，源仍在，status 显示 archived

- [x] 2.6 **clean**  
  - 默认 keep 3；支持实现层 `--keep N` / `--all`  
  - 未归档高价值 → 清单 + 一次确认；取消则零删除  
  - 确认后整 dir 删除并更新 index；永不碰 sessions  
  - 覆盖：Clean Run Directories  
  - 验证：构造/选用可删 run，确认取消不删；确认后 dir 消失且 keep 策略正确

## 3. 收敛与验证准备

- [x] 3.1 在 verification 中准备证据：reconcile 前后 index 片段、status 输出、archive 拷贝路径、clean 确认与删除结果
- [x] 3.2 标记 writeback：`forks/manifest.yaml` changes_summary；fork commit/tag（若 ship）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（spec-to-implementation + task-to-evidence）
- [x] 4.2 基于 verification 结论生成或更新 `writeback.md`
- [x] 4.3 执行 writeback 并记录证据（manifest 摘要、fork 提交、执行人/时间）
