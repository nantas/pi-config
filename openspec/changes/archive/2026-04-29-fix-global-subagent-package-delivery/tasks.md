# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 对齐 `pi-global-subagent-package-delivery`、`pi-subagent-dispatch-baseline`、`pi-runtime-bootstrap-sync` 三份 spec delta，确认实现范围覆盖 package 交付、dispatch 入口与 sync 渲染语义
- [x] 1.2 盘点依赖前置条件与外部约束，包括 local-path Pi package 的目录结构、package runtime dependency 安装方式，以及 `.pi/agents/` 继续走 user-level sync 的兼容要求

## 2. 核心实现任务

- [x] 2.1 将 `subagent-dispatch` 从 `.pi/extensions/subagent-dispatch/` 迁移到独立 package 目录，并补齐 `package.json`、package-owned dependency 与运行时入口
- [x] 2.2 更新 dispatch 代码与测试入口，使 `pi-subagents` 通过 package 依赖解析加载，不再依赖 `../../npm/node_modules/...` 或 `~/.pi/agent/npm/` 镜像路径
- [x] 2.3 调整 repository `.pi/settings.json`，改为声明 local package source 并移除旧的 raw extension 入口与不再需要的 `pi-subagents` settings package 暴露
- [x] 2.4 改造 `scripts/sync-pi-agent.sh`，让其在写入 `~/.pi/agent/settings.json` 前生成带绝对 local package 路径的 runtime variant，并确保 package runtime dependencies 已安装
- [x] 2.5 清理或停用旧的 `~/.pi/agent/extensions/subagent-dispatch/` raw extension 交付路径，确保 global runtime 只保留 package-backed 入口
- [x] 2.6 更新与实现直接相关的文档、边界说明和测试夹具，使路径、证据口径与新的 package 模型一致

## 3. 收敛与验证准备

- [x] 3.1 准备 verification 所需证据，至少覆盖 `pi --offline -p "ping"` 在 `pi-config` 与其他仓库的启动结果、`pi list` / settings 证据，以及 global agents 兼容性检查点
- [x] 3.2 标记需要进入 writeback 的状态变化，包括 settings 交付模型变更、global package source 口径和旧 raw extension 入口移除结果

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
