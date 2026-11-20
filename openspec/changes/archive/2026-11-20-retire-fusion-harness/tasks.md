# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `fusion-harness-integration` 16 条 requirement 与 `capability-manifest` 6 条 fusion 专属 requirement 的移除范围（依据 `specs/` 两份 delta）
- [x] 1.2 确认 `fusion-output-scratch-confinement` 的处理方式：artifacts 7/7、tasks 15/21，delta 的 5 条 MODIFIED requirement 在主 spec 中不存在，用 `--skip-specs` 归档

## 2. 核心实现任务

- [x] 2.1 归档 `fusion-output-scratch-confinement`（`openspec archive --yes --skip-specs`）
- [x] 2.2 创建本 change 并写入 binding / proposal / specs / design
- [x] 2.3 从 `.pi/settings.json` 删除 `fusionHarness` 块
- [x] 2.4 从 `~/.pi/agent/settings.json` 删除 `fusionHarness` 块
- [x] 2.5 删除本机安装副本 `~/.pi/agent/git/github.com/nantas/fusion-harness/`
- [x] 2.6 删除 `.scratch/fusion-harness/` 运行产物与 `run-index.jsonl`
- [x] 2.7 `forks/manifest.yaml` 的 fusion-harness 条目 `status: active` → `archived`

## 3. 收敛与验证准备

- [x] 3.1 证据清单：两处 settings 无 `fusionHarness`、磁盘路径不存在、packages 无 fusion、spec 移除结果
- [x] 3.2 writeback 摘要：`forks/manifest.yaml` 状态、`CONTEXT.md` 索引移除、pkg-backlog 追加清理结论

## 4. 验证与回写收敛

- [x] 4.1 生成 `verification.md`（spec-to-implementation + task-to-evidence）
- [x] 4.2 生成 `writeback.md`（目标、字段映射、前置条件）
- [x] 4.3 执行回写：forks manifest 状态、CONTEXT.md 索引、pkg-backlog 追加，并记录证据
- [x] 4.4 归档本 change 并确认主 spec 移除生效
- [x] 4.5 运行 `scripts/sync-pi-agent.sh` 部署 agent 列表与 settings，记录 sync 结果
