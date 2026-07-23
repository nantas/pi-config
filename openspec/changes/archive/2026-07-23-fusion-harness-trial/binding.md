# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `20-synthesis/digest/讲座/IndyDevDan/stop-picking-fuse-them-model-fusion.md`（my-wiki 内部对 fusion harness 模式的综合提炼，含三命令价值递进、auto-validate 验证前置、harness 工程细节索引）
- `project_page_ref`:
  - `https://github.com/disler/fusion-harness`（Dan Eisler 开源的 fusion harness 参考实现，本 trial 的 upstream）
  - `/Users/nantasmac/projects/my-wiki/.agents/skills/ingest/lecture-ingest/SKILL.md`（trial 的执行上下文与契约源——lecture-ingest 工作流）
- `additional_context_refs`:
  - `/Users/nantasmac/projects/my-wiki/docs/specs/synthesis-output-guidance.md`（builder 须遵循的产出契约）
  - `/Users/nantasmac/projects/my-wiki/docs/specs/markdown-output-quality.md`（markdown 质量/wikilink 转义契约）
  - `/Users/nantasmac/projects/my-wiki/tools/governance_report.py`（现有静态 governance floor，auto-validate 的对比基准）
  - `/Users/nantasmac/projects/my-wiki/docs/adr/0005-four-dimension-governance.md`（四维治理链，auto-validate Extend 模式的静态层基础）

## Source of Truth

- 行为规范真源：`specs/fusion-harness-trial/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据；my-wiki 的 lecture-ingest skill 是执行上下文输入，不约束本 trial 的行为规范

## 回写目标

- `writeback_targets`:
  - **trial 阶段无永久回写目标**。本 change 的产物仅限 pi-config `openspec/changes/fusion-harness-trial/` 内的 spec 工件；trial 实际运行在 scratch（`~/scratch/fusion-trial/`），产出落 `~/scratch/fusion-trial/output/`，均为临时、可弃。
  - my-wiki 与 pi-config 的 `.pi/` 资源在 trial 阶段**不被修改**（价值未确认前不引入新 skill/extension）。
- `writeback_owner`: pi-config 仓库（仅 spec 工件）
- `writeback_timing`: spec 工件随 change 流程创建；trial 实际执行结果记录于 `verification.md`，不回写到 my-wiki 或 pi-config 运行时配置
- **后续回写（超出本 change scope）**：价值确认后，由独立 change 走 `pkg-research` / `pkg-fork-dev` 流程正式引入 pi-config，届时才产生 `.pi/` 与 `capabilities.yaml` 的回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 若存在未确认引用、未定目标页或权限限制，必须在下方列明
- my-wiki 未注册到 `~/.config/orbitos/repo_registry.json`，trial 期间以绝对路径引用；若后续正式引入需跨仓回写，须先注册 `repo://my-wiki`

## 待确认项

- [x] 已确认标准页引用（my-wiki digest 为内部模式提炼，fusion-harness 仓库为 upstream）
- [x] 已确认项目页引用（fusion-harness upstream + my-wiki lecture-ingest skill）
- [x] 已确认回写目标与权限（trial 阶段无永久回写，仅 pi-config 内 spec 工件）
- [x] 已确认异常处理与冲突策略（trial 失败则 scratch 弃用，零污染；my-wiki 与 pi-config 运行时不动）
