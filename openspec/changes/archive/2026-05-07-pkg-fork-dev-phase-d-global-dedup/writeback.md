# Writeback

## Writeback Targets

### 1. `.pi/skills/pkg-fork-dev/SKILL.md`

**Action**: Modified

**Changes**:
- Phase D: 新增 D1a（全局去重门禁）、D1a-persist（持久化记录）、D5a（持久化确认）
- Phase E: 扩展 E4（全局恢复 + 清理）、扩展 E5a（全局 settings 验证）
- 新增 Appendix: Session Loss Recovery
- 新增 Constraint: Global dedup on local switch
- Skill Path Reference 表新增 `pi-package-loading.md`
- D1 步骤修正：使用绝对路径而非 `file:` 前缀

### 2. `docs/reference/pi-package-loading.md`

**Action**: Created (new file)

**Content**: Pi package loading pipeline, identity key calculation, two-layer deduplication, conflict diagnosis checklist.

## Execution Evidence

- [x] `.pi/skills/pkg-fork-dev/SKILL.md` updated with D1a, D1a-persist, D5a, E4 expansion, E5a expansion, Session Recovery appendix
- [x] `docs/reference/pi-package-loading.md` created
- [ ] Global sync (`scripts/sync-pi-agent.sh`) — 需要用户确认后执行，因为 SKILL.md 变更需要同步到 `~/.pi/agent/skills/`
