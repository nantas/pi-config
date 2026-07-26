## 1. Writer 重构：stateless append-only

- [x] 1.1 移除 `JsonlWriter` 类的 `fd`、`filePath`、`taskSlug`、`sessionId`、`turnCounter` 字段
- [x] 1.2 实现新的纯函数 `write(sessionId, eventType, data)`：每次调用独立执行 open → write(JSONL line) → fsync → close
- [x] 1.3 实现目录解析函数 `resolveAnalyticsPath(sessionId)`：返回 `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl`
- [x] 1.4 移除 `JsonlWriter.getTaskSlug()`、`getSessionId()`、`getTurn()`、`close()`

## 2. 移除 lifecycle 事件绑定

- [x] 2.1 移除 `pi.on("session_start", ...)` handler：不再写入 `session_start` event
- [x] 2.2 移除 `pi.on("turn_end", ...)` handler：不再追踪 invoke 超时
- [x] 2.3 移除 `pi.on("session_shutdown", ...)` handler：不再写入 `session_shutdown` event，不再 close fd
- [x] 2.4 移除 `INVOKE_TIMEOUT_TURNS` 常量和 `TrackedInvoke` 接口
- [x] 2.5 移除 `knownInvokeTargets` Map 及其引用

## 3. 删除冗余事件类型

- [x] 3.1 删除 `context_injection_begin` 事件写入（context_injection 的 tool_call handler 中不再预写 begin）
- [x] 3.2 删除 `context_injection_references` 事件写入（references 数据合并到 parsed 中）
- [x] 3.3 删除 `invoke_resolved` 事件的所有写入

## 4. 简化 skill_load 记录

- [x] 4.1 为 `loadedSkills` Set 添加去重检查：只在首次加载时写入 `skill_load` 事件
- [x] 4.2 简化 `source` 字段：移除 `user_prompt` 和 `phase_context_invoke` 启发式分类
- [x] 4.3 移除 `knownInvokeTargets` 的 source 判断依赖

## 5. 简化 reference_followed 追踪

- [x] 5.1 移除 `matchReference()` 函数（模糊匹配逻辑）
- [x] 5.2 改为精确路径后缀匹配：`filePath.endsWith(ref) && filePath[filePath.length - ref.length - 1] === '/'`
- [x] 5.3 保留 `knownReferences` Map，保持跨事件的状态追踪（从 tool_result 收集引用，在 tool_call 中匹配 read）
- [x] 5.4 保留 `extractReferences()` 函数（context injection 解析需要）

## 6. 存储目录迁移

- [x] 6.1 移除 `JsonlWriter.init()` 中的 `.current-task` 检测和 task/orphan 分流逻辑
- [x] 6.2 实现统一的日期子目录路径：`<cwd>/.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl`
- [x] 6.3 确保 `fs.mkdirSync()` 在写入前创建目录

## 7. 查询工具重构

- [x] 7.1 更新 `findAllJsonlFiles()`：改为扫描 `<YYYY-MM>/<sessionId>.jsonl` 格式，同时兼容旧 orphans/tasks 目录
- [x] 7.2 更新 `handleSummary()`：移除 invoke 指标，适配新事件类型集
- [x] 7.3 更新 `handleTimeline()`：适配新事件类型集
- [x] 7.4 移除 `handleTaskDetail()`（task 分流已移除）
- [x] 7.5 更新 `handleContextConsumption()`：移除 invoke resolution 指标
- [x] 7.6 保留 `handleListSessions()`

## 8. 验证

- [x] 8.1 确认无 TypeScript 编译错误
- [ ] 8.2 启动 Pi session，验证 analytics 文件创建在正确目录
- [ ] 8.3 验证 skill_load 事件写入格式正确
- [ ] 8.4 验证 context_injection_parsed 事件完整
- [ ] 8.5 验证进程重启后 resume 时能定位到同个 analytics 文件
- [ ] 8.6 验证 `trellis_analytics` 查询工具能正常扫描新旧两种目录结构
