# Writeback

## 回写摘要

- change：`fusion-child-extension-injection`
- 回写结论：fork 代码已实现 child extension 注入（分支 `feat/merge-existing`，与 merge-existing 累积）；pi-config capabilities.yaml + settings.json + 全局 settings.json 已写入 `childExtensions: ["pi-xai"]`
- 关键结果：fusion-harness 子进程 spawn 时按 `fusionHarness.childExtensions` 配置追加 `-e` 显式注入扩展，使 pi-xai 注册的 grok-build provider 在 `--no-extensions` 子进程里可用；根因（grok-build 是扩展运行时注册、被 --no-extensions 排除）已对照实验验证

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `fusion-harness-integration` | Modified | `specs/fusion-harness-integration/spec.md` | ADDED `Child Extension Injection`（5 scenario：注入/空配置/未安装跳过/入口解析/全 role 统一）；MODIFIED `Settings Configuration Block`（+2 scenario：fork 默认空/全局默认 pi-xai） |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 7/7 scenario 有落点；5 个由单元测试+端到端复现证明，2 个配置层由 capabilities/settings 回写证明 | `verification.md` |
| Task-to-Evidence | 10/13 task 完成；集成 TUI 验证待 reload 后执行 | `child-extensions.test.ts`（21 assertions）+ 端到端复现 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://fusion-harness` | commit + tag v0.2.1 + push | 新增 `child-extensions.ts` + `child-extensions.test.ts`；`fusion-harness.ts` import + fusionSettings 扩展 + runChild `-e` 注入 |
| pi-config `forks/manifest.yaml` | fusion-harness `changes_summary` | 追加 v0.2.1：`/fusion children inject fusionHarness.childExtensions via -e (fix grok-build provider in --no-extensions subprocesses)` |
| pi-config `.pi/capabilities.yaml` | global.settings.fusionHarness | 追加 `childExtensions: ["pi-xai"]` |
| pi-config `.pi/settings.json` | fusionHarness 块 | 追加 `childExtensions: ["pi-xai"]` |
| 全局 `~/.pi/agent/settings.json` | fusionHarness 块 | 追加 `childExtensions: ["pi-xai"]` |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明 |
| --- | --- | --- | --- | --- |
| `repo://fusion-harness` commit | 待执行 | — | — | 待用户确认后 commit（与 merge-existing 同分支累积）→ merge main → tag v0.2.1 → push |
| pi-config capabilities.yaml | 已执行 | 2026-07-25 | agent | global.settings.fusionHarness.childExtensions: ["pi-xai"] |
| pi-config .pi/settings.json | 已执行 | 2026-07-25 | agent | fusionHarness.childExtensions: ["pi-xai"] |
| 全局 ~/.pi/agent/settings.json | 已执行 | 2026-07-25 | agent | fusionHarness.childExtensions: ["pi-xai"] |
| `scripts/sync-pi-agent.sh` | 跳过（deferred） | — | — | 遵循 global-delivery 约定 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（upstream + fork + pi-xai + pi-mono 证据）
- [x] `verification.md` 已生成（缺口为 TUI 集成验证，非阻塞代码回写）
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对

## 不回写的内容

- 不复制完整 proposal/design/specs/tasks 正文
- 不在 ~/.pi/agent/ 做额外全局运行时变更（已写的 settings.json childExtensions 除外）
- 不回写到 my-wiki 或外部仓库
