## ADDED Requirements

### Requirement: Analytics 数据按 session 标识持久化

系统 SHALL 根据 Pi session 的唯一标识（`path.basename(sessionFile, ".jsonl")`）定位对应的 analytics JSONL 文件。
系统 SHALL 以 append-only 模式写入 analytics 数据。
系统 SHALL 不依赖 Pi lifecycle 事件（`session_start`, `session_shutdown`）来保证数据完整性。

#### Scenario: 首次 session 创建 analytics 文件
- **WHEN** trellis-analytics extension 首次在某个 Pi session 中加载
- **THEN** 系统在 `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl` 创建新文件
- **THEN** 文件以 `\n` 分隔的 JSON lines 格式记录事件

#### Scenario: 跨进程 resume 定位已有文件
- **WHEN** Pi 进程重启后 resume 之前的 session
- **THEN** 系统通过 session 标识定位到已存在的 analytics 文件
- **THEN** 新事件 append 到该文件末尾

### Requirement: Analytics 数据写入可靠性

系统 SHALL 每次写入执行完整序列：open → write → fsync → close。
系统 SHALL 在写入失败时不阻塞后续操作（catch 并 console.error）。

#### Scenario: 写入后进程崩溃
- **WHEN** 数据写入后立即发生进程崩溃
- **THEN** fsync 保证数据已落盘
- **THEN** 重启后 analytics 文件包含崩溃前的最后一条记录

#### Scenario: 写入异常
- **WHEN** 文件系统返回写入错误
- **THEN** 系统捕获异常并输出错误日志
- **THEN** 后续事件仍继续尝试写入

### Requirement: 事件类型记录

系统 SHALL 记录以下事件类型：
- `skill_load`: agent 读取 SKILL.md 文件
- `context_injection_parsed`: Trellis phase context 注入解析结果
- `reference_followed`: agent 读取 phase context 中引用的文件
- `tool_read`: agent 执行 read 工具调用（可选保留）

系统 SHALL 不移除已有 analytics 文件中的历史数据。

#### Scenario: skill_load 事件
- **WHEN** agent 执行 `read` 工具调用且路径包含 `SKILL.md`
- **THEN** 系统记录 `skill_load` 事件，包含 skill 名称、名称空间、路径

#### Scenario: context_injection_parsed 事件
- **WHEN** agent 执行 `bash` 工具调用且命令包含 `trellis-load-phase-context --phase`
- **THEN** 系统记录 `context_injection_begin` 信息（通过 toolResult 解析）
- **THEN** 系统记录 `context_injection_parsed` 事件，包含 phase、injectedFiles、modeMap、invokeTargets、boundChange、referenceCount

#### Scenario: reference_followed 事件
- **WHEN** phase context 注入后提取了 references 集合
- **THEN** 后续 `read` 工具调用匹配 references 中的文件路径时，记录 `reference_followed` 事件

### Requirement: 数据存储结构

系统 SHALL 按日期子目录组织 analytics 文件。
系统 SHALL 不再区分 task/orphan 分流。

#### Scenario: 目录结构
- **WHEN** 系统写入 analytics 事件
- **THEN** 文件存储在 `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl`

### Requirement: 查询工具

系统 SHALL 提供 `trellis_analytics` 工具，支持以下操作：
- `summary`: 全局汇总或按 session/task 过滤
- `timeline`: 按时间线列出事件
- `list-sessions`: 列出所有被追踪的 session

#### Scenario: 查询汇总
- **WHEN** 用户调用 `trellis_analytics` 工具
- **THEN** 系统读取指定 analytics 文件并返回结构化汇总
