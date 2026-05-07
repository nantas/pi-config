# Tasks

## 1. 实现准备

- [x] 1.1 确认每个 capability 的实现范围 — `extension-dedup-mechanism`，涉及 7 个扩展文件，模式统一
- [x] 1.2 确认每个扩展的去重 key 名称

## 2. 核心实现任务

### 2.1 修改 dollar-skill-invoke.ts

- [x] 2.1.1 将 `globalThis.__pi_ext_dollar_skill_invoke_loaded` 布尔旗标改为会话计数器模式
- [x] 2.1.2 `session_shutdown` handler 从 `delete` 旗标改为 `increment` 计数器
- [x] 2.1.3 验证：`$skill-name` 自动补全在 `/new` 后可用

### 2.2 修改 init-command.ts

- [x] 2.2.1 将 `globalThis.__pi_ext_init_command_loaded` 改为会话计数器模式
- [x] 2.2.2 `session_shutdown` handler 改为 increment 计数器
- [x] 2.2.3 验证：`/init` 命令在 `/new` 后可用

### 2.3 修改 browse-session-tree.ts

- [x] 2.3.1 将 `globalThis.__pi_ext_browse_session_tree_loaded` 改为会话计数器模式
- [x] 2.3.2 `session_shutdown` handler 改为 increment 计数器
- [x] 2.3.3 验证：`/browse` 命令在 `/new` 后可用

### 2.4 修改 output-scroll-viewer.ts

- [x] 2.4.1 确认该扩展的去重 flag 名称
- [x] 2.4.2 改为会话计数器模式

### 2.5 修改 planner-toggle.ts

- [x] 2.5.1 确认该扩展的去重 flag 名称
- [x] 2.5.2 改为会话计数器模式

### 2.6 修改 tool-counter-widget.ts

- [x] 2.6.1 确认该扩展的去重 flag 名称
- [x] 2.6.2 改为会话计数器模式

### 2.7 修改 subagent-dispatch（目录扩展）

- [x] 2.7.1 确认 subagent-dispatch/ 目录下所有扩展文件的去重 flag 名称
- [x] 2.7.2 改为会话计数器模式

### 2.8 全局同步

- [x] 2.8.1 运行 `scripts/sync-pi-agent.sh` 将修改同步到 `~/.pi/agent/extensions/`
- [x] 2.8.2 验证全局副本也使用新模式（读取确认）

## 3. 验证准备

- [x] 3.1 验证 `specs/extension-dedup-mechanism/spec.md` 中所有 Requirement 的通过状态：
  - cross-path-dedup: 项目副本注册、全局副本跳过
  - cross-session-isolation: `/new` 后所有扩展正确注册
  - `/reload`-compatibility: `/reload` 后扩展重注册
  - no-regression-on-double-path: 无工具/命令冲突警告

## 4. 收敛

- [x] 4.1 基于验证结果更新 verification.md
- [x] 4.2 基于 verification.md 更新 writeback.md
- [x] 4.3 执行 writeback 回写
