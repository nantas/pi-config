# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 核对 `global-mcp-config` delta 各 requirement 与运行时现实一一对应（mcp-server-entries / native-entry-format / no-adapter-shadowing / project-level-configs）
- [x] 1.2 核对 `pi-mcp-shared-bridge` 六条 requirement 均已失效且迁移去向明确

## 2. 核心实现任务

- [x] 2.1 运行时迁移（前置阶段已完成）：适配器卸载、mcp.json 更新、manifest 删行、下游项目 `.pi/mcp.json` 落地——证据见 pkg-backlog 2026-10-19 记录
- [x] 2.2 `-builtin:mcp` 残留修复：`~/.pi/agent/settings.json` 已删 `extensions` 键；验证 = `pi --print` session 内 `mcp__gitnexus__*` 工具声明可见

## 3. 收敛与验证准备

- [ ] 3.1 进入 verification 的证据：spec delta 文本、运行时验证输出（`pi mcp list` / `pi --print`）、settings.json 修复前后对比、下游项目连接结果
- [ ] 3.2 进入 writeback 的摘要：CONTEXT.md 索引「MCP 配置」域（删 `pi-mcp-shared-bridge`）、orbitos `Pi_Config.md` 项目页（迁移结论）

## 4. 验证与回写收敛

- [x] 4.1 生成 verification.md（spec-to-implementation 与 task-to-evidence 映射）
- [x] 4.2 生成 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行回写并记录可审计证据（目标文件、时间、执行人、结果）
