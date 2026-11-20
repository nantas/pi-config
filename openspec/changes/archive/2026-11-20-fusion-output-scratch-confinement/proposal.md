# Proposal

## 问题定义

`/fusion` 在跑「带发布阶段的 skill 工作流」（如 `$game-wiki-ingest` 的 Phase D 发布到 `synthesis/digest/`）时，产出写入位置混乱：

- **实测污染**：一次 game-wiki-ingest 跑完，repo canonical 位长出两棵 namespaced 树（`slay-the-spire-ARCHITECT-kimi-coding-k3/`、`slay-the-spire-BUILDER-grok-build/`），而工作流约定的真正 canonical 目录（`slay-the-spire/`）无人产出。
- **根因 — 一个踢皮球循环**：worker prompt 暗示「canonical deliverable 由 fusion agent 写」，fuser prompt 又明确「ALL artifacts under ARTIFACTS_DIR，NEVER 其他目录」—— 两条指令拼起来，canonical 无人写，worker 被迫把 identity 塞进业务 slug 自认为「非 canonical」而妥协性产出。
- **更深层 — 形状失配**：fusion harness 整个契约是「文本答案」形状的（worker.md/builder.md → fused.md），但 publish-capable workflow 的产物单元是「file tree」。fusion 从未定义过「全流程到底产不产 canonical」。

用户预期已明确：**fuser 不需要融合两棵 tree，产出分析总结报告即满足需要**；目标是**消除污染**，把 fusion 全流程产出限定在 `.scratch/fusion-harness/` 内，由人类或授权 agent 后续整理与正式发布。

## 范围边界

**In scope**：
- 重定义 fusion 全流程的产出契约（L1 写位置硬约束 / L2 产出形态 / L3 角色边界）
- worker prompt：路径重写规则（A 声明式）+ 优先级覆盖（B 命令式）+ slug 净化，三段混合 override
- fuser prompt：L3 对齐 + 报告固定 section（产出清单 + promote 建议）
- `workerPrompt()` 实现缺口修复（当前未传 `ARTIFACTS_DIR`，override 规则无锚点）

**Out of scope**：
- 工具层硬墙（write 路径拦截）—— L1 先靠 prompt 实现；工具层拦截列为后续可选优化，本 change 不做（lazy）
- promote 工具化（`fusion_promote <run-id> <role>`）—— 现阶段人类/host agent 手动 promote 即可，工具化留作后续
- tree 级语义融合 —— 明确排除：fuser 只产答案形式的融合分析报告
- worker override 可行性的最终保证 —— 列为关键验证点（见 design.md），实测结果决定是否需追加机制

**Non-breaking**：
- `/fusion` 在纯分析/调研/技术选型场景（无发布阶段）的行为不变 —— 这类场景 worker 本就不写 repo，新约束不改变其产出
- merge-only 模式、`/opinion`、`/auto-validate` 不受影响（本 change 仅触及 `/fusion` worker + fuser）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `fusion-harness-integration`: 收紧 `/fusion` worker 与 fuser 的产出契约 —— 所有写操作限定 `.scratch/fusion-harness/<run-id>/` 内，repo canonical 位为禁区；worker 跑 publish-capable 工作流时按路径重写规则把根重定位到 `{{ARTIFACTS_DIR}}/{{ROLE}}/`，保留工作流定义的全部内部结构与 slug；fuser 不发布，产出分析报告含 promote 清单。

## Capabilities 待确认项

- [x] 能力清单已与用户确认（单一 Modified Capability `fusion-harness-integration`，无新增能力）
- [ ] worker override 可行性待实测验证 —— 见 design.md「关键不确定点」，验证失败时 capability 范围需扩展或调整方案

## Impact

- **代码**：`repo://fusion-harness extensions/fusion-harness/fusion-harness.ts`（`workerPrompt()` line 762 签名 + Stage 1 spawn 传参 line 1850/1862）+ 两个 prompt 模板（`USER_PROMPT_FUSION_WORKER.md` 核心重写、`USER_PROMPT_FUSION_MERGE.md` 追加 section）
- **配置**：无 `.pi/capabilities.yaml` 变更（本 change 不动包/扩展注册，仅改 fork 源码）
- **文档**：`forks/manifest.yaml` 追加版本变更摘要；roadmap 若引用本 change 则更新状态
- **既有行为**：纯分析类 `/fusion` 调用无回归；publish-capable 工作流调用从「污染 canonical」转为「干净镜像到 scratch」
- **依赖**：无硬依赖，独立于 roadmap 中 Change 1（merge-existing）/ Change 2（dual-stage-gate）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页：`openspec/specs/fusion-harness-integration/spec.md`
- 已确认项目页：`forks/manifest.yaml`、`docs/plans/fusion-harness-followup-roadmap.md`
- 已确认回写目标：`repo://fusion-harness`（`fusion-harness.ts` + 两个 prompt 模板）
