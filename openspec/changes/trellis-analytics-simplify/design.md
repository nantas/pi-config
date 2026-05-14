## Context

当前 `trellis-analytics.ts` (1023 行) 的核心问题是设计原则偏差：依赖 Pi lifecycle 事件来管理写入生命周期和跨 turn 状态追踪。

```
现状:
  session_start → init writer, 写 session_start event
  tool_call     → 更新 turn 计数, 检测 SKILL read / phase context
  tool_result   → 解析 phase context, 提取 references 和 invoke targets
  turn_end      → 检查 invoke 超时 (10 turn)
  session_shutdown → 写 shutdown event, close fd
```

跨 turn 状态机（`knownInvokeTargets`, `knownReferences`）在进程重启时全部丢失。
fd 依赖 `session_shutdown` 来 close，但进程被杀时不会触发。
task/orphan 分流在 session 中间创建 task 时失效。

目标：简化为 stateless append-only 写入器。

## Goals / Non-Goals

**Goals:**
- 移除所有 lifecycle 事件依赖（`session_start`, `session_shutdown`, `turn_end`）
- 移除跨 turn 状态机（invoke 超时追踪、reference 匹配状态机保留简化版）
- writer 改为 stateless：每次写自包含 open→write→fsync→close
- 统一目录结构：按日期子目录存放，取消 task/orphan 分流
- 简化事件类型：从 8 种减到 4-5 种
- 重写查询工具对齐新数据模型
- 从 1023 行 → ~750 行

**Non-Goals:**
- 不改变 `trellis_analytics` 工具的外部 interface（参数校验可兼容扩展）
- 不改变 analytics JSONL 行的 JSON schema 结构（事件类型减少但格式不变）
- 不改变已存在的 analytics 文件
- 不做 backfill 或历史数据迁移

## Decisions

### D1: 写入模式 —— open-write-fsync-close per call

**方案**: 每次 `write()` 调用独立执行完整的文件打开→写入→刷盘→关闭序列。

```typescript
write(sessionId: string, eventType: string, data: object) {
    const filePath = this.resolvePath(sessionId);
    const line = JSON.stringify({ ts: new Date().toISOString(), session: sessionId, event: eventType, data }) + "\n";
    try {
        const fd = fs.openSync(filePath, "a");
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);
        fs.closeSync(fd);
    } catch (err) {
        console.error("[trellis-analytics] write error:", err);
    }
}
```

**替代方案考虑**:
- 惰性打开 + 只在初始化时 open（当前方案）→ 依赖 session_shutdown close，进程被杀时泄露
- 惰性打开 + GC finalizer → Node.js 不支持可靠的 fd finalization
- 缓冲区 + 定时批量写入 → 增加复杂度，session 级别的写入频率不需要

**选择理由**: 每次写入的 open/close 开销对 session 级别的写入频率（几十次/session）可忽略。消除了 fd 状态管理、初始化时机、cleanup 依赖等所有问题。

### D2: session 定位 —— 保持当前机制

**方案**: 保持 `ctx.sessionManager.getSessionFile()` → `path.basename(file, ".jsonl")` 定位 sessionId。

参考分析结论：此机制跨 resume 不变，UUID 稳定。不需要 `session_start` event 来触发——在第一个 `tool_call` handler 中延迟初始化即可。

### D3: 存储目录 —— 按年月分片

**方案**: `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl`

替代方案:
- 当前 task/orphan 分流 → 某 session 数据散布在多处
- 单目录平铺 → 大量文件时查询性能下降

**选择理由**: 日期分片提供天然的范围查询能力（"某月的所有 session"），目录大小可控。`YYYY-MM` 的粒度避免一年内目录数量过多（最多 12 个）。

### D4: 事件类型精简

| 移除 | 保留 + 简化 |
|------|------------|
| `session_start` | `skill_load` (去 source heuristic) |
| `session_shutdown` | `context_injection_parsed` (合并 references) |
| `context_injection_begin` | `reference_followed` (精确路径匹配) |
| `context_injection_references` | |
| `invoke_resolved` | |

### D5: reference_followed 匹配策略

**方案**: 从模糊匹配（`matchReference` 函数的 basename/后缀/路径段包含）改为**精确的路径后缀匹配**。

```typescript
// 新逻辑: ref 是 context 中出现的路径, filePath 是 read 的目标
// 匹配规则: filePath.endsWith(ref) 且前导字符是 "/" 或 ref 就是完整路径
```

保留精确匹配足够覆盖大多数场景（如 ref=`"task.json"` 匹配 read `".../task.json"`），移除 `matchReference` 中容易误匹配的 basename 和路径段包含逻辑。

### D6: 查询工具重构

`summary`, `context-consumption`, `timeline`, `list-sessions`, `task-detail` 中：
- 移除 `task-detail`（不再有 task 分流）
- 简化 `context-consumption`（移除 invoke 指标）
- 保留 `summary`, `timeline`, `list-sessions`
- 更新目录扫描逻辑（改为按日期子目录）

## Risks / Trade-offs

- **[低风险] 每次写入 open/close**: Mac 上单次 open+write+fsync+close ~0.1ms，session 级别写入频率（几十次）的开销可忽略。不在 hot path 上。
- **[低风险] 历史数据格式兼容**: 移除事件类型只影响新写入，不影响已有 analytics 文件。查询工具需兼容两种格式（有/无被移除的事件类型）。
- **[中风险] reference_followed 匹配收紧**: 从模糊改为精确匹配后，某些之前能被匹配的路径不再命中。但这对分析的准确性是改进（减少 false positive），不是退化。
- **[低风险] 目录迁移**: `.trellis/.analytics/orphans/` 和 `.trellis/.analytics/tasks/` 中的历史数据会留在原地。查询工具需同时扫描新旧目录，直到历史数据过期自然淘汰。
