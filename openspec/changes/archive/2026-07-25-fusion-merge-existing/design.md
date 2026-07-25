# Design

## Context

`/fusion` 当前 handler（`repo://fusion-harness extensions/fusion-harness/fusion-harness.ts:1796`）固定两阶段：`Promise.all([architect, builder])` → 落盘 `architect.md`/`builder.md` → fuser 读盘 merge。两个 worker 在 Stage 1 物理并行、互不可见（`workerPrompt` 只传对方 role/model 名，不传答案），所以 worker 的产出只取决于 prompt + 模型，与"本次 Stage 1 跑"还是"上次 opinion 跑过"无关——这意味着对同一 prompt 重跑 Stage 1 是纯冗余，merge-only 复用既有答案在语义上零损失。

链路 B（fused→后续工作流）经 grilling 确认为现有能力：host agent 通过对话记忆 + bash 查 `run-index.jsonl` 获得工件路径，写进下一个命令的 prompt，子 agent 用既有 `read` 工具读取。per-role persistent session 让 agent 隐式记得上下文；fused.md 这种文件级产出靠 host agent 显式带路径。本次 change 不触碰链路 B——它已经能用。

参考行为真源：`specs/fusion-harness-integration/spec.md`（Fusion Merge-Only Mode + Run Index Dual-Write 两个 requirement）。

## Goals / Non-Goals

**Goals:**

- `/fusion` 支持 merge-only 模式，跳过 Stage 1，直接用指定 run 目录的两个答案文件喂 fuser
- fuser prompt 路径完全复用（`fuserPrompt` + `USER_PROMPT_FUSION_MERGE.md`），merge 逻辑不变
- banner/panel/summary 明确标注 merge-only + source dir，避免与正常 fusion 混淆、避免被误读为"本次 worker 成本"
- 异常路径明确（缺文件 / FAILED 标记 / 路径歧义），不静默 fallback 到重跑

**Non-Goals:**

- 不改链路 B（fused→下游流转）——现有 host agent 带路径 + 子 agent read 已可用
- 不引入 session-scoped 工件索引或自动注入工件路径的机制
- 不改 per-role session 机制（fuser 本来就是 throwaway）
- 不给 `/opinion` 或 `/auto-validate` 加 merge 能力
- 不做 gate 重设计 / LLM-as-judge（独立 change `fusion-dual-stage-gate`，见 roadmap）

## Decisions

### D7 — fusion_merge agent tool（让 host agent 能执行 merge）

**决策**：新增 `fusion_merge` agent tool（`pi.registerTool`），让 host agent 能以工具调用方式触发 merge-only，免去用户手查 run id + 拼 `/fusion --merge-existing` 参数。

**参数**：
- `runDir`（必需）：run 目录/短 ID/basename（复用 `resolveRun` / `resolveMergeDir`）
- `instruction`（可选）：融合指令，默认 `defaultFusionPrompt()`

**返回给 agent**：
```json
{
  "ok": true,
  "fusedPath": "<abs>/fused.md",
  "sourceDir": "<resolved>",
  "mode": "merge-only",
  "summary": "<fused.md 前 ~2000 字符>"
}
```
`summary` 让 agent 无需再 read 文件即可向用户概括结论；`fusedPath` 让 agent 后续可 read 全文推进工作流（链路 B）。

**关键复用**：slash command 和 tool 的 merge 逻辑共享一个内部函数 `runMergeOnly(resolvedDir, instruction, cwd) → { fusedPath, sourceDir, ok }`。两者行为一致，只是输出通道不同（slash → live panel；tool → 文本返回）。

**无 live panel**：tool 执行不渲染实时双列。但 fuser 是单 agent merge，本无双列可渲染，损失可接受。tool 执行期间 agent 处于等待（tool execute 无硬超时）。

### D1 — 触发 flag：`--merge-existing <dir>`

**决策**：`/fusion --merge-existing <path> [optional fusion-instruction]`。

**理由**：
- 与 upstream 命令风格一致（`/fusion` 已支持双引号 prompt + fusion-instruction，`--flag <arg>` 是 pi 命令常见形态）
- 显式 flag 比位置参数歧义小（避免和既有的 `"prompt" "fusion-prompt"` 解析冲突）
- `<dir>` 直接是 run 目录路径，用户从 `/fusion-housekeep status` 复制即可

**flag 解析**：在 `parseFusionArgs` 之后（或合并进它）新增一层——检测 `--merge-existing` token，提取其后 token 作为 dir，剩余作为可选 fusion-instruction。若只有 `--merge-existing <dir>` 无 instruction，用 `defaultFusionPrompt()`。

### D2 — 路径解析：绝对/相对/短 ID

**决策**：支持三种输入，解析优先级 绝对路径 > 相对 cwd 路径 > run-index 短 ID。

- 绝对路径：直接用
- 相对路径：相对 `ctx.cwd` 解析（和工件落盘的 `ARTIFACT_ROOT` 同基准）
- 短 ID：复用 housekeep 的 run 解析（若 `listRunsPayload`/index 能按序号定位）；若无法解析为已有 run，按相对路径处理

**理由**：housekeep 已建立 run 目录约定（`fusion-harness-<ts>`），短 ID（status 列表的序号）是用户最自然的输入。但本次不强制实现短 ID 解析——若 housekeep 的解析函数可低成本复用则用，否则 v0.2.0 先只支持绝对/相对路径，短 ID 留 follow-up。design 里标注这个降级。

### D3 — merge-only 的 Stage 1 跳过点

**决策**：在 `/fusion` handler 的 Stage 1 `Promise.all` 处加分支——merge-only 时跳过 worker spawn，直接构造 `a`/`b` 两个对象（role/model/text 从读盘的文件 + 当前模型配置填充），进入既有的 fuser spawn 流程。

**关键复用**：`fuserPrompt(fusionInstruction, prompt, a, b, ...)` 的 `a`/`b` 参数结构是 `{ role, model, text }`——merge-only 只需把 `text` 换成"从 `<dir>/architect.md` 读出的内容"，`role`/`model` 用当前配置（`architectModel()`/`builderModel()`）填充。注意 `model` 字段：merge-only 复用的是**上次 run 的产出**，但 fuser prompt 里标注的 model 应反映产出时的模型——读 `summary.json` 的 sources 字段拿原始 model，若 summary 缺失则用当前配置并接受轻微不准（标注在 banner）。

### D4 — 异常处理：fail-fast，不 fallback

**决策**：merge-only 任何输入异常都报错退出，**不**静默退回 Stage 1 重跑。

- 缺 `architect.md`/`builder.md` → 错误："merge-only source <dir> missing <file>"
- 文件含 `FAILED: ` 前缀 → 错误："merge-only source <dir> <role>.md is a FAILED output from prior run; fusion needs two successful inputs"
- 路径不存在 → 错误："merge-only source dir <dir> does not exist"

**理由**：静默 fallback 会让用户以为省了 token 实际又花了，违背 merge-only 的核心价值（透明地省成本）。

### D5 — summary/index 字段

**决策**：merge-only run 的 `summary.json` 和 `run-index.jsonl` 记录额外字段：
- `summary.json`: `mode: "merge-only"`, `sourceDir: "<resolved path>"`, `sources` 只含 fuser（不含 worker 的 cost/duration）
- `run-index.jsonl`: 同步追加 `mode` + `sourceDir`（MODIFIED requirement 的 Run Index Dual-Write）

### D6 — banner/panel 视觉区分

**决策**：merge-only 的 `kind: "prompt"` panel 文本显式标 `MERGE-ONLY`，fused panel 标注 `source: <dir basename>`。不新增 panel kind，复用既有 `"fused"` kind，靠文本内容区分。

**理由**：新增 kind 会牵动渲染逻辑，违背最少代码；文本标注零成本达成"用户一眼看出这不是正常 fusion"。

## Risks / Migration

### R1 — model 标注不准（低）
merge-only 复用旧 run 的答案，但 fuser prompt 里标注的 model 若来自当前配置而非源 run，可能与答案实际产出模型不符。
**缓解**：优先读 `summary.json.sources[].model`；缺失时用当前配置并在 banner 标注 "model attribution from current config (source summary missing)"。

### R2 — 源目录被并发 clean（低）
用户跑 merge-only 时，另一个 session 跑 `/fusion-housekeep clean` 删了源目录。
**缓解**：merge-only 读盘时源目录不存在 → fail-fast 报错（D4 已覆盖）。clean 默认保留最近 3 个 run，源目录通常是最近的，风险低。

### R3 — flag 解析与既有 `parseFusionArgs` 冲突（低）
既有解析支持 `"prompt" "fusion-prompt"` 和 `prompt :: fusion-prompt`。新增 `--merge-existing` 需避免吞掉这些形态。
**缓解**：`--merge-existing` 作为前缀 token 独立检测，不影响其余 token 的既有解析；实现时加单测覆盖三种形态共存。

### Migration
- 无 breaking change：不带 flag 时 `/fusion` 行为完全不变
- 无数据迁移：既有 run 目录的 `architect.md`/`builder.md` 立即可被 merge-only 消费，无需改造历史 run
- `run-index.jsonl` 新增字段（`mode`/`sourceDir`）是追加式，老 reader 忽略未知字段即可
