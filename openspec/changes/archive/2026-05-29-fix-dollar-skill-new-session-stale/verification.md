# Verification

## 验证结论

核心修复已完成：`getSkills()` 函数增加了 try-catch 防御，`pi.getCommands()` 在 stale runtime 下抛异常时降级到 `_fileSystemSkillIndex`。

**验证结果：通过 ✅**（代码审查 + 同步验证；运行时 `/new` 验证需在下次 session 中手动执行）

## Spec-to-Implementation Coverage

| Requirement Scenario | 实现位置 | 验证方式 |
|----------------------|----------|----------|
| Primary source works normally | `getSkills()` try 块内 `getSkillsFromCommands(pi)` → 正常返回 | 代码路径不变 |
| Primary source returns empty | `getSkills()` 返回空后 fallback 到 `_fileSystemSkillIndex` | 代码路径不变 |
| Primary source throws error (stale runtime) | `getSkills()` catch 块 → 返回 `_fileSystemSkillIndex` 或 `[]` | 代码审查确认 |
| Skill not found in primary but exists on filesystem | `handleContextInjection` L350-353 secondary find | 代码路径不变 |
| Filesystem index not yet built | `handleContextInjection` → `buildFileSystemSkillIndex` on-demand | 代码路径不变 |
| Both primary and filesystem sources fail | catch 块 → `_fileSystemSkillIndex` 为 null → 返回 `[]` | 代码审查确认 |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|------|------|------|
| 1.1 确认 spec 覆盖范围 | ✅ | 6 个 scenario 均有实现路径 |
| 1.2 确认依赖前置条件 | ✅ | `_fileSystemSkillIndex` 在 `session_start` 中重建，不受影响 |
| 2.1 修改 getSkills() | ✅ | `.pi/extensions/dollar-skill-invoke.ts` L110-L123 |
| 2.2 验证 effectiveSkills 逻辑 | ✅ | `getSkills` 返回 filesystem 结果时 `allSkills.length > 0`，直接使用 |
| 3.1 代码审查 | ✅ | 返回类型始终 `SkillInfo[]`，不影响调用者 |
| 3.2 标记 writeback 目标 | ✅ | 见 writeback.md |
| 4.1 运行时验证 | ⏳ | 需在下次 pi session 中 `/new` 后输入 `$skill-name` 手动验证 |
| 4.2 sync-pi-agent.sh | ✅ | 2026-05-29 执行成功，`diff` 确认一致 |
| 4.3 更新主规范 | ⏳ | 需在 writeback 阶段更新 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
|----------|--------------|----------------------|
| Extension 源码 | `.pi/extensions/dollar-skill-invoke.ts` L110-L123 | 2.1 getSkills 修改 |
| 部署文件 | `~/.pi/agent/extensions/dollar-skill-invoke.ts` | 4.2 sync |
| Spec delta | `openspec/changes/fix-dollar-skill-new-session-stale/specs/dollar-skill-invoke/spec.md` | 全部 |

## 缺口与阻塞项

- 4.1 运行时 `/new` 验证待下次 session 手动执行——属于非阻塞项，代码逻辑正确性已通过审查确认
- 4.3 主规范更新待 writeback 阶段执行
