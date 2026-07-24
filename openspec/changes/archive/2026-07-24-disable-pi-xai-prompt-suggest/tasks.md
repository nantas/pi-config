# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 对照 `specs/pi-xai-prompt-suggest/spec.md`：确认交付物仅是「入口不注册 + 文档/manifest 记录」，保留 `xai-prompt-suggest.ts` 文件
- [x] 1.2 按 pkg-fork-dev：确认 `repo://pi-xai` 路径为 `/Users/nantasmac/projects/forks/pi-xai`，working tree 干净可改
- [x] 1.3 开发源切换：将 `.pi/settings.json` packages 中 `git:github.com/nantas/pi-xai` 改为 `file:/Users/nantasmac/projects/forks/pi-xai`；检查全局 `~/.pi/agent/settings.json` 无 git/file 双载

## 2. 核心实现任务

- [x] 2.1 在 `repo://pi-xai/index.ts` 删除 `registerXaiPromptSuggest` 的 import 与调用（覆盖 Requirement: Prompt-suggest extension is not registered）
- [x] 2.2 更新 `repo://pi-xai/CHANGELOG.md` + `README.md`：标明本 fork 不注册 next-prompt ghost / `/xai-suggest` 不可用（覆盖 Requirement: Fork metadata and docs）
- [x] 2.3 bump `package.json` version `0.17.0` → `0.17.1`
- [x] 2.4 更新 pi-config `forks/manifest.yaml` 中 `pi-xai.changes_summary`，追加 unregister prompt-suggest 说明

## 3. 收敛与验证准备

- [x] 3.1 本地 `pi install` / `/reload` 后：agent 一轮结束确认无 ghost 预填；`/xai-suggest` 不可用（Scenario: Agent turn ends without ghost prefill）
- [x] 3.2 现有 `tests/xai-plan-suggest.test.ts` 仍可通过（source module retained；helpers 单测不依赖注册）
- [x] 3.3 ship：commit + tag `v0.17.1` + push origin；settings 恢复 `git:github.com/nantas/pi-xai`；再 `pi install` 验证 production 路径

## 4. 验证与回写收敛

- [x] 4.1 生成/更新 `verification.md`（spec-to-implementation + task-to-evidence）
- [x] 4.2 生成/更新 `writeback.md`（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback：fork 仓库已 push；`forks/manifest.yaml` 已更新；记录 commit/tag 链接与结果
