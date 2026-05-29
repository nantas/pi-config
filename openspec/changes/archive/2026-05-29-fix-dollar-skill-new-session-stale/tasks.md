# Tasks

## 1. Spec 覆盖与实现准备

- [ ] 1.1 确认 spec 覆盖范围：`specs/dollar-skill-invoke/spec.md` 中 "Skill Discovery with Stale Runtime Defense" requirement 的 6 个 scenario 均有对应实现路径
- [ ] 1.2 确认依赖前置条件：`_fileSystemSkillIndex` 在 `session_start` 中重建的行为不受本次修改影响

## 2. 核心实现任务

- [ ] 2.1 修改 `getSkills()` 函数，用 try-catch 包裹 `getSkillsFromCommands(pi)` 调用。catch 块中降级到 `_fileSystemSkillIndex`，若也为 null 则返回空数组。文件：`.pi/extensions/dollar-skill-invoke.ts` L110-L115
- [ ] 2.2 验证修改后 `handleContextInjection` 的 `effectiveSkills` 逻辑仍能正确使用 `_fileSystemSkillIndex`（当 `getSkills` 返回 filesystem 结果时，`allSkills.length` 应 > 0，直接使用不再走 fallback 分支）

## 3. 收敛与验证准备

- [ ] 3.1 代码审查：确认 try-catch 不改变 `getSkills` 的返回类型（始终 `SkillInfo[]`），不影响调用者 `handleContextInjection` 的后续逻辑
- [ ] 3.2 标记需要进入 writeback 的目标：`.pi/extensions/dollar-skill-invoke.ts` 源码 + `openspec/specs/dollar-skill-invoke/spec.md` 规范更新

## 4. 验证与回写收敛

- [ ] 4.1 运行时验证：在 pi session 中执行 `/new`，然后输入 `$<skill-name> test`，确认 skill 内容被注入到 agent 上下文
- [ ] 4.2 执行 `scripts/sync-pi-agent.sh` 同步至 `~/.pi/agent/extensions/`
- [ ] 4.3 更新 `openspec/specs/dollar-skill-invoke/spec.md` 主规范，将 "Skill Discovery with Filesystem Fallback" requirement 更新为 "Skill Discovery with Stale Runtime Defense" 并纳入新 scenario
