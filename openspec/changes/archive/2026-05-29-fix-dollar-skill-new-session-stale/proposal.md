# Proposal

## 问题定义

`dollar-skill-invoke` extension 在 `/new`（新建 session）后出现 skill 注入失败：用户使用 `$skill-name` 语法发送消息时，extension 未将对应 skill 内容展开注入到 LLM 上下文中。

### 根因分析

Pi 核心的 `ExtensionRuntime` 是跨 session 共享的单例对象。`/new` 时旧 session 的 `dispose()` 调用 `runner.invalidate()` → `runtime.invalidate()`，将 `runtime.state.staleMessage` 设为 stale 状态。新 session 创建时 `ExtensionRuntime` 被复用（`/new` 不触发 `resourceLoader.reload()`），但 **`state.staleMessage` 从未被清除**。

`dollar-skill-invoke` 的 `context` handler 通过闭包捕获的 `pi` 对象调用 `pi.getCommands()`，该方法内部执行 `runtime.assertActive()`，检查到 stale 状态后抛出异常。异常被 `emitContext` 的 catch 块捕获并 emitError，handler 返回 undefined，skill 不被注入。

### 已验证链路

- Extension 加载 ✅（handlers 注册在 extension 对象上，不随 session 变化）
- Handler 被调用 ✅（新 `ExtensionRunner` 遍历同一 extensions 数组）
- `pi.getCommands()` 抛异常 ❌（runtime stale 未清除）
- filesystem fallback 没有机会生效 ❌（异常在 `getSkills()` 层就抛出，整个 `handleContextInjection` 失败）
- `/reload` 不受影响 ✅（`resourceLoader.reload()` 创建全新 runtime，stale 状态被重置）

## 范围边界

### In Scope

- `dollar-skill-invoke` extension 的 `getSkills()` 增加 try-catch，`pi.getCommands()` 失败时降级到 `_fileSystemSkillIndex`
- `handleContextInjection` 增加防御：即使 `getSkills()` 返回空，也能在 `_fileSystemSkillIndex` 上继续工作

### Out of Scope

- Pi 核心的 `runtime.state.staleMessage` 清除逻辑（属于上游 bug，需要 PR 到 pi-mono）
- 其他 extension 的类似 stale 问题
- Skill 内容格式或解析逻辑变更
- Autocomplete 相关逻辑

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `dollar-skill-invoke`: 增加 `getSkills()` 的 stale runtime 防御——`pi.getCommands()` 抛异常时降级到 `_fileSystemSkillIndex`，确保 `/new` 后 skill 注入不中断

## Capabilities 待确认项

- [x] 能力清单已与用户确认——仅修改现有 dollar-skill-invoke 能力

## Impact

- **正向**：消除 `/new` 后 `$skill-name` 注入失败的回归问题
- **风险**：try-catch 可能掩盖其他 `getCommands()` 异常——通过仅在 catch 块中处理 stale 错误来缓解
- **回退**：删除 try-catch 即可恢复原始行为
- **全局部署**：修改后需通过 `scripts/sync-pi-agent.sh` 同步至 `~/.pi/agent/extensions/`

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - spec_standard_ref: `openspec/specs/dollar-skill-invoke/spec.md`
  - writeback_targets: `repo://pi-config:.pi/extensions/dollar-skill-invoke.ts`
