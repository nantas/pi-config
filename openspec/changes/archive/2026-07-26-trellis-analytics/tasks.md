# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认四个 capability spec 的实现范围与边界（参考 binding.md 中 neonspark 仓库路径）
- [x] 1.2 确认依赖前置条件：neonspark 仓库存在 `.pi/extensions/` 目录（无需 npm 依赖）
- [x] 1.3 确认 `trellis-load-phase-context` 在 neonspark 中的实际输出格式与设计预期一致

## 2. 核心实现任务

### 2.1 Extension 骨架与事件挂钩

- [x] 2.1.1 创建 `trellis-analytics.ts` 单文件扩展结构
  - 实现 default export 函数
  - 添加 `globalThis` 自去重标记 + `session_shutdown` 清理处理器
  - 引用：design.md D1（Event-Based Architecture）
- [x] 2.1.2 订阅 `tool_call` 事件，区分 read/bash 工具调用
  - 覆盖 specs/workflow-observability 的 skill-load-tracking
  - 覆盖 specs/context-consumption-tracking 的 detect-phase-context-injection
- [x] 2.1.3 订阅 `tool_result` 事件，通过 toolCallId 匹配 pending 命令
  - 覆盖 design.md D3（ToolCallId-Based Command Matching）
- [x] 2.1.4 验证方式：`pi -e` 加载扩展，确认无启动错误

### 2.2 Skill 加载追踪（workflow-observability）

- [x] 2.2.1 实现 `tool_call(read)` 中对 `**/SKILL.md` 路径的匹配
  - 提取 skill 名称（从路径推断 namespace）
  - 记录 `skill_load` 事件（含 skill、path、ts、session、turn）
- [x] 2.2.2 实现全 namespace 追踪，不设 whitelist
  - 覆盖 specs/workflow-observability 的 workflow-detection-no-whitelist
- [x] 2.2.3 实现 skill 来源标注（phase_context_invoke / user_prompt / autonomous）
  - 覆盖 specs/workflow-observability 的 source-annotation
- [x] 2.2.4 验证方式：手动触发 agent 加载 trellis-start 和 gitnexus-debugging，检查 JSONL 记录

### 2.3 上下文注入解析（context-consumption-tracking）

- [x] 2.3.1 在 `tool_call(bash)` 中匹配 `trellis-load-phase-context --phase <phase>` 命令
  - 缓存 toolCallId → { command, phase } 到 pendingCommands Map
  - 覆盖 specs/context-consumption-tracking 的 detect-phase-context-injection
- [x] 2.3.2 在 `tool_result` 中通过 toolCallId 匹配，解析输出内容
  - 用正则提取 `=== filepath ===` 头部 → injected_files 列表
  - 用正则提取 `[trellis-mode:xxx]` 分组 → mode 分类映射
  - 提取 `[trellis-bound-change]` 行 → change_id / schema / path / next_stage / bridge_workflow
  - 覆盖 specs/context-consumption-tracking 的 parse-context-injection-output
- [x] 2.3.3 提取 invoke_targets（`[trellis-mode:invoke]` 分组中的 skill 路径）
  - 从内联内容中使用正则提取 `.md` / `.yaml` / `.json` 文件引用
  - 从内联内容中匹配已知 skill 名称
  - 过滤掉已作为 injected_files 的文件（避免重复）
  - 覆盖 specs/context-consumption-tracking 的 extract-invoke-targets / extract-file-references-from-inline-content
- [x] 2.3.4 不存储内联文件全文（只存文件列表和 metadata）
  - 验证方式：JSONL 记录中不应出现大段文件内容

### 2.4 跨引用分析

- [x] 2.4.1 在收到 `skill_load` 事件时检查是否匹配已知 invoke_targets
  - 若匹配，记录 `invoke_resolved` 事件 { skill, loaded: true }
  - 覆盖 specs/context-consumption-tracking 的 cross-reference-invoke-resolution
- [x] 2.4.2 在收到 `tool_call(read)` 时检查是否匹配提取的引用
  - 若匹配，记录 `reference_followed` 事件 { ref, type, read: true }
  - 覆盖 specs/context-consumption-tracking 的 track-reference-consumption

### 2.5 流式持久化（streaming-persistence）

- [x] 2.5.1 实现 init 时检测 `.trellis/.current-task` 并打开/创建 JSONL 文件
  - 区分 task 模式（`.trellis/.analytics/tasks/<slug>/events.jsonl`）
  - 和 orphan 模式（`.trellis/.analytics/orphans/<session-id>.jsonl`）
  - 覆盖 specs/streaming-persistence 的 session-continuation / task-based-directory-structure
- [x] 2.5.2 实现流式写入：每次事件触发时即时追加一条 JSON 行
  - 每条记录符合 `{ ts, session, turn, event, data }` schema
  - 写入后调用 fsync() 确保崩溃不丢
  - 覆盖 specs/streaming-persistence 的 streaming-jsonl-write / crash-recovery
- [x] 2.5.3 实现 session_shutdown 时关闭文件描述符
  - 验证方式：写入多条记录后强制退出，重新打开 JSONL 验证最后一条记录完整
- [x] 2.5.4 不实现文件轮转或大小限制（v1 不处理）

### 2.6 分析工具（analysis-tool）

- [x] 2.6.1 注册 `trellis_analytics` Pi tool
  - 使用 TypeBox schema 定义参数：`action` (string, required) + `task_slug` / `session_id` (string, optional)
  - 覆盖 specs/analysis-tool 的 register-pi-tool
- [x] 2.6.2 实现 `summary` action：扫描 JSONL 文件，聚合统计
  - session/event 计数、workflow 分布、top skill 加载
- [x] 2.6.3 实现 `context-consumption` action：读取 task 的 events.jsonl
  - 计算 invoke 响应率（resolved / total）
  - 展示引用消费状态
  - 覆盖 specs/analysis-tool 的 context-consumption-action
- [x] 2.6.4 实现 `timeline` action：返回按时间排序的事件流
  - 支持 `session_id` 和 `task_slug` 筛选
  - 支持 limit 参数截断
- [x] 2.6.5 实现 `list-sessions` action：列出所有可查询的 session
- [x] 2.6.6 验证方式：在 extension 加载后通过 agent 调用 tool，确认返回格式正确

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点：
  - 每个 skill_load 记录的 schema 完整性
  - `tool_result` 输出解析的正确性（边界：无 `=== filepath ===` 时、无 mode header 时）
  - invoke 响应的跨引用匹配（正例：skill 被加载；反例：skill 未被加载）
  - JSONL 流式写入的原子性（进程崩溃时最后一条记录不丢失）
  - `trellis_analytics` tool 各 action 的返回格式
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更：
  - capabilities.yaml 的 catalog.extensions 条目
