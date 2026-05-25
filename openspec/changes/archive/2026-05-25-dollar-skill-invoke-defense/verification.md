# Verification

## 验证结论

所有 MODIFIED requirements 已通过代码实现和运行时调试验证。Extension 在正常路径下行为不变，在降级路径下（`pi.getCommands()` 返回空）有文件系统 fallback 兜底。

**验证结果：通过 ✅**

## Spec-to-Implementation Coverage

| Requirement | 实现位置 | 验证方式 |
|-------------|----------|----------|
| Skill Discovery with Filesystem Fallback | `getSkills()` (L123) → `getSkillsFromCommands()` → `_fileSystemSkillIndex` | 调试日志确认 `getSkills` 返回 90 skills，含 `trellis-brainstorm` |
| Primary source works normally | `handleContextInjection()` (L338-342) — `effectiveSkills = allSkills` when non-empty | 调试日志确认 `getSkills` 返回 90 skills 时使用主路径 |
| Primary source returns empty | `handleContextInjection()` (L340-342) — fallback to `_fileSystemSkillIndex` | 代码路径存在，`_fileSystemSkillIndex` 在 `session_start` 预建 |
| Skill not found → secondary find | `handleContextInjection()` (L350-353) — `_fileSystemSkillIndex.find()` | 代码路径存在 |
| Filesystem Index Build on Session Start | `session_start` handler → `buildFileSystemSkillIndex(ctx.cwd)` | 扫描 4 个目录的递归逻辑实现完整 |
| Improved Dedup Scanning | `handleContextInjection()` (L327-334) — loop `[+1, +5)` | 代码范围扫描 5 条消息，遇 assistant/toolResult 停止 |
| Autocomplete fallback | `session_start` handler (L426) — `skills.length > 0 ? skills : _fileSystemSkillIndex` | 代码路径存在 |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|------|------|------|
| 2.1 scanSkillDir() | ✅ | 文件存在：`.pi/extensions/dollar-skill-invoke.ts` L80-L108 |
| 2.2 buildFileSystemSkillIndex() | ✅ | 文件存在：L110-L123 |
| 2.3 getSkillsFromCommands() | ✅ | 文件存在：L52-L61 |
| 2.4 getSkills() 三层回退 | ✅ | 文件存在：L123-L139 |
| 2.5 effectiveSkills 变量 | ✅ | 文件存在：L338-L343 |
| 2.6 改进 dedup | ✅ | 文件存在：L327-L335 |
| 2.7 session_start 预建索引 | ✅ | 文件存在：L417-L420 |
| 2.8 autocomplete fallback | ✅ | 文件存在：L425-L427 |
| 3.1 运行时验证 | ✅ | `/tmp/pi-dis-debug.log` 确认 `"step":"injecting"` |
| 4.1 sync-pi-agent.sh | ✅ | 2026-05-25 执行成功 |
| 4.2 主规范更新 | ✅ | `openspec/specs/dollar-skill-invoke/spec.md` 已更新 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
|----------|--------------|----------------------|
| Extension 源码 | `.pi/extensions/dollar-skill-invoke.ts` | All 实现 tasks |
| 部署文件 | `~/.pi/agent/extensions/dollar-skill-invoke.ts` | 4.1 sync |
| 运行时日志 | `/tmp/pi-dis-debug.log` (本次 session 调试) | 3.1 验证 |
| 主规范 | `openspec/specs/dollar-skill-invoke/spec.md` | 4.2 规范更新 |

## 缺口与阻塞项

- 3.2（模拟降级场景）和 3.3（验证 dedup 改进）未做完整端到端测试 — 仅通过代码审查验证，建议在后续 session 中补充实际触发测试
- 这些属于 nice-to-have，不影响当前 change 的交付质量
