# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 capability spec 覆盖范围：extension 的 `globalThis` dedup 模式必须搭配 `session_shutdown` 清理
- [x] 1.2 确认依赖前置：pi-mono 无变更，仅修改 pi-config 仓库内文件

## 2. 核心实现任务

- [x] 2.1 更新 `dollar-skill-invoke` extension → 在 `export default function` 中添加 3 行 `session_shutdown` handler，清除 `__pi_ext_dollar_skill_invoke_loaded` 标志位
  - 文件: `.pi/extensions/dollar-skill-invoke.ts`
  - 验证: 启动 pi → `/new` → 测试 `$` autocomplete 正常工作
- [x] 2.2 更新 `planner-toggle` extension → 在 `export default function` 中添加 3 行 `session_shutdown` handler，清除 `__pi_ext_planner_toggle_loaded` 标志位
  - 文件: `.pi/extensions/planner-toggle.ts`
  - 验证: 启动 pi → `/new` → 测试 `Ctrl+Alt+P` planner toggle 正常工作
- [x] 2.3 同步 project-local 副本到 global 副本
  - `cp .pi/extensions/dollar-skill-invoke.ts ~/.pi/agent/extensions/dollar-skill-invoke.ts`
  - `cp .pi/extensions/planner-toggle.ts ~/.pi/agent/extensions/planner-toggle.ts`
- [x] 2.4 创建参考文档 `docs/reference/pi-extension-session-shutdown-dedup.md`
  - 内容: `globalThis` dedup 模式说明、session 替换时为何失效、`session_shutdown` 清理方案、时序图、完整代码示例、边界条件
- [x] 2.5 更新 `pi-extension-dev` skill → 修改 Dedup Requirement 章节
  - 文件: `.pi/skills/pi-extension-dev/SKILL.md`
  - 变更: 在 Dedup Requirement 章节中添加 `session_shutdown` handler 要求 + 完整代码示例
  - 引用: 链接到 `docs/reference/pi-extension-session-shutdown-dedup.md`

## 3. 收敛与验证准备

- [ ] 3.1 验证 extension 修复: 启动 pi → `/new` → 测试 `$` autocomplete 和 planner toggle
- [ ] 3.2 验证 `/reload` 路径: 修改 extension 文件 → `/reload` → 确认新代码生效
- [ ] 3.3 验证 spec 覆盖: 确认 verification.md 覆盖所有 spec requirements

## 4. 验证与回写收敛

- [ ] 4.1 基于验证结果生成 verification.md
- [ ] 4.2 生成 writeback.md 并执行回写
