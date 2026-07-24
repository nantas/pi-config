# Proposal

## 问题定义

fusion-harness（Dan Eisler 开发的 Pi multi-model orchestration extension）在 trial 阶段（`fusion-harness-trial`）已验证价值：consensus/divergence/discard 机制有效，gate-first loop 有效，sovereign 模型栈（deepseek + glm）可用。

但 trial 是 ad-hoc 运行——通过 `pi -e` 加载 scratch 目录的克隆、临时 shell 脚本拼模型 flag、system prompt 手动注入 my-wiki 契约。正式投入使用需要：
1. 将 extension 注册为 pi-config 常态化包（fork → 修改 → 安装）
2. 修正上游设计中的两处 pi-config 场景不适配（clean-room 过于激进、artifacts 路径不可持久）
3. 固化 sovereign 模型配置到 settings.json

## 范围边界

**在范围内**：
- Fork `disler/fusion-harness` 到 `nantas/fusion-harness`
- Fork 修改（4 项）：
  1. `ARTIFACT_ROOT` 从 `/tmp` 改为 `.scratch/fusion-harness/`（项目内持久）
  2. 子 agent spawn 参数去掉 `--no-skills` 和 `--no-context-files`，仅保留 `--no-extensions`（继承 repo 契约体系）
  3. `USER_PROMPT_FUSION_MERGE.md` 锁定输出路径为 `{{ARTIFACTS_DIR}}`
  4. `architectModel()` / `builderModel()` 增加 `settings.json` 的 `fusionHarness` 块作为 fallback
- pi-config 内完成 fork 注册（manifest.yaml）、settings.json 配置、全局包冲突处理
- 本地测试验证 `/fusion`、`/auto-validate`、`/opinion` 三条命令可用

**不在范围内**：
- auto-validate gate 重设计（LLM-as-judge 等语义验证层）——独立 change，trial handoff 疑问 3
- my-wiki governance 增强（gate 暴露的结构检查沉淀）——独立 change
- agent 角色文件抽象层——grilling 已确认不需要
- 自定义 system prompt 文件——grilling 已确认不需要

## Capabilities

### New Capabilities
- `fusion-harness-integration`: 将 fusion-harness extension fork 正式注册为 pi-config 包，提供 `/opinion`、`/fusion`、`/auto-validate` 三条 slash 命令，支持 sovereign 模型栈（deepseek-v4-pro architect + glm-5.2 builder），artifacts 持久化到项目 `.scratch/` 目录，子 agent 继承 repo 的 skills 和 AGENTS.md 契约体系

### Modified Capabilities
- `capability-manifest`: forks/manifest.yaml 新增 fusion-harness 条目；`.pi/settings.json` 新增 fusion-harness 包引用（开发阶段为本地路径，生产阶段切换为 git URL）

## Impact

- **pi-config 配置**：`.pi/settings.json` packages 数组新增 fusion-harness 包；新增 `fusionHarness` 配置块
- **全局环境**：若 `~/.pi/agent/settings.json` 存在同名包冲突，需按 pkg-fork-dev Phase D1a 移除并持久化覆盖记录
- **fork 仓库**：`repo://fusion-harness` 新增 4 项修改后推送
- **依赖**：无新增运行时依赖（extension 依赖的 `@earendil-works/pi-coding-agent` 和 `@earendil-works/pi-tui` 已由 pi 运行时提供）
- **破坏性变更**：无。子 agent 去掉 `--no-skills` 后加载 skills 和 context files，但 perspective 差异在 trial 中已验证不会因共享契约而消失

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页：disler/fusion-harness upstream + my-wiki stop-picking digest
- 已确认项目页：trial handoff + trial index + trial verification
- 已确认回写目标：pi-config（manifest.yaml、settings.json）
