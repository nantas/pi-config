# Tasks

## 1. Spec 覆盖与实现准备

- [x]1.1 确认 `specs/fusion-harness-integration/spec.md` 的 ADDED（Fusion Merge-Only Mode）与 MODIFIED（Run Index Dual-Write）requirement 全部有对应实现落点（见 §2）
- [x]1.2 确认 fork clone 可写：`ls ~/.pi/agent/git/github.com/nantas/fusion-harness/extensions/fusion-harness/fusion-harness.ts` 存在；`git -C <clone> status` clean
- [x]1.3 确认 baseline 既有路径无破坏：`/fusion` 不带 flag 时行为不变（§2.6 回归测试覆盖）

## 2. 核心实现任务

实现目标：`repo://fusion-harness extensions/fusion-harness/fusion-harness.ts` 的 `/fusion` handler。

- [x]2.1 **flag 解析**：在 `/fusion` handler 入口（`pi.registerCommand("fusion", ...)` 内，`parseFusionArgs(input)` 前后）增加 `--merge-existing <dir>` 检测——提取 dir token，剩余 token 作为可选 fusion-instruction；无 instruction 时用 `defaultFusionPrompt()`。验证：`/fusion --merge-existing <dir>` 与 `/fusion "p" "fp"` 与 `/fusion p :: fp` 三种形态可共存、不互相吞参（D3/R3）。
- [x]2.2 **源目录解析**：实现 dir 解析——绝对路径直接用；相对路径相对 `ctx.cwd` 解析；短 ID（housekeep index 序号）若可低成本复用 `housekeep.ts` 的 run 解析则支持，否则本次只支持路径、短 ID 留 follow-up（D2）。
- [x]2.3 **fail-fast 校验**：merge-only 分支入口校验——目录存在、`architect.md` + `builder.md` 都存在、两文件不以 `FAILED: ` 开头。任一不满足 → `ctx.ui.notify` 报错 + return，不 spawn 任何 agent、不 fallback 到 Stage 1（D4，spec scenario "refuses missing"/"refuses FAILED"）。
- [x]2.4 **Stage 1 跳过 + 答案装载**：merge-only 时跳过 `Promise.all([architect, builder])` 的 worker spawn；构造 `a`/`b` 对象 `{ role, model, text }`——`text` 从 `<dir>/architect.md`/`builder.md` 读取（`fs.readFileSync`），`role`="ARCHITECT"/"BUILDER"，`model` 优先从 `<dir>/summary.json.sources[].model` 取，缺失时用 `architectModel()`/`builderModel()` 并在后续 banner 标注 attribution 不确定（D1/D3/R1）。
- [x]2.5 **fuser 复用 + summary 字段**：merge-only 走既有的 `fuserPrompt(...)` + fuser spawn 流程（参数 `a`/`b` 来自 2.4）；`commitSummary` 写入 `mode: "merge-only"` + `sourceDir: <resolved>`；`sources`/cost/duration 只含 fuser（不含 worker）（D5，spec scenario "result attribution"）。
- [x]2.6 **banner/panel 标注**：merge-only 的 prompt panel（`kind:"prompt"`）文本显式含 `MERGE-ONLY`；fused panel（`kind:"fused"`）标注 `source: <dir basename>`；不新增 panel kind（D6，spec scenario "result attribution"）。
- [x]2.7 **run-index 记录**：merge-only run 完成时 `run-index.jsonl` upsert 的记录追加 `mode:"merge-only"` + `sourceDir`（MODIFIED requirement "Run Index Dual-Write"，scenario "merge-only run records lineage"）——确认既有 dual-write 路径在 summary 带这些字段时自动透传，否则显式补字段。
- [x]2.8 **抽取共享 runMergeOnly 内部函数**：把 `/fusion --merge-existing` handler 里的 merge 逻辑（loadMergeSource + mkArtifacts + fuser spawn + save fused + summary）抽成 `runMergeOnly(resolvedDir, instruction, cwd) → { ok, fusedPath, sourceDir, fusedText }`，供 slash command 和 agent tool 共用。验证：slash 路径重构后行为不变。
- [x]2.9 **注册 fusion_merge agent tool**：`pi.registerTool({ name: "fusion_merge", parameters: { runDir: string, instruction?: string }, execute })`——execute 内调 `runMergeOnly`，返回 `{ ok, fusedPath, sourceDir, mode:"merge-only", summary: fusedText.slice(0,2000) }`；失败时返回 `{ ok:false, error }`（不 throw）。复用 `resolveRun`/`resolveMergeDir` 解析 runDir。验证：agent 调用能完成 merge 并拿到 fusedPath。

## 3. 收敛与验证准备

- [x]3.1 准备真实 opinion run 作为 merge-only 输入：在 pi-config cwd 跑一次 `/opinion "<简单话题>"`，确认产出 `.scratch/fusion-harness/<ts>/{architect.md,builder.md,summary.json}`
- [x]3.2 准备 FAILED 输入测试夹具：手动构造一个 run 目录，`builder.md` 写 `FAILED: simulated`，用于验证 2.3 的 fail-fast
- [x]3.3 准备缺文件测试夹具：构造一个 run 目录只放 `architect.md`，用于验证 2.3 的 "refuses missing" scenario

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md，覆盖：spec scenario → 实测证据（正常 merge-only / 显式 fusion-instruction / 不带 flag 回归 / 缺文件 fail / FAILED fail / index 字段透传）
- [x] 4.2 生成 writeback.md：回写目标 = `repo://fusion-harness`（代码 commit + tag v0.2.0 + push）+ pi-config `forks/manifest.yaml`（`changes_summary` 追加）；字段映射与前置条件
- [x]4.3 执行 writeback：fork commit/push/tag（v0.2.0）→ pi-config `forks/manifest.yaml` 更新 `changes_summary` 追加 v0.2.0 条目 → manifest commit；全局 sync（`scripts/sync-pi-agent.sh`）是否执行交由用户确认（global-delivery 约定：deferred）
