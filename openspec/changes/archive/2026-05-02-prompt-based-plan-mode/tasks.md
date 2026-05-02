# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界（`planner-toggle` 改造 + `codex-plan-mode-reference` 参考文档）
- [x] 1.2 确认依赖前置条件与外部协作项（无 — 本 change 完全在 pi-config 仓内完成）

## 2. 核心实现任务

### 2.1 重构 `planner-toggle.ts`（参考 `specs/planner-toggle/spec.md`）

- [x] 2.1.1 删除 `PLANNER_TOOLS`、`DEFAULT_TOOLS` 常量
- [x] 2.1.2 删除 `DESTRUCTIVE_PATTERNS`、`SAFE_PATTERNS`、`isSafeCommand()` 全部 bash 正则
- [x] 2.1.3 删除 `tool_call` 事件处理（整个 `pi.on("tool_call", ...)` 块）
- [x] 2.1.4 删除 `context` 事件处理（整个 `pi.on("context", ...)` 块）
- [x] 2.1.5 删除 `togglePlannerMode()` 中的 `pi.setActiveTools()` 调用
- [x] 2.1.6 新增 `PLAN_MODE_SYSTEM_PROMPT` 常量（Codex 风格完整指令文本，~60 行）
- [x] 2.1.7 重写 `before_agent_start` handler：从 `message` 注入改为 `systemPrompt` 注入
- [x] 2.1.8 更新 toast 通知文本（不再显示工具列表）
- [x] 2.1.9 简化 `persistState()` —— 状态不变但确认工具恢复逻辑已被删除
- [x] 2.1.10 验证编译通过：`npx tsx --eval "import './.pi/extensions/planner-toggle.ts'"`

**验证方式**: 启动 pi TUI，触发 `/planner`，检查：
- status bar 显示 "⏸ plan"
- 所有工具可见可用（read, write, edit, bash, 扩展工具等）
- 输入 "read the current directory" → 正常运行
- 输入 "create a file called test.txt" → LLM 应基于 prompt 指令拒绝
- 再次 `/planner` 退出，状态恢复

### 2.2 产出参考文档 `docs/reference/plan-mode-comparison.md`

- [x] 2.2.1 创建 `docs/reference/plan-mode-comparison.md`，依据 `specs/codex-plan-mode-reference/spec.md` 的 requirements

**验证方式**: 文件存在，结构完整，每条结论锚定文件路径和行号

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点（spec-to-implementation 映射 + task-to-evidence 映射）
- [x] 3.2 确认 `.pi/capabilities.yaml` 无需更新（`planner-toggle` 已在 `global.extensions` 中，本次为内部改造）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成 writeback.md
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（无外部回写目标；本地文件已实现，verification.md 已生成，writeback.md 已记录审计轨迹）
