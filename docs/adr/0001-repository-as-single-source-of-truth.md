# Repository as Single Source of Truth for Pi Runtime

pi-config 仓库的 `.pi/` 目录是全局运行时配置的唯一真相源。`~/.pi/agent/` 是单向部署目标（由 `sync-pi-agent.sh` 推送），不可直接编辑。这是为了避免双向同步带来的合并冲突和状态不一致——全局运行时只是一个"展开后的副本"。
