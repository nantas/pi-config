# Writeback

## 回写摘要

- change：`disable-pi-xai-prompt-suggest`
- 回写结论：已将「入口不注册 next-prompt ghost」落地到 `repo://pi-xai` v0.17.1，并 follow-up v0.17.2（README 措辞 + 回归测试）；pi-config `forks/manifest.yaml` 已更新。
- 关键结果：ghost 功能在 fork runtime 默认不可用；`/xai-suggest` 不注册。

## Capability / Spec 增量摘要

| Capability | 变更类型（New/Modified/Removed/Renamed） | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `pi-xai-prompt-suggest` | New | `openspec/changes/disable-pi-xai-prompt-suggest/specs/pi-xai-prompt-suggest/spec.md` | 默认不注册 prompt-suggest；允许保留源文件；文档/manifest 记录策略；废弃默认 ghost 预填 |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 通过 | `verification.md` 覆盖表；commit `1deacae` |
| Task-to-Evidence | 通过（TUI 交互待用户 `/reload` 抽检） | `verification.md` Task 表；tag `v0.17.1` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://pi-xai` | `index.ts` / CHANGELOG / README / version | 已 ship：不注册 + 文档 + 0.17.1 |
| `forks/manifest.yaml` | `forks[pi-xai].changes_summary` | 已追加 v0.17.1 unregister 说明 |

## 回写执行结果

| 目标页 | 执行结果（成功/失败/跳过） | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `repo://pi-xai` | 成功 | 2026-07-24 | apply agent | v0.17.1 `1deacae` + v0.17.2 `6cce4cc` · tags `v0.17.1`/`v0.17.2` |
| `forks/manifest.yaml` | 成功 | 2026-07-24 | apply agent | pi-config 工作区已改；待用户 commit pi-config |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（pkg-fork-dev）
- [x] `verification.md` 已生成；仅剩用户 TUI 抽检非阻塞
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
- 不自动 `scripts/sync-pi-agent.sh`（packages 已直接写 `~/.pi/agent/settings.json` 为 `git:github.com/nantas/pi-xai`）
