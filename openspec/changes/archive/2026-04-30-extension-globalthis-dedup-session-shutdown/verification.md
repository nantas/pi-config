# Verification

## 验证结论

实现完成，用户复现确认 `/new` 后 extension 功能恢复正常。所有 spec requirements 已覆盖，核心任务已完成。

## Spec-to-Implementation Coverage

| Requirement | 覆盖证据 | 状态 |
|---|---|---|
| Extension Self-Dedup Must Clear on Session Shutdown | `.pi/extensions/dollar-skill-invoke.ts` +3行 `pi.on("session_shutdown", ...)` | ✅ |
| | `.pi/extensions/planner-toggle.ts` +3行 `pi.on("session_shutdown", ...)` | ✅ |
| Scenario: `/new` session replacement | 用户实测: `/new` 后 `$` autocomplete 和 planner toggle 均正常 | ✅ |
| Scenario: `/reload` session replacement | 代码路径一致 (session_shutdown 同样触发) | ✅ |
| Scenario: Dual-path loading | `globalThis` 标志位在 factory 执行后立即重设 | ✅ |
| pi-extension-dev Skill Must Document | `.pi/skills/pi-extension-dev/SKILL.md` 已更新 | ✅ |
| Reference Documentation | `docs/reference/pi-extension-session-shutdown-dedup.md` 新建 | ✅ |

## Task-to-Evidence Coverage

| Task | 证据 | 状态 |
|---|---|---|
| 2.1 dollar-skill-invoke 修复 | `.pi/extensions/dollar-skill-invoke.ts` | ✅ |
| 2.2 planner-toggle 修复 | `.pi/extensions/planner-toggle.ts` | ✅ |
| 2.3 同步 global 副本 | `~/.pi/agent/extensions/` 已同步 | ✅ |
| 2.4 创建参考文档 | `docs/reference/pi-extension-session-shutdown-dedup.md` | ✅ |
| 2.5 更新 skill | `.pi/skills/pi-extension-dev/SKILL.md` | ✅ |
| 3.1 验证修复 | 用户复现确认 | ✅ |

## 缺口与阻塞项

无。
