# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `init-command` capability 的所有 spec requirements 的实现范围与边界
  - 覆盖：command-registration, command-accepts-arguments, repository-analysis, agents-md-creation, existing-agents-handling, dedup-and-session-shutdown
- [x] 1.2 确认前置条件：Pi 已安装，`@mariozechner/pi-coding-agent` 和 `typebox` 可用，scripts/sync-pi-agent.sh 可执行

## 2. 核心实现任务

- [x] 2.1 创建扩展文件 `.pi/extensions/init-command.ts`，包含：
  - `globalThis` 自去重 marker + `session_shutdown` 清除 handler
  - `pi.registerCommand("init", ...)` 注册斜杠命令
  - 命令 handler 通过 `pi.sendUserMessage()` 注入 prompt 给 LLM
- [x] 2.2 实现 prompt 模板（内嵌在扩展中），包含以下六段指令：
  - **Goal**: Create or update AGENTS.md
  - **User focus**: 从 `$ARGUMENTS` 获取用户焦点
  - **Investigation strategy**: README → 构建/测试配置 → CI → 已有指令文件 → 代表性代码
  - **Extraction targets**: 命令、测试、monorepo、框架怪癖、约定、测试流程
  - **Question handling**: LLM 自主在对话中提问
  - **Writing rules**: 高信号、可验证、短段落；已有 AGENTS.md 处理逻辑
- [x] 2.3 实现已有 AGENTS.md 的结构分析逻辑：
  - LLM 使用 `read` 工具读取已有 AGENTS.md
  - 判断其格式是否与预期模板结构类似
  - 结构类似 → 询问用户是否就地更新
  - 结构完全不同 → 警告用户将完全重写，确认后才继续
- [x] 2.4 实现 `$ARGUMENTS` 占位符注入和参数传递逻辑
- [x] 2.5 验证通过 `pi -e .pi/extensions/init-command.ts` 无启动错误
- [x] 2.6 验证 `/reload` 后扩展正常加载且命令可用

**完成标准**: `pi -e .pi/extensions/init-command.ts` 启动后运行 `/init` 能触发预期的分析 prompt 给 LLM。

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 证据：启动日志、命令注册验证、prompt 注入验证、dedup 测试、session_shutdown 测试
- [x] 3.2 标记 writeback 摘要：
  - `.pi/capabilities.yaml` 需追加 `init-command` 到 `global.extensions`
  - `scripts/sync-pi-agent.sh` 需成功执行

## 4. 验证与回写收敛

- [x] 4.1 基于实现结果生成 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成 `writeback.md`
  - 目标：`.pi/capabilities.yaml` 的 `global.extensions` 追加
  - 字段映射：`init-command` 追加到列表末尾
- [x] 4.3 执行回写：更新 `.pi/capabilities.yaml`，运行 `scripts/sync-pi-agent.sh`
