## Why

trellis-analytics extension 的设计依赖了 Pi session lifecycle 事件（`session_start`、`session_shutdown`），导致：
- 进程重启或 resume 后数据中断——事件没有被记录到已有的 analytics 文件
- 跨 turn 状态机（invoke 超时、reference 追踪）在进程重启时全部丢失，产生不一致的分析指标
- 每个 session 存在 task/orphan 分流，导致同个 session 的数据可能散落在两个位置

核心问题是设计原则偏差：扩展应该以 **session 标识**为锚点，随时记录随时写入，而不应该依赖 lifecycle 事件来保证数据完整性。

需要将扩展简化为 stateless append-only 的写入器，移除所有 lifecycle 依赖和跨 turn 状态。

## What Changes

- **移除** `session_start` 事件写入（保留 session 定位能力）
- **移除** `session_shutdown` 处理（不再依赖此事件，fd 改用 open-close per write）
- **移除** `turn_end` handler 和跨 turn invoke 超时追踪（`invoke_resolved` 事件）
- **移除** task/orphan 分流，统一按日期子目录存放
- **简化** `source` 字段启发式分类（移除 `user_prompt`/`phase_context_invoke` 区分）
- **简化** writer：改为 stateless `write()` 每次自包含 open → write → fsync → close
- **保留并简化** `reference_followed` 追踪（移除 `matchReference` 模糊匹配，用精确匹配）
- **重写** `trellis_analytics` 查询工具，对齐新的事件类型和目录结构
- 预计从 1023 行减少到 ~750-800 行

## Capabilities

### New Capabilities

<!-- 本次变更是内部扩展重构，不引入新的用户可见能力 -->

### Modified Capabilities

<!-- 无 spec 级行为变更 —— analytics extension 是内部基础设施，对外 interface
     只有 trellis_analytics 工具的 action 参数集，这些在查询工具重写时对齐 -->

## Impact

- **受影响的文件**: `.pi/extensions/trellis-analytics.ts`（主变更文件）
- **配套文件**: `.pi/prompts/trellis-analytics.md`（分析框架可能需要更新事件类型说明）
- **数据格式**: analytics JSONL 的事件类型集合变更（移除 4 种，保留 3+1 种）
- **存储路径**: `.trellis/.analytics/` 下 task/orphan 合并为统一日期子目录
- **不涉及**: 其他系统的 API 或数据依赖
