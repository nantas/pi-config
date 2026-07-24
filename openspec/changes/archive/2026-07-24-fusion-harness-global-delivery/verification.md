# Verification

## 验证结论

**能力表交付 PASS；全局 runtime 按设计未变更（sync deferred）。**

本 change 仅更新 pi-config 仓内能力表与文档对齐；`~/.pi/agent/settings.json` 仍无 fusion-harness，符合 binding/design「不执行 sync」。

## Spec-to-Implementation Coverage

| Spec requirement | 结果 | 证据 |
| --- | --- | --- |
| capability-manifest: Global packages includes unpinned `git:github.com/nantas/fusion-harness` | **PASS** | `.pi/capabilities.yaml` `global.settings.packages` |
| capability-manifest: Not catalog / not global.extensions | **PASS** | 无 `name: fusion-harness`；extensions 列表无 fusion |
| capability-manifest: `global.settings.fusionHarness` 四键 | **PASS** | kimi-coding/k3, grok-build/grok-4.5, high, high |
| capability-manifest / fusion-harness-integration: project pin align | **PASS** | `.pi/settings.json` package 无 `#` pin |
| fusion-harness-integration: sync deferred 不算失败 | **PASS** | 全局 settings 无 fusion；自检记录 `global_has_fusion False` |
| fusion-harness-integration: Global package delivery via manifest | **PASS** | 能力表已声明；runtime 待日后 sync |

## Task-to-Evidence Coverage

| Task | 结果 | 证据 |
| --- | --- | --- |
| 1.1–1.3 范围确认 | **PASS** | 编辑仅 pi-config；未触 fork / `~/.pi/agent` / sync |
| 2.1 packages | **PASS** | capabilities.yaml 追加 unpinned 源 |
| 2.2 fusionHarness | **PASS** | capabilities.yaml `global.settings.fusionHarness` |
| 2.3 项目去 pin | **PASS** | settings 由 `#v0.1.4` → unpinned |
| 2.4 结构自检 | **PASS** | python 自检 `OK structure self-check` |
| 3.1–3.2 证据/writeback 准备 | **PASS** | 本文件 + writeback.md |
| 4.1 verification | **PASS** | 本文件 |
| 4.2 writeback.md | **PASS** | writeback.md |
| 4.3 仓内摘要落点 | **PASS** | README + getting-started 最小更新；CONTEXT 已有 fusion 行无需改；**未** sync |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 能力表 | `.pi/capabilities.yaml` | 2.1, 2.2 |
| 项目 settings | `.pi/settings.json` | 2.3 |
| 自检输出 | apply session：`OK structure self-check`；`global_has_fusion False` | 2.4, sync deferred |
| 文档 | `README.md` fusion-harness 节；`docs/getting-started.md` 外部包 13 | 4.3 readme governance |
| 全局 runtime（负向） | `~/.pi/agent/settings.json` 无 fusion | deferred sync |

## 缺口与阻塞项

- **无阻塞 apply/archive 的缺口**
- **操作员后续**（非本 change 必做）：用户确认后 `./scripts/sync-pi-agent.sh` → 确认全局 packages + fusionHarness → 安装/重启验证 slash 命令
- housekeep/ship 仍在其他 session；无 pin 源不依赖特定 tag
