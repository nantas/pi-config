# Writeback

## 回写摘要

- change：`fff-override-mode`
- 回写结论：即时回写已完成（本 change 是配置值翻转，回写目标在 propose/实现阶段已直接编辑落地）
- 关键结果：`PI_FFF_MODE` 从 `tools-only` 翻转为 `override`，跨声明层（`.pi/capabilities.yaml`）与 runtime 层（`~/.zshenv`）一致；从工具 schema 层根除 fff 与内置 grep/find 的并存竞争；用户实测 `@` 补全与 pi-powerline 共存通过

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `pi-fff-env-config` | Modified | `specs/pi-fff-env-config/spec.md` | 新增 2 个 ADDED Requirements：`PI_FFF_MODE environment variable`（取值 `override`，双层同步，4 scenarios）+ `Fallback downgrade path`（降级 `tools-and-ui`，排除 `tools-only`，1 scenario）。未修改既有 `FFF_FRECENCY_DB`/`FFF_HISTORY_DB`/`Storage path convention` requirements |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 5/5 scenarios 有证据覆盖（2 用户实测背书，2 文件 diff，1 源码级逻辑）；sync 进程层 WARNING 为陈旧 env，文件层无 mismatch | `verification.md` Spec-to-Implementation Coverage 表 |
| Task-to-Evidence | 11/11 tasks 全部 `[x]`，每项附证据路径 | `verification.md` Task-to-Evidence Coverage 表 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `.pi/capabilities.yaml` | `global.env.pi-fff.variables.PI_FFF_MODE` | `value: tools-only` → `value: override`；`description` 更新为记录冲突消除依据 |
| `~/.zshenv` | 第 19 行 `export PI_FFF_MODE` | `tools-only` → `override` |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `.pi/capabilities.yaml` | 成功 | 本 change 创建时（propose 阶段） | 实现者（本 session） | `git diff .pi/capabilities.yaml` +2/-2 行 |
| `~/.zshenv` | 成功 | 本 change 创建时（propose 阶段） | 实现者（本 session） | `~/.zshenv:19` = `export PI_FFF_MODE=override` |
| `scripts/sync-pi-agent.sh` | 成功 | propose 阶段执行 | 实现者（本 session） | sync 完成；env WARNING 为进程陈旧 env，重启后消失 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（`openspec/specs/pi-fff-env-config/spec.md`）
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑（本仓 `.pi/capabilities.yaml` + 全局 `~/.zshenv`）
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致（Modified `pi-fff-env-config`，2 ADDED Requirements）

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息（已有的 `FFF_FRECENCY_DB`/`FFF_HISTORY_DB` 配置不变，不重复记录）
- `~/.zshenv` 不在本仓版本控制内（全局文件），其 diff 不进入本仓 git 记录，仅在 verification/writeback 中作为证据引用
