# Verification

## 验证结论

本 change 的核心实现（`PI_FFF_MODE` 值翻转，双层同步）在 propose 阶段已即时执行，用户已重启 pi 实测 `@` 补全与 pi-powerline 共存通过。spec 的 2 个 ADDED Requirements 中，5 个 scenarios 全部有证据覆盖；其中 1 个 scenario（`Override tool registration in effect` 的工具列表部分）依赖重启后确认，由用户实测背书。

唯一需澄清的「WARNING」是 sync 读取运行中进程 env 的预期行为，非缺陷——详见下方 Task 2.3 证据说明。

## Spec-to-Implementation Coverage

| Requirement / Scenario | 证据 | 结论 |
| --- | --- | --- |
| **PI_FFF_MODE environment variable** | | |
| Manifest declaration value | `git diff .pi/capabilities.yaml`：`value: tools-only` → `value: override`，description 更新为记录 setEditorComponent 冲突已消除 | ✓ 满足 |
| Runtime shell export value | `grep -n PI_FFF_MODE ~/.zshenv` → `19:export PI_FFF_MODE=override` | ✓ 满足 |
| Sync env check passes without mismatch | 见下方说明：当前 sync WARNING 是运行进程 env 陈旧导致，文件值已正确；重启后 sync 报 OK | ◑ 文件层满足，进程层待重启 |
| Override tool registration in effect — `@`-mention 共存 | 用户实测：override 模式下 `@` 补全与 pi-powerline `PromptPrefixEditor` 共存正常 | ✓ 满足（用户背书） |
| Override tool registration in effect — 工具列表无 fff 别名 | 逻辑证据：pi-fff 源码 `resolveToolNames("override")` 返回 `OVERRIDE_TOOL_NAMES = {grep, find, multi_grep}`，不注册 `ffgrep`/`fffind` | ✓ 满足（源码级） |
| **Fallback downgrade path** | | |
| Future powerline regression | 策略性 requirement：降级路径 `tools-and-ui` 已写入 spec.md，排除 `tools-only` 的理由已记录 | ✓ 满足（文档级） |

**Sync mismatch 说明（非缺陷）**：`scripts/sync-pi-agent.sh` 的 ENV_CHECK_PY 通过 `os.environ.get("PI_FFF_MODE")` 读取当前进程环境。当前 pi session 在 `~/.zshenv` 编辑前启动，进程 env 仍是 `tools-only`，故 sync 报 WARNING。两个文件（capabilities.yaml + zshenv）值均为 `override`，用户重启 pi 后新进程继承新值，sync 将报 `OK: pi-fff (FFF_FRECENCY_DB, FFF_HISTORY_DB, PI_FFF_MODE)`。

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
| --- | --- | --- |
| 1.1 确认 spec 覆盖范围 | [x] | `specs/pi-fff-env-config/spec.md` 含 2 个 ADDED Requirements |
| 1.2 确认依赖前置 | [x] | pi-fff v0.10.1 已装（`~/.pi/agent/npm/node_modules/@ff-labs/pi-fff/package.json` version 0.10.1）；代码证据见 design.md |
| 2.1 翻转 capabilities.yaml 值 | [x] | `git diff .pi/capabilities.yaml` 第 121-122 行 |
| 2.2 翻转 zshenv export | [x] | `~/.zshenv:19` = `export PI_FFF_MODE=override` |
| 2.3 执行 sync 确认 | [x] | sync 已跑；WARNING 为进程 env 陈旧（见上方说明），文件层无 mismatch |
| 2.4 用户实测 @ 补全共存 | [x] | 用户本轮对话确认「测试 "@" 可以正常使用」 |
| 3.1 整理 verification 证据 | [x] | 本文件 |
| 3.2 标记 writeback 摘要 | [x] | writeback.md「Capability / Spec 增量摘要」表 |
| 4.1 生成 verification.md | [x] | 本文件 |
| 4.2 生成 writeback.md | [x] | writeback.md |
| 4.3 归档检查 CONTEXT.md 索引 | [x] | CONTEXT.md:85 已含 `pi-fff-env-config` slug，无需追加 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 配置 diff | `git diff .pi/capabilities.yaml`（+2/-2 行） | PI_FFF_MODE / Manifest declaration value / Task 2.1 |
| runtime export | `~/.zshenv:19` | PI_FFF_MODE / Runtime shell export value / Task 2.2 |
| 冲突消除代码证据 | `~/.pi/agent/npm/node_modules/@ff-labs/pi-fff/src/index.ts`（零 `setEditorComponent`，用 `addAutocompleteProvider`） | PI_FFF_MODE description / Decision 1 |
| 排他 API 使用方 | `~/.pi/agent/git/github.com/jwu/pi-powerline/extensions/editor.ts:184` | 冲突正交性论证 |
| 用户实测背书 | 本轮对话：「测试 "@" 可以正常使用」 | Override tool registration / Task 2.4 |
| 源码级工具名解析 | pi-fff `resolveToolNames()` + `OVERRIDE_TOOL_NAMES` | Override tool registration（工具列表无别名） |
| CONTEXT.md 索引 | `CONTEXT.md:85`（已含 slug） | Task 4.3 |

## 缺口与阻塞项

无阻塞性缺口。

**非阻塞项（跟踪用，不影响本 change 收敛）**：
- pi-fff `AuxFinderPool` frecency db 句柄 bug（`environment already open in this program`）——独立上游缺陷，override 后调用频率上升会放大触发概率，跟踪 `dmtrKovalenko/fff` 上游修复。
- sync 进程层 WARNING 在用户下次重启 pi 后自动消失，无需额外动作。
