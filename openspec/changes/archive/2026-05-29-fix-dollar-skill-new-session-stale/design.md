# Design

## Context

`dollar-skill-invoke` 的 `context` handler 通过闭包捕获的 `pi` 对象（`ExtensionAPI`）调用 `pi.getCommands()`。该 API 内部执行 `runtime.assertActive()`，检查共享 `ExtensionRuntime` 的 stale 状态。

Pi 核心的 session 替换流程（`/new`、`/fork`、`/switchSession`）在旧 session dispose 时调用 `runtime.invalidate()` 设置 stale 标记，但新 session 创建时复用同一 runtime 对象且**不清除 stale 状态**。这是 Pi 核心的 bug（`ExtensionRuntime.state.staleMessage` 用 `??=` 设置后永不清除）。

当前 `getSkillsFromCommands(pi)` 直接链式调用 `pi.getCommands().filter().map()`，无 try-catch。一旦 `getCommands()` 抛异常，整个 `getSkills()` → `handleContextInjection()` → `emitContext handler` 调用链失败，异常被 `emitContext` 的 catch 块吞掉。

## Goals / Non-Goals

**Goals:**
- `getSkills()` 在 `pi.getCommands()` 抛异常时降级到 `_fileSystemSkillIndex`
- `handleContextInjection` 不因 stale runtime 而整体失败
- 保持现有三层回退架构（getCommands → 缓存索引 → 即时扫描）不变

**Non-Goals:**
- 修复 Pi 核心的 `runtime.state.staleMessage` 清除问题（上游 bug，需 PR 到 pi-mono）
- 增加用户可见的错误提示（stale 降级是预期行为，无需提示）
- 改变 skill 查找或注入的核心逻辑

## Decisions

### 1. try-catch 在 `getSkills()` 层而非 `handleContextInjection` 层

**选择**: 在 `getSkills()` 函数内部 try-catch `getSkillsFromCommands(pi)` 调用
**替代方案**: 在 `handleContextInjection` 外层 try-catch 整个逻辑

理由：`handleContextInjection` 中除了 `getSkills(pi)` 外，regex 匹配、文件读取、消息构造等步骤不依赖 `pi`。将防御限定在 `getSkills()` 层面，保持错误范围最小化，其他逻辑不受影响。

### 2. 静默降级而非抛错

**选择**: catch 后不重新抛出，返回 `_fileSystemSkillIndex` 或空数组
**替代方案**: catch 后 log warning 或 emitError

理由：stale runtime 是 Pi 核心的已知行为特征，不是用户错误。`_fileSystemSkillIndex` 在 `session_start` 中已重建，是等效的 skill 数据源。静默降级避免向用户展示误导性错误消息。

### 3. 不区分异常类型

**选择**: catch 所有异常，不检查是否为 stale 错误
**替代方案**: 只 catch stale 相关异常（检查 message 内容）

理由：检查异常 message 字符串是脆弱的（依赖 Pi 内部错误文本）。`pi.getCommands()` 的任何失败都应该降级到 filesystem fallback，这符合已有的三层回退设计哲学。

## Risks / Migration

**风险**: try-catch 可能掩盖 `pi.getCommands()` 的其他非 stale 异常
**缓解**: filesystem index 是等效数据源（在 `session_start` 中重建），降级后功能不丢失。如果 filesystem index 也为空，`getSkills()` 返回空数组，skill 注入优雅跳过——这是与当前"完全失败"相比更好的行为。

**迁移**: 无需迁移。修改仅限 `getSkills()` 函数内部，不影响其他代码路径。
