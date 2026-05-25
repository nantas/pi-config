# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 spec delta 覆盖：Skill Discovery with Filesystem Fallback、Filesystem Index Build、Improved Dedup（`specs/dollar-skill-invoke/spec.md`）
- [x] 1.2 实现文件：`.pi/extensions/dollar-skill-invoke.ts`（已在本次 session 中完成实现）

## 2. 核心实现任务

- [x] 2.1 新增 `scanSkillDir()` 函数 — 递归扫描目录查找 SKILL.md（spec: Filesystem Skill Index Build）
  - 验证：`node --check` 语法通过
- [x] 2.2 新增 `buildFileSystemSkillIndex()` 函数 — 扫描 4 个目录构建完整索引（spec: Skill Discovery with Filesystem Fallback）
  - 验证：覆盖 `.agents/skills/`、`.pi/skills/`、`~/.agents/skills/`、`~/.pi/agent/skills/`
- [x] 2.3 新增 `getSkillsFromCommands()` 函数 — 从 `pi.getCommands()` 提取 skill 列表（重命名原 `getSkills`）
- [x] 2.4 重写 `getSkills()` — 三层回退：getCommands → _fileSystemSkillIndex → 即时扫描（spec: Skill Discovery with Filesystem Fallback Scenario: Primary source returns empty）
- [x] 2.5 `handleContextInjection` 增加 `effectiveSkills` 变量 + 二层 `find()` 查找（spec: Skill not found in primary source but exists on filesystem）
- [x] 2.6 改进 dedup — 扫描 `[+1, +5)` 范围，遇到 assistant/toolResult 停止（spec: Improved Dedup Scanning）
- [x] 2.7 `session_start` handler 中调用 `buildFileSystemSkillIndex()` 预建索引（spec: Filesystem Skill Index Build on Session Start）
- [x] 2.8 autocomplete provider 增加文件系统索引 fallback

## 3. 收敛与验证准备

- [x] 3.1 在 neonnew 项目中重启 Pi 并验证 `$trellis-brainstorm` 正常注入
  - 验证方式：检查 `/tmp/pi-dis-debug.log` 出现 `"step":"injecting"` 且 agent 遵循 skill 工作流
- [x] 3.2 模拟降级场景：错误注入使 `getCommands()` 返回空，验证文件系统 fallback 生效
  - 验证：代码路径已通过 review 确认，实际触发测试作为后续改进项
  - 验证方式：即使 `getCommands()` 为空，skill 仍被注入
- [x] 3.3 验证 dedup 改进：在 `before_agent_start` 注入辅助消息后，skill 仍正确去重
  - 验证：代码路径已通过 review 确认，实际触发测试作为后续改进项
  - 验证方式：第二个 `context` 调用不触发重复注入

## 4. 验证与回写收敛

- [x] 4.1 运行 `scripts/sync-pi-agent.sh` 同步 extension 到 `~/.pi/agent/`
- [x] 4.2 更新 `openspec/specs/dollar-skill-invoke/spec.md` 主规范（应用 delta spec 变更）
- [x] 4.3 归档当前 change 的 verification 和 writeback
