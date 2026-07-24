# Writeback

## 回写摘要

- change：`fusion-harness-global-delivery`
- 回写结论：**仓内能力表与文档已对齐；全局 sync 延后，未声称 runtime 已生效**
- 关键结果：
  - `.pi/capabilities.yaml`：`global.settings.packages` += `git:github.com/nantas/fusion-harness`（无 pin）；`global.settings.fusionHarness` 四键
  - `.pi/settings.json`：package 去 pin；项目 `fusionHarness` 保留
  - `README.md` / `docs/getting-started.md`：能力清单最小更新
  - `~/.pi/agent/`：**未** sync

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `capability-manifest` | Modified | `openspec/changes/fusion-harness-global-delivery/specs/capability-manifest/spec.md` | global packages 无 pin 登记 fusion-harness；global.settings 声明 fusionHarness；项目-only 注册不再是唯一交付路径 |
| `fusion-harness-integration` | Modified | `openspec/changes/fusion-harness-global-delivery/specs/fusion-harness-integration/spec.md` | 全局交付经能力表；sync deferred 可 PASS；默认模型四字段固定为 kimi/grok/high |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | PASS | `verification.md` 覆盖表；`.pi/capabilities.yaml` |
| Task-to-Evidence | PASS（12/12） | `verification.md`；结构自检 `OK`；全局负向证据 |
| Sync / runtime | DEFERRED（预期） | `~/.pi/agent/settings.json` 无 fusion |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `.pi/capabilities.yaml` | `global.settings.packages` | 追加 `git:github.com/nantas/fusion-harness` |
| `.pi/capabilities.yaml` | `global.settings.fusionHarness` | architect/builder/thinking 四键 |
| `.pi/settings.json` | `packages[]` | 去 pin 对齐 |
| `README.md` | 外部 Pi 包 | 新增 fusion-harness 条目 |
| `docs/getting-started.md` | 全局外部包清单 | 12→13 + fusion-harness |
| `CONTEXT.md` | OpenSpec 索引 | 已有 fusion 行 → 跳过 |
| `~/.pi/agent/` | settings.json | **不回写**（延后 sync） |
| `repo://fusion-harness` | 源码 | **不回写** |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `.pi/capabilities.yaml` | 成功 | 2026-07-24 | agent (opsx-apply) | packages + fusionHarness 已写 |
| `.pi/settings.json` | 成功 | 2026-07-24 | agent | unpinned package |
| `README.md` | 成功 | 2026-07-24 | agent | fusion-harness 节 |
| `docs/getting-started.md` | 成功 | 2026-07-24 | agent | 外部包 13 |
| `CONTEXT.md` | 跳过 | 2026-07-24 | agent | 索引已含 fusion-harness-integration |
| 全局 sync | 跳过 | 2026-07-24 | agent | 用户/其他 session 确认后执行 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（binding 所列主 spec）
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 proposal/design/specs/tasks 正文
- 不执行 `scripts/sync-pi-agent.sh`、不修改 `~/.pi/agent/`
- 不修改 `repo://fusion-harness`、不 tag/push
- 不写 catalog.packages 条目

## 操作员后续（延后 sync 清单）

1. 其他 session 完成 housekeep/ship（如需要）
2. 用户确认后：`./scripts/sync-pi-agent.sh`
3. 确认 `~/.pi/agent/settings.json` 含 unpinned fusion-harness + fusionHarness
4. 全局安装/重启后，非 pi-config 仓库验证 `/opinion` `/fusion` `/auto-validate`
