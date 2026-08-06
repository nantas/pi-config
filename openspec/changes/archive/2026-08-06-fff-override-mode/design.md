# Design

## Context

本 change 是一个已完成的单值翻转：`PI_FFF_MODE` 从 `tools-only` → `override`，跨两个声明层（`.pi/capabilities.yaml` + `~/.zshenv`）同步执行。change 创建时修改已落地、用户已实测重启通过。

之所以仍走完整 propose 流程而非事后补记，是因为该值背后有一段被废弃的历史约束（`setEditorComponent` 冲突），需要把「为什么旧约束失效」的技术依据沉淀进 spec 真源，避免未来维护者看到 override 又基于过时记忆回退。

设计输入：`specs/pi-fff-env-config/spec.md` 的两个 ADDED Requirements（`PI_FFF_MODE environment variable` + `Fallback downgrade path`）。

## Goals / Non-Goals

**Goals:**
- 把 `PI_FFF_MODE=override` 的取值依据固化为 spec 行为规范
- 记录冲突消除的代码证据链（pi-fff v0.10.1 迁移 API + pi-powerline 排他 API 正交），使未来维护者不必重新考古
- 定义降级路径，约束未来若 powerline 回归时的应急动作

**Non-Goals:**
- 不修改 fff 工具的参数 schema 或 execute 实现（override 仅切换工具注册名，行为不变）
- 不调整 AGENTS.md 的检索指引 prose（schema 层根治后 prose 衰减大幅缓解；如仍需收紧另开 change）
- 不修复 pi-fff `AuxFinderPool` 的 frecency db 句柄 bug（独立上游缺陷）
- 不给 pi-fff 工具描述加「grep 推荐替代」字样（上游 PR 性质）

## Decisions

**Decision 1: 单值翻转，不引入中间配置层**
`PI_FFF_MODE` 是 pi-fff 原生支持的枚举（`tools-and-ui` / `tools-only` / `override`），直接翻转值即可。不引入额外 wrapper 或条件配置——pi-fff 自己处理 mode 解析（flag > env > default），无需本仓介入。

**Decision 2: 双层同步是硬约束，非可选**
`global.env` 是声明性 schema，`sync-pi-agent.sh` 只校验 `os.environ` 不写文件（见 `scripts/sync-pi-agent.sh:848` 的 `ENV_CHECK_PY`）。真正 runtime 读到的值来自 `~/.zshenv` export。因此 capabilities.yaml 与 zshenv 必须**同改**，单改一处会触发 sync WARNING 或 runtime 不生效。这一约束已写入 spec 的 `Sync env check passes without mismatch` scenario。

**Decision 3: override 优先于 tools-and-ui 作为根治方案**
三个 mode 中只有 `override` 能从工具 schema 层消除「内置 grep + ffgrep 并存」的竞争——它让 fff 直接接管 `grep`/`find` 工具名，agent 看不到第二个竞争工具。`tools-and-ui` 仍保留 fff UI 但工具名并存（竞争仍在），`tools-only` 既禁 UI 又不解决竞争。故 override 是唯一根治选项。

**Decision 4: 保留 `tools-and-ui` 作为应急降级，排除 `tools-only`**
spec 的 `Fallback downgrade path` requirement 记录：若未来 pi-powerline 回归排他 `setEditorComponent` 行为导致 `@` 补全失效，降级到 `tools-and-ui`（保 UI、接受工具竞争作为临时代价）。`tools-only` 被明确排除——它既禁 UI 又不解决竞争，是三选项中最差的，不应作为任何场景的 fallback。

## Risks / Migration

**Risk 1（已验证消除）: pi-fff 与 pi-powerline 编辑器冲突**
旧 `tools-only` 注释声称冲突。代码考古证实：pi-fff v0.10.1 全源码零 `setEditorComponent` 调用，UI 接入点已迁移至组合式 `addAutocompleteProvider`（接收 `current` provider 链式包装，非排他）；pi-powerline 仍用排他 `setEditorComponent`。两者操作正交 API。用户实测 override + powerline `@` 补全共存通过。**风险已闭合。**

**Risk 2（已知残留）: pi-fff AuxFinderPool frecency db 句柄 bug**
调查期间 `ffgrep` 自身踩到 `Failed to init frecency db: environment already open in this program`。这是 pi-fff 对子目录路径重复打开主 db 的句柄问题，与 mode 无关。override 后内置 grep 名被接管、调用频率上升会放大该 bug 触发概率。不阻塞本变更，跟踪上游 `dmtrKovalenko/fff` 修复。

**Migration:**
- 无需迁移动作——override 仅改工具注册名，参数 schema 与 execute 行为完全一致。
- 旧 session（`tools-only` 下注册了 `ffgrep` 等）需重启 pi 生效；新 session 直接是 override 态。重启动作由用户在 change 创建后执行，已确认完成。
