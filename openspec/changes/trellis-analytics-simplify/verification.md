## Verification Goals

- 确认扩展不再依赖 Pi lifecycle 事件（`session_start`, `session_shutdown`, `turn_end`）
- 确认 writer 使用自包含 open-write-fsync-close 模式，无悬空 fd 状态
- 确认 analytics 数据写入到 `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl`
- 确认跨进程 resume 场景下能定位到已有 analytics 文件并继续 append
- 确认移除事件类型后不影响已有 analytics 文件的读取
- 确认 `trellis_analytics` 查询工具能正确扫描新目录结构

## Trellis Policy Mapping

- Workflow/profile: `trellis-analytics` (internal infrastructure)
- Verification policy: 手动验证 + 代码审查
- Why this mapping fits the change: 本次变更不涉及运行时行为变更（不改变 agent 与用户交互方式），而是数据记录基础设施的简化重构。验证主要通过代码审查和手动测试确认写入机制正确。

## Automated Verification

- [ ] TypeScript 编译检查:
  - Scope: `trellis-analytics.ts`
  - Expected result: 无编译错误

## Manual Verification

- [ ] 启动 Pi session，确认 analytics 文件创建在正确目录:
  - 预期: `.trellis/.analytics/<YYYY-MM>/<sessionId>.jsonl` 被创建
- [ ] 写入 skill_load 事件:
  - 预期: 文件包含格式正确的 JSONL 行，timestamp 正确
- [ ] 写入 context_injection_parsed 事件:
  - 预期: 包含 phase, injectedFiles, modeMap, invokeTargets, boundChange, referenceCount
- [ ] 进程重启后 resume session:
  - 预期: 新扩展加载后定位到已有 analytics 文件，新事件 append 到末尾，无数据覆盖
- [ ] 写入期间模拟进程崩溃:
  - 预期: 最后一条 fsync 的数据在重启后可见
- [ ] 查询工具 session list:
  - 预期: `trellis_analytics` 列出新目录结构下的所有 session 文件
- [ ] 查询工具 timeline:
  - 预期: 按时间线正确列出事件

## Expected Evidence

- 代码审查: 所有 lifecycle 事件绑定已移除
- Writer 实现: 使用 open-write-fsync-close 模式，无 fd 字段
- 查询工具输出: 正确读取新旧两种目录结构的数据
- 当前测试用的 analytics 文件保留不变（不迁移历史数据）

## Execution Summary

- Status: *待实施后填写*
- Commands run:
- Evidence collected:
- Follow-up needed:
