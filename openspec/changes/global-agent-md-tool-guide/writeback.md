# Writeback: global-agent-md-tool-guide

## Target

`repo://pi-config` → `openspec/pkg-backlog.md`

## Summary

**变更结论**: 全局 AGENTS.md 项目管理与同步机制已交付实现。

**交付物**:
1. `.pi/agent/AGENTS.md` — 工具调用指导（edit 批量上限、bash 替代偏好、错误恢复协议）
2. `scripts/sync-pi-agent.sh` — 新增 `sync_agents_md()` 函数，将 `.pi/agent/AGENTS.md` 同步到 `~/.pi/agent/AGENTS.md`
3. `AGENTS.md` — 新增 `## Global Agent Guidance` 章节（4 步工作流规则）

**变更范围**: 新增 1 文件（`.pi/agent/AGENTS.md`），修改 2 文件（`scripts/sync-pi-agent.sh`、`AGENTS.md`）。无删除。

**验证结果**: ✅ 4 个 spec requirements 全部覆盖实现。同步脚本 bash 语法验证通过。全局同步需用户确认后才执行。

## Writeback Execution

| Step | Status |
|------|--------|
| Resolve target via repo-registry | ⬜ |
| Edit target file (`openspec/pkg-backlog.md` — append delta summary) | ⬜ |
| Record timestamp and result | ⬜ |
