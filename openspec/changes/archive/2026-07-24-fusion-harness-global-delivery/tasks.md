# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 delta 覆盖：`specs/capability-manifest/spec.md`（global package 无 pin + `fusionHarness`）与 `specs/fusion-harness-integration/spec.md`（全局交付、sync 延后）——引用 design Decisions 1–5
- [x] 1.2 确认实现编辑根仅 pi-config：主路径 `.pi/capabilities.yaml`；可选 `.pi/settings.json` package 去 pin；**禁止** 编辑 `repo://fusion-harness`、`~/.pi/agent/`、运行 `scripts/sync-pi-agent.sh`
- [x] 1.3 确认外部协作：housekeep/ship 在其他 session；本 change 不依赖其完成即可 apply

## 2. 核心实现任务

- [x] 2.1 **capabilities.yaml packages**  
  - 在 `global.settings.packages` 追加一行：`git:github.com/nantas/fusion-harness`  
  - 验证：文件中存在该精确字符串，且无 `#` 后缀（覆盖 capability-manifest ADDED「Global Settings Packages MUST Include Fusion Harness Without Version Pin」）

- [x] 2.2 **capabilities.yaml fusionHarness**  
  - 在 `global.settings` 增加：
    ```yaml
    fusionHarness:
      architect: kimi-coding/k3
      builder: grok-build/grok-4.5
      architectThinking: high
      builderThinking: high
    ```
  - 验证：四键齐全且取值匹配（覆盖 capability-manifest ADDED「Global Settings MUST Define FusionHarness Configuration Block」与 fusion-harness-integration ADDED「Global FusionHarness Defaults」）

- [x] 2.3 **（推荐）项目 settings 去 pin**  
  - 将 `.pi/settings.json` packages 中 `git:github.com/nantas/fusion-harness#v0.1.3` 改为 `git:github.com/nantas/fusion-harness`  
  - 验证：JSON 合法；`fusionHarness` 项目块可保留不动  
  - 若跳过：在 verification 记「project pin align skipped」并说明理由

- [x] 2.4 **结构自检（不 sync）**  
  - 用 node/python 解析 capabilities.yaml 相关段，打印 packages 是否含 fusion-harness、fusionHarness 四键  
  - 确认 `catalog.packages` 未误加 fusion-harness、`global.extensions` 未误加 fusion  
  - 验证：本地检查通过即可关闭本任务；**不** 以 `~/.pi/agent/settings.json` 为准

## 3. 收敛与验证准备

- [x] 3.1 verification 证据清单：capabilities.yaml 片段、可选 settings.json diff、结构自检输出；明确记录「sync deferred / global runtime not mutated」
- [x] 3.2 writeback 准备：仅摘要能力表结论与延后 sync 操作；不回写 fork；不声称全局已生效

## 4. 验证与回写收敛

- [x] 4.1 基于真实 apply 结果写/更新 `verification.md`（spec-to-implementation + task-to-evidence；sync 未跑记为预期 PASS）
- [x] 4.2 写/更新 `writeback.md`（目标=能力表；字段映射；延后 sync 前置条件）
- [x] 4.3 执行 writeback 中仓内摘要落点（若有 CONTEXT/README 最小句则做；否则 N/A 并记录）；**不** 执行全局 sync
