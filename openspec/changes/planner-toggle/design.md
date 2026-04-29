# Design

## Context

本 change 为 pi-config 仓库新增一个 Pi 扩展 `planner-toggle.ts`，实现在只读规划模式与正常模式之间的一键切换。设计参考 pi-mono 官方示例 `plan-mode/index.ts` 的模式切换架构，但简化了步骤追踪和 persona 系统，专注于模式切换、模型切换与工具限制三项核心行为。

技术基础：Pi ExtensionAPI（`shortcut`, `command`, `tool_call`, `before_agent_start`, `context`, `session_start` events），单文件扩展，无额外 npm 依赖。

## Goals / Non-Goals

**Goals:**
- `Ctrl+Alt+P` 快捷键和 `/planner` 命令双入口切换 planner 模式
- Planner 模式自动切换到 `deepseek/deepseek-v4-pro` 模型
- Planner 模式限制工具为只读（block write/edit，bash 白名单）
- 退出时恢复进入前的模型
- 状态栏指示 + toast 通知
- Session 持久化：resume 时恢复 planner 状态

**Non-Goals:**
- CLI flag（`--planner`）
- 规划步骤提取、DONE 标记、进度追踪
- 复杂 persona 系统提示词
- 多模型可配置（planner 模型固定）

## Decisions

### D1: 文件组织 — 单文件 `.pi/extensions/planner-toggle.ts`

**理由:** 无额外 npm 依赖，仅使用 `@mariozechner/pi-coding-agent`、`@mariozechner/pi-tui`、`@mariozechner/pi-ai` 等 Pi 内置类型。单文件符合 pi-vs-cc 生态中多数简单扩展的模式。

### D2: Toggle 状态管理 — 闭包变量 + appendEntry 持久化

**理由:** 使用模块级闭包变量 `let plannerEnabled = false` + `let previousModelKey: string | null = null` 管理运行时状态。模式切换时通过 `pi.appendEntry("planner-toggle-state", { enabled, previousModelKey })` 持久化，`session_start` 时从 `ctx.sessionManager.getEntries()` 恢复。

**模型标识策略:** 使用 `model.key`（provider + model ID 的组合键）作为 restore 标识，而非 Model 对象引用（对象引用在 session 恢复后无效）。

### D3: 键盘快捷键 — `Key.ctrlAlt("p")`

**理由:** pi-vs-cc 的 `plan-mode` 示例使用 `Key.ctrlAlt("p")`，本扩展与其功能领域相关但互不共存（同一项目只需其一）。选择 `Ctrl+Alt+P` 而非 `Shift+Space`，因为：
- `Shift+Space` 在多数终端不可区分（与普通 Space 同字节序列）
- `Ctrl+Alt+P` 是可靠的三键组合，未被 pi-config 现有扩展占用

### D4: Bash 白名单 — 内联 isSafeCommand 逻辑

**理由:** 参考 `plan-mode/utils.ts` 的 `isSafeCommand` 函数，将其逻辑内联到 `planner-toggle.ts` 中。白名单命令包括：
- 文件浏览: `ls`, `cat`, `head`, `tail`, `less`, `file`, `stat`, `wc`, `du`, `tree`
- 搜索: `grep`, `find`, `rg`, `ag`, `locate`
- Git 只读: `git log`, `git diff`, `git status`, `git show`, `git branch`, `git tag`, `git blame`, `git stash list`
- 系统信息: `which`, `type`, `command -v`, `echo`, `pwd`, `env`, `printenv`, `uname`, `whoami`, `date`, `ps`, `df`, `free`/`vm_stat`, `top -l`
- 包管理查询: `npm list`, `npm view`, `pip list`, `pip show`, `brew list`, `brew info`
- 网络: `curl` (无 `-o`/`-O`/`>` 输出重定向), `wget`（同限制）

阻止策略：检查命令是否符合白名单正则，不符合则 `return { block: true, reason: "..." }`。

### D5: 工具集定义

| 模式 | Tool Set |
|------|----------|
| Default | `["read", "bash", "edit", "write"]` |
| Planner | `["read", "bash", "grep", "find", "ls"]` |

**理由:** Planner 工具集与 plan-mode 示例一致（去掉 `questionnaire` 因为本项目未安装该工具）。Default 工具集为 Pi 默认的四个核心工具。

### D6: System Instruction — 最小化注入

**理由:** 使用 `before_agent_start` 注入 `customType: "planner-mode-context"`、`display: false` 的消息，内容简洁描述只读限制和可用工具。不引入复杂 persona。退出时通过 `context` 事件过滤该类消息。

### D7: 模型切换容错

**理由:** 如果 `ctx.modelRegistry.find("deepseek", "deepseek-v4-pro")` 返回 `null`，通过 `ctx.ui.notify("error")` 通知用户并阻止切换。不 crash，不静默失败。

## Risks / Migration

| 风险 | 影响 | 缓解 |
|------|------|------|
| `deepseek/deepseek-v4-pro` 在 modelRegistry 中不存在 | 无法进入 planner 模式 | 提前验证；方案中已实现容错逻辑 |
| `Ctrl+Alt+P` 与未来扩展或系统快捷键冲突 | 快捷键失效 | 同时提供 `/planner` 命令作为备用入口 |
| Bash 白名单漏掉安全命令 | Planner 模式误杀合法操作 | 初始白名单覆盖常见命令；后续可扩展 |
| Session 恢复时模型 restore 失败（原模型已不可用） | 退出 planner 后模型不正确 | 不 crash；用户可手动 `/model` 切换 |
| 单文件扩展无 npm 依赖 | 无风险 | — |
