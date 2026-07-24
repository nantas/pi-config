# Proposal

## 问题定义

`fusion-harness-formal-integration` 已使 `/opinion`、`/fusion`、`/auto-validate` 可用，过程 artifact 落在 `<cwd>/.scratch/fusion-harness/fusion-harness-*/`。现状：

- 无 run 索引：只能 `ls` 找 run
- 无归档路径：`fused-report*.md` / `gate.py` 常仍留在 scratch
- 无受控清理：只能 `rm -rf`，易误删未备份的高价值文件
- 部分早期 run 缺 `summary.json`，仅靠目录扫描才能看见

正式集成 handoff 将 `/fusion-housekeep` 定为下一 change：让用户在当前项目 cwd 内**看得见、迁得出、删得掉** fusion run artifact。

## 范围边界

### IN

- 在 `repo://fusion-harness` extension 注册 `/fusion-housekeep`，内部路由 `status` / `archive` / `clean`
- `run-index.jsonl`：三命令结束 append + housekeep 入口扫 dir reconcile
- clean：默认保留最近 **3** 个 run，整 dir 删除；用户/agent 可用自然语言要求全删或改保留数（实现可收参，不做人用 flag 负担）
- clean 安全：将删集合中含**未 archived 的高价值文件**时，列出清单并**一次确认**后再删
- archive：浅交互；对高价值文件逐个 `ctx.ui.input` 目标路径（可跳过）；拷贝不删源；index 标 `archived`
- 高价值文件：`fused-report*.md`、`fused.md`、`gate.py`
- 影响范围：仅当前 cwd 的 `.scratch/fusion-harness/fusion-harness-*` run dir
- OpenSpec 治理产物 + fork `changes_summary` 回写

### OUT

- 管道模式（opinion → fusion → auto-validate 串跑）
- auto-validate 语义 gate / LLM-as-judge 重设计
- my-wiki governance 脚本吸收 gate 检查项
- 自动/定时清理
- `fusion-harness-sessions/` 会话缓存管理
- 跨项目全局 housekeep

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `fusion-harness-integration`: 为既有 fusion-harness 集成补充 run 索引、归档与清理生命周期（`/fusion-housekeep` + index 双写/reconcile）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（扩展既有 `fusion-harness-integration`，不新开 capability）

## Impact

- **代码**：`repo://fusion-harness` `extensions/fusion-harness/fusion-harness.ts`（及必要时拆出的 housekeep 小模块）
- **运行时数据**：`<cwd>/.scratch/fusion-harness/run-index.jsonl`（新建）；既有 run dir 只读扫描，clean/archive 按用户确认改写/删除
- **包元数据**：pi-config `forks/manifest.yaml` 的 fusion-harness `changes_summary`；若发版则 settings/capabilities 包引用
- **用户面**：新增 slash command；三命令行为仅增加 index append，不改 fusion/validate 语义
- **风险**：index 被手删会丢 `archived` 标记（reconcile 重建目录清单，归档态需重做）；clean 确认后整 dir 不可恢复

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准：`openspec/specs/fusion-harness-integration/spec.md` + nantas fork
  - 项目页：formal-integration → housekeep handoff；trial handoff 生命周期缺口；`forks/manifest.yaml`
  - 回写：`repo://fusion-harness` 实现；pi-config fork 元数据
