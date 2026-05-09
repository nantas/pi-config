# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `subagent-prompt-guide` spec 中 7 个 requirement 的实现范围：prompt 需覆盖 single/parallel/chain/async 模式、dispatch 迁移映射、常用工作流模板、错误恢复指引，并指向 pi-subagents skill
- [x] 1.2 确认 `pi-subagent-dispatch-baseline` spec 中 13 个 REMOVED requirement 的清除范围：extension 目录、agent 文件、capabilities.yaml 条目、README/docs 引用
- [x] 1.3 确认依赖前置条件：当前仓库 git 状态干净，无未提交的 extension 修改

## 2. 核心实现任务

- [x] 2.1 **创建 `.pi/prompts/subagent.md`**
  - spec 覆盖：`subagent-prompt-guide` 全部 7 个 requirement
  - 内容：命令式快速参考，一屏以内，包含：
    - 一句话定位（/subagent 是 dispatch 的替代方案）
    - dispatch → subagent 迁移对照表（single/parallel/chain 映射）
    - 常用模式模板（recon→plan→implement、并行审查、oracle 咨询）
    - 错误恢复指引（unknown agent → list, 诊断问题 → doctor）
    - 指向 pi-subagents skill 的进阶用法引用
  - 验证方式：文件存在、渲染为 prompt 格式、不依赖 pi-subagents 版本特定 API
- [x] 2.2 **删除 `.pi/extensions/subagent-dispatch/` 目录**
  - spec 覆盖：清除 dispatch extension 残留
  - 范围：rm -rf 整个目录（含 index.ts、core.js、node_modules）
  - 验证方式：目录不再存在
- [x] 2.3 **删除 `.pi/agents/dispatch-planner.md`**
  - spec 覆盖：清除 dispatch-planner agent 残留
  - 验证方式：文件不再存在
- [x] 2.4 **更新 `.pi/capabilities.yaml`**
  - spec 覆盖：从 `global.extensions` 移除 `subagent-dispatch`，从 `global.agents` 移除 `dispatch-planner`
  - 验证方式：grep 确认无 dispatch 相关条目
- [x] 2.5 **更新 `README.md`**
  - spec 覆盖：移除 dispatch 扩展描述、dispatch-planner agent 描述
  - 变更：更新扩展计数（8→7）、agent 计数（1→0）、替换 dispatch 能力描述为 subagent prompt 入口
  - 验证方式：grep 确认无 dispatch 引用残留
- [x] 2.6 **更新 `docs/getting-started.md`**
  - spec 覆盖：移除 dispatch 引用，保持 subagent 模型配置指引
  - 变更：更新扩展计数、agent 计数（dispatch-planner 移除后 agent 从 1 变 0）
  - 验证方式：grep 确认无 dispatch 引用残留

## 3. 收敛与验证准备

- [x] 3.1 整理需要进入 verification 的证据与检查点：
  - 所有删除确认：extension 目录、agent 文件、capabilities.yaml、README.md、docs/getting-started.md
  - 所有新增确认：`.pi/prompts/subagent.md` 文件存在且内容正确
  - 功能检查：pi 会话中 `subagent` 工具可用，`dispatch` 工具不可用
  - 无残留引用：仓库范围内 grep "dispatch" 仅含文档的 migration 映射提及
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更：
  - `README.md` 和 `docs/getting-started.md` 的最终修改状态
  - `.pi/capabilities.yaml` 的清理确认
  - 全局同步的执行记录

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`：
  - 覆盖 spec-to-implementation 映射：每个 spec requirement 对应实现证据
  - 覆盖 task-to-evidence：每个 task 的完成状态和验证结果
  - 记录所有删除/新增文件的检查结果
- [x] 4.2 基于 verification.md 结论生成或更新 `writeback.md`：
  - 目标：`README.md`、`docs/getting-started.md`、`scripts/sync-pi-agent.sh`
  - 字段映射：回写内容为结论+状态摘要，不复制整份 artifact
- [x] 4.3 执行 writeback 目标，并记录可审计证据（链接、时间、执行人、结果）
  - 所有回写已在 Task 2.4-2.6 中完成
  - git diff 统计：7 files changed, 12 insertions(+), 1133 deletions(-)
  - 核心变更：dispatch-planner.md 删除、subagent-dispatch/ 目录删除、capabilities.yaml 清理、README.md 和 getting-started.md 更新
  - 新增文件：`.pi/prompts/subagent.md`（untracked，3432 bytes）
