# Verification

## 验证结论

**实现完成度**：core logic（§1+§2，12 tasks）全部落地并通过单元测试。merge-only 的纯函数逻辑（flag 解析、路径解析、源装载/校验）有 23 项断言覆盖。集成路径（真实 `/fusion --merge-existing` 在 pi session 内产 fused.md、banner、run-index 字段）需要交互式 pi + 真实模型 API，本文档提供精确复现命令，留待用户在 TUI 中执行后回填证据。

**结论**：spec 的 7 个 ADDED scenario + 1 个 MODIFIED scenario 中，6 个由单元测试 + 代码审查证明（parse/resolve/validate 路径），2 个需交互式验证（实际 fuser merge 产出、run-index 运行时透传）。

## Spec-to-Implementation Coverage

| Spec Requirement / Scenario | 实现落点 | 证据状态 |
| --- | --- | --- |
| **ADDED: Fusion Merge-Only Mode** | | |
| Merge-only via flag → skip Stage 1, read files, feed fuser, reuse fuserPrompt | `fusion-harness.ts:1807-1850`（merge-only 分支：`parseMergeExistingFlag` → `resolveMergeDir` → `loadMergeSource` → 跳过 `Promise.all`，直接 `runChild` fuser with `fuserPrompt(...)`） | 代码审查 ✓；集成待跑 |
| Merge-only with explicit fusion instruction | `fusion-harness.ts:1825` `mFusionInstruction = mergeFlag.rest.trim() \|\| defaultFusionPrompt()` | 单元测试 "flag + dir + fusion instruction" ✓ |
| **ADDED: Fusion Merge Agent Tool** | | |
| Agent invokes fusion_merge with valid runDir → spawn fuser, return result | `fusion-harness.ts` `fusion_merge` tool 注册（`pi.registerTool`）→ 调 `runMergeOnly` → 返回 `{ok, fusedPath, sourceDir, mode, summary}` | 代码审查 ✓；集成待跑 |
| Result attribution records source run（summary mode+sourceDir + banner MERGE-ONLY） | `fusion-harness.ts:1847-1862`（banner body `MERGE-ONLY · source: <label>`）+ `1860`/`1866` `commitSummary({mode:"merge-only", sourceDir:resolved})` | 代码审查 ✓；集成待跑 |
| Normal fusion unchanged when no flag | merge-only 分支仅在 `parseMergeExistingFlag(input)` 非 null 时进入，否则原样 fall-through 到既有 `parseFusionArgs` 路径（逐字未改） | 单元测试 "normal quoted fusion NOT eaten" / ":: form NOT eaten" ✓ |
| Refuses missing worker files | `merge-source.ts loadMergeSource`：`!fs.existsSync(aPath/bPath)` → return `{error}`；handler `ctx.ui.notify` + return，不 spawn | 单元测试 "missing builder.md → error" ✓ |
| Refuses FAILED worker outputs | `merge-source.ts loadMergeSource`：`startsWith("FAILED:")` → return `{error}` | 单元测试 "FAILED architect.md → error" ✓ |
| Does not mutate source dir | merge-only 用 `mkArtifacts()` 建**新** artifactsDir，所有 save 落新目录；源目录只读（`readFileSync`） | 代码审查 ✓ |
| **MODIFIED: Run Index Dual-Write** | | |
| Merge-only run records lineage（index mode+sourceDir） | `housekeep.ts`：`RunIndexRow` 加 `mode?`/`sourceDir?`；`rowFromSummary` 从 summary 透传两字段；`fusion-harness.ts:1860/1866` summary 写入字段 | 代码审查 ✓；运行时透传待跑 |

## Task-to-Evidence Coverage

| Task | 证据 |
| --- | --- |
| 1.1 spec 覆盖 | 上表 8 scenario 全有落点 |
| 1.2 clone 可写 | `feat/merge-existing` 分支已开，改动已落盘 |
| 1.3 baseline 无破坏 | merge-only 分支独立 return；`parseFusionArgs` 路径未改；单元测试 "normal quoted/:: NOT eaten" |
| 2.1 flag 解析 | `merge-source.ts parseMergeExistingFlag`；单元测试 8 条（含引号/空格/混合） |
| 2.2 路径解析 | `merge-source.ts resolveMergeDir`；单元测试 5 条（绝对/相对/basename/不存在） |
| 2.3 fail-fast 校验 | `merge-source.ts loadMergeSource`；单元测试 missing + FAILED |
| 2.4 Stage 1 跳过+装载 | `fusion-harness.ts` merge-only 分支无 `Promise.all`；`loadMergeSource` 装载 `{role,model,text}` |
| 2.5 fuser 复用+summary | 复用 `fuserPrompt` + `runChild`；summary 带 `mode/sourceDir` |
| 2.6 banner/panel 标注 | banner body `MERGE-ONLY · source:` |
| 2.7 run-index 字段 | `housekeep.ts` `RunIndexRow` + `rowFromSummary` 扩展 |
| 3.2 FAILED 夹具 | 单元测试 `fusion-harness-FA` 合成目录 |
| 3.3 缺文件夹具 | 单元测试 `fusion-harness-NOB` 合成目录 |
| 3.1 真实 opinion run | **待用户执行**（见缺口） |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 单元测试（23 assertions，全过） | `repo://fusion-harness extensions/fusion-harness/merge-source.test.ts`（`node --experimental-strip-types merge-source.test.ts`） | 2.1 / 2.2 / 2.3 / 3.2 / 3.3 |
| 纯逻辑模块 | `repo://fusion-harness extensions/fusion-harness/merge-source.ts` | ADDED requirement 的 parse/resolve/load |
| handler 集成分支 | `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts:1807-1870` | ADDED requirement 的 skip-Stage1 + fuser |
| index 字段扩展 | `repo://fusion-harness extensions/fusion-harness/housekeep.ts:21-22,148-149` | MODIFIED requirement |

## 缺口与阻塞项

### 缺口 1：交互式集成验证（非阻塞，待用户回填）

以下 spec scenario 需要**真实 pi session + 模型 API**才能产出实测证据，agent 无法在本环境驱动：

1. **Merge-only 产出 fused.md**：`/fusion --merge-existing <一个已有 opinion run 目录>`，确认产出 `fused.md` 且 banner 标 `MERGE-ONLY`。
2. **run-index 运行时透传**：跑完后 `tail .scratch/fusion-harness/run-index.jsonl`，确认最新行含 `"mode":"merge-only"` + `"sourceDir":"<绝对路径>"`。
3. **不带 flag 回归**：`/fusion "测试" "merge"` 仍正常走 Stage 1（两个 worker 列出现）。

**复现命令**（用户在 pi TUI 执行）：
```
# 前置：先有一个 opinion run（任意话题）
/opinion "对比 A 和 B 的取舍"

# 查看 run 目录
/fusion-housekeep status
# 记下最近的 fusion-harness-<ts> 目录名

# 触发 merge-only
/fusion --merge-existing fusion-harness-<ts>
# 或绝对路径：/fusion --merge-existing .scratch/fusion-harness/fusion-harness-<ts>

# 验证 index 字段
# 在 host agent shell: tail -1 .scratch/fusion-harness/run-index.jsonl
```

### 缺口 2：writeback 执行确认（阻塞 archive）

§4.3 的 fork commit/tag/push + manifest 更新需用户确认后再执行（见 writeback.md）。tag/push 是远程操作，不自动跑。
