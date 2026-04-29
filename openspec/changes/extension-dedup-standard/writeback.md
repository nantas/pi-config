# Writeback: extension-dedup-standard

## Target

`repo://pi-config` → `openspec/pkg-backlog.md`

## Summary

**变更结论**: extension 自去重标准化已交付。

**交付物**:
1. `.pi/extensions/dollar-skill-invoke.ts` — 添加 `globalThis` 自去重标记
2. `.pi/skills/pi-extension-dev/SKILL.md` — Phase D 新增 Dedup Requirement 标准

**变更范围**: 修改 2 文件。无新增、无删除。

**验证结果**: ✅ 2 个 spec requirements 全部覆盖。扩展语法有效。技能文件中明确标注自去重要求。

## Writeback Execution

| Step | Status |
|------|--------|
| Resolve target via repo-registry | ⬜ |
| Edit target file (`openspec/pkg-backlog.md` — append delta summary) | ⬜ |
| Record timestamp and result | ⬜ |
