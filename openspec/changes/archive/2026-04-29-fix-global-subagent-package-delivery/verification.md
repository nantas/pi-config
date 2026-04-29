# Verification

## 验证结论

- `subagent-dispatch` 已从 `.pi/extensions/subagent-dispatch/` 迁移到 `.pi/packages/subagent-dispatch/`，并新增 package manifest：`.pi/packages/subagent-dispatch/package.json`。
- dispatch 入口已改为通过 package-owned dependency 解析 `pi-subagents`，不再直接引用 `../../npm/node_modules/pi-subagents/*.ts` 或依赖 `~/.pi/agent/npm/` 镜像路径。
- repository `.pi/settings.json` 已更新为 portable local-path package source：保留 `npm:pi-mcp-adapter@2.5.1`，新增 `./packages/subagent-dispatch`，移除旧的 raw extension 入口与 `npm:pi-subagents@0.20.1` settings 暴露。
- `scripts/sync-pi-agent.sh` 已改为：
  - 继续 copy-based sync `.pi/extensions/`、`.pi/prompts/`、`.pi/themes/`、`.pi/agents/`
  - 在写入 runtime settings 前确保 `.pi/packages/subagent-dispatch/node_modules/pi-subagents` 已安装
  - 将 repo settings 中的 `./packages/subagent-dispatch` 渲染为当前仓库绝对路径后写入 runtime `settings.json`
  - 不再把 `.pi/npm/` 作为 managed runtime sync 目标
- legacy global raw extension 路径 `~/.pi/agent/extensions/subagent-dispatch/` 已被停用：helper 会拒绝注册该旧入口，sync 后的临时 runtime 也不再包含该目录内容。
- user-level agent sync 兼容性保持不变：临时 runtime 中仍同步得到 `~/.pi/agent/agents/code-writer.md` 与 `~/.pi/agent/agents/dispatch-planner.md`。
- repository-managed Pi settings 影响评估结果：`repo-settings-updated`
- global Pi runtime sync 结果：`global-sync-confirmed-and-run`
- 已于 `2026-04-29T13:17:16Z` 通过既有 `scripts/sync-pi-agent.sh` 完成真实全局 sync

## 关键验证记录

### 代码与单测

- 命令：`node --test tests/subagent-dispatch-core.test.mjs`
- 结果：`11/11` 通过
- 覆盖点：
  - skill / projectContext 规范化
  - dispatch 文本格式化
  - legacy global raw extension skip 逻辑
  - package-backed self registration 逻辑

### 临时 runtime 验证（未触碰真实 `~/.pi/agent/`）

- 临时 HOME：`/var/folders/rw/9dl2pfc97k7b5l8512s5fhf40000gn/T/tmp.sTcvbdzsmF`
- 临时其他仓库：`/var/folders/rw/9dl2pfc97k7b5l8512s5fhf40000gn/T/tmp.sPRKDOWk8a`
- 使用命令：
  - `HOME=<tmp> ./scripts/sync-pi-agent.sh`
  - `HOME=<tmp> pi list`
  - `HOME=<tmp> pi --offline -p "ping"`（在 `pi-config` 内）
  - `HOME=<tmp> pi --offline -p "ping"`（在独立临时 git 仓库内）

### 临时 runtime 关键输出

- 渲染后的 `settings.json`：

```json
{
  "packages": [
    "npm:pi-mcp-adapter@2.5.1",
    "/Users/nantas-agent/projects/pi-config/.pi/packages/subagent-dispatch"
  ]
}
```

- `pi list` 关键结果：
  - User packages:
    - `npm:pi-mcp-adapter@2.5.1`
    - `/Users/nantas-agent/projects/pi-config/.pi/packages/subagent-dispatch`
  - Project packages:
    - `npm:pi-mcp-adapter@2.5.1`
    - `./packages/subagent-dispatch`
- `pi --offline -p "ping"` 结果：
  - `pi-config` 仓内：`Pong` 成功
  - 独立临时 git 仓内：`Pong` 成功
- global agents 检查：
  - `~/.pi/agent/agents/code-writer.md` 存在
  - `~/.pi/agent/agents/dispatch-planner.md` 存在
- legacy global extension 检查：
  - 临时 runtime 的 `~/.pi/agent/extensions/` 下未再交付 `subagent-dispatch` raw 目录

### 真实全局 sync 结果

- 执行时间：`2026-04-29T13:17:16Z`
- 命令：`./scripts/sync-pi-agent.sh`
- 结果：
  - `~/.pi/agent/settings.json` 已渲染为绝对 package path
  - `~/.pi/agent/agents/code-writer.md` 与 `~/.pi/agent/agents/dispatch-planner.md` 已同步
  - `~/.pi/agent/extensions/` 下不再保留 `subagent-dispatch` raw 目录

## Spec-to-Implementation

| Capability | Requirement focus | Evidence |
| --- | --- | --- |
| `pi-global-subagent-package-delivery` | global entry uses local-path package source | `.pi/settings.json`, `.pi/packages/subagent-dispatch/package.json`, `scripts/sync-pi-agent.sh` |
| `pi-global-subagent-package-delivery` | package owns runtime dependencies | `.pi/packages/subagent-dispatch/package.json`, `.pi/packages/subagent-dispatch/node_modules/pi-subagents`, `.pi/packages/subagent-dispatch/index.ts` |
| `pi-global-subagent-package-delivery` | global settings reference current repo by absolute path | temporary `settings.json` output, `scripts/sync-pi-agent.sh` |
| `pi-global-subagent-package-delivery` | user-level agents remain available globally | temporary `~/.pi/agent/agents/code-writer.md`, temporary `~/.pi/agent/agents/dispatch-planner.md`, cross-repo `ping` success |
| `pi-runtime-bootstrap-sync` | settings target allows generated runtime values | `scripts/sync-pi-agent.sh`, `docs/pi-phase1-boundary.md` |
| `pi-runtime-bootstrap-sync` | overwrite semantics remain managed | `scripts/sync-pi-agent.sh`, temporary runtime outputs |
| `pi-runtime-bootstrap-sync` | local package dependencies prepared before deploy | `scripts/sync-pi-agent.sh`, `.pi/packages/subagent-dispatch/node_modules/pi-subagents` |
| `pi-subagent-dispatch-baseline` | repository-owned dispatch entry remains the formal entrypoint | `.pi/packages/subagent-dispatch/index.ts`, `.pi/packages/subagent-dispatch/core.js` |
| `pi-subagent-dispatch-baseline` | `/dispatch` wrapper remains repository-owned | `.pi/packages/subagent-dispatch/index.ts` |
| `pi-subagent-dispatch-baseline` | bridge resolves `pi-subagents` through package dependency model | `.pi/packages/subagent-dispatch/index.ts`, `.pi/packages/subagent-dispatch/package.json` |

## Task-to-Evidence

| Task | Evidence |
| --- | --- |
| `1.1` | 三份 spec delta、`design.md`、本文件 `Spec-to-Implementation` |
| `1.2` | `docs/plans/pi-customization-reference.md` 的 packages 段落、`@mariozechner/pi-coding-agent/docs/packages.md`、temporary runtime evidence |
| `2.1` | `.pi/packages/subagent-dispatch/package.json`, `.pi/packages/subagent-dispatch/index.ts`, `.pi/packages/subagent-dispatch/core.js` |
| `2.2` | `.pi/packages/subagent-dispatch/index.ts`, `tests/subagent-dispatch-core.test.mjs` |
| `2.3` | `.pi/settings.json` |
| `2.4` | `scripts/sync-pi-agent.sh`, temporary rendered `settings.json`, package dependency install result |
| `2.5` | temporary `~/.pi/agent/extensions/` listing, `.pi/packages/subagent-dispatch/core.js` |
| `2.6` | `docs/pi-phase1-boundary.md`, `tests/subagent-dispatch-core.test.mjs` |
| `3.1` | `node --test ...`, `HOME=<tmp> pi list`, `HOME=<tmp> pi --offline -p "ping"` x2 |
| `3.2` | `.pi/settings.json`, `writeback.md` |
| `4.1` | 本文件 |
| `4.2` | `writeback.md` |
| `4.3` | `writeback.md`、`/Users/nantas-agent/projects/obsidian-mind/20_项目/Pi_Config/项目进度总览.md` |

## 覆盖缺口

- `repo://pi-mono` 的本地 checkout 当前在本机会话中不可用，未能直接从该仓做只读取证。
- 本轮关于 package/source 语义的 Pi 官方依据，改用本机已安装的官方文档快照：
  - `/Users/nantas-agent/pi-apps/pi-discord-bot/node_modules/@mariozechner/pi-coding-agent/docs/packages.md`
  - `/Users/nantas-agent/pi-apps/pi-discord-bot/node_modules/@mariozechner/pi-coding-agent/examples/extensions/with-deps/package.json`
- `repo://pi-mono` 仍缺少本地 checkout 级源码证据；当前与 package/source 相关的官方依据仍来自本机已安装文档快照。
