# Binding

## 标准与项目页面绑定

- `spec_standard_ref`:
  - `openspec/specs/fusion-harness-integration/spec.md`（fusion-harness 正式集成行为：包注册、fusionHarness 配置块、artifact 路径）
  - `openspec/specs/capability-manifest/spec.md`（能力表权威源；global.settings.packages / settings 合并语义）
  - `openspec/specs/pi-runtime-bootstrap-sync/spec.md`（sync 从 capabilities.yaml 生成全局 settings.json）
- `project_page_ref`:
  - `openspec/changes/archive/2026-07-24-fusion-harness-formal-integration/writeback.md`（正式集成仅回写项目 settings，未写 global packages 的历史边界）
  - `forks/manifest.yaml`（fusion-harness fork 注册条目）
  - `.pi/settings.json`（当前项目级 package + fusionHarness 配置样例）
  - `.pi/capabilities.yaml`（本次唯一实现编辑目标：global.settings）
- `additional_context_refs`:
  - `scripts/sync-pi-agent.sh`（同步与 project package dedupe；本次 change **不执行** sync）
  - `openspec/changes/fusion-housekeep/`（housekeep / v0.1.4 在其他 session 推进；本 change 不依赖其 ship 完成）

## Source of Truth

- 行为规范真源：`specs/<capability-id>/spec.md`（本 change 的 delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：explore 纪要、formal-integration writeback、项目 settings 现状不得替代 spec delta

## 回写目标

- `writeback_targets`:
  - `.pi/capabilities.yaml`（`global.settings.packages` 追加 fusion-harness；`global.settings` 追加 `fusionHarness` 块）
  - 可选对齐：`.pi/settings.json` 中 fusion-harness package 源去掉版本 pin（与 global 无 pin 策略一致）；`fusionHarness` 可保留项目覆盖
  - 不回写 `repo://fusion-harness` 源码
  - 不执行 / 不回写 `~/.pi/agent/`（全局 sync 延后到其他 session 用户确认后）
- `writeback_owner`: pi-config 仓库
- `writeback_timing`:
  - apply 完成并本仓验证 capabilities.yaml 结构后写入
  - 全局 `scripts/sync-pi-agent.sh` **明确延后**，不在本 change 必做任务内

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 实现编辑根：仅 pi-config 能力表与必要的项目 settings 对齐；禁止本 change 改 fork 源码
- package 源字符串 **无版本 pin**：`git:github.com/nantas/fusion-harness`（不使用 `#v…`）
- 分发形态：**global**（不是 catalog.packages）
- 全局运行时同步需用户显式确认；本 change 产出配置，不代跑 sync

## 待确认项

- [x] 已确认标准页引用（fusion-harness-integration + capability-manifest + bootstrap-sync）
- [x] 已确认项目页引用（formal writeback + manifest + capabilities/settings）
- [x] 已确认回写目标与权限（pi-config 本地可写；全局 sync 延后）
- [x] 已确认异常处理与冲突策略（其他 session 负责 ship；本 change 仅能力表；dedupe 在日后 sync 时由脚本处理）
