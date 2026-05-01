# Design

## Context

`subagent-dispatch` 当前位于 `.pi/packages/subagent-dispatch/`，通过 `.pi/settings.json` → `packages` 数组注册。它本质上是一个 extension（注册 `dispatch` tool + `/dispatch` command），并且有 npm 依赖（`pi-subagents@0.20.1`），使用子目录结构（`package.json` + `index.ts` + `core.js` + `node_modules/`）。

同一仓库中的 `obsidian-tools` 已经证明「有 npm 依赖的 extension 可以放在 `.pi/extensions/<name>/` 下并被 Pi 自动发现」。本次 migration 将 subagent-dispatch 对齐到同一模式。

## Goals / Non-Goals

**Goals:**
- 将 `.pi/packages/subagent-dispatch/` 移至 `.pi/extensions/subagent-dispatch/`
- 从 `.pi/settings.json` `packages` 数组中移除 `./packages/subagent-dispatch`
- 更新 `.pi/capabilities.yaml`：`global.settings.packages` 移除 → `global.extensions` 追加
- 调整 sync 脚本：移除 package 路径渲染，扩展 extension 子目录 `npm install` 支持
- 确保迁移后功能无变化（`dispatch` tool + `/dispatch` command 正常工作）
- 验证全局 sync 结果：`~/.pi/agent/extensions/` 变为 4 个文件，`settings.json` packages 减为 3 项

**Non-Goals:**
- 不改动 `index.ts`、`core.js`、`package.json`、`node_modules/` 内容
- 不升级 `pi-subagents` 版本
- 不改动 `obsidian-tools` 或其他已有 extension
- 不引入 catalog 声明（subagent-dispatch 保持 global scope）

## Decisions

### Decision 1: 整体目录移动，不修改代码

**选择**：直接 `mv .pi/packages/subagent-dispatch/ .pi/extensions/subagent-dispatch/`，不修改 `index.ts`、`core.js`、`package.json`。

**理由**：Pi 的 extension 自动发现不关心目录名历史；`package.json` 中的 `name` 字段不变，`pi.extensions` 声明的 `./index.ts` 路径相对文件自身，移动后仍然正确。`subagent-dispatch` 的 `shouldSkipGlobalDispatchExtensionRegistration` 函数使用 `process.cwd()` 和 `EXTENSION_FILE`（`import.meta.url`）动态解析路径，不受目录改名影响。

**替代方案**：复制 + 删除。同样有效但多一步操作，无实质收益。

### Decision 2: Sync 脚本采用通用化 extension npm install

**选择**：将原本硬编码为 `subagent-dispatch` 的 `ensure_local_package_dependencies` 函数改造为通用于所有 extension 子目录：扫描 `.pi/extensions/*/package.json` 并在缺少 `node_modules/` 时执行 `npm install`。

**理由**：`obsidian-tools` 也有 `package.json`，当前 sync 脚本却不处理它的 npm install（依赖手动 `npm install`）。通用化后，未来新增的任何带 npm 依赖的 extension 都会被自动处理。

**替代方案**：保留硬编码路径。但扩展性差，每新增一个带依赖的 extension 就要修改 sync 脚本。

### Decision 3: 使用 `.gitkeep` 占位保持 packages/ 目录

**选择**：在 `.pi/packages/` 下保留一个 `.gitkeep` 文件，防止 git 删除空目录。

**理由**：`packages/` 目录未来可能存放其他包（如 `pi install -l` 安装的 npm 包），不应删除。

**替代方案**：删除 `packages/` 目录。但 `npm install` 和 `pi install -l` 可能用到 `.pi/packages/` 作为安装目标。

### Decision 4: 不创建 catalog 声明

**选择**：subagent-dispatch 保持 global scope，仅从 `global.settings.packages` 移至 `global.extensions`。不追加到 `catalog.extensions`。

**理由**：subagent-dispatch 是 pi-config 仓库的 dispatch 工具，其他仓库不应按需安装它。它的使用场景绑定 pi-config 的 agent 架构。

## Risks / Migration

### Risk 1: Pi 无法从新路径加载 extension

- **影响**：移动后 Pi 可能找不到 extension，`dispatch` tool 失效
- **缓解**：
  1. Pi 自动扫描 `.pi/extensions/` 下所有 `.ts` 文件和子目录 → 已验证 `obsidian-tools` 工作
  2. 移动后执行 `/reload` 或重启 Pi 即可重新加载
  3. `package.json` 中的 `pi.extensions` 声明路径是相对路径，不受目录变化影响

### Risk 2: 全局 sync 后 `~/.pi/agent/extensions/` 中出现多余旧路径

- **影响**：如果旧 package 路径曾被同步目录覆盖，sync 后可能残留
- **缓解**：`subagent-dispatch` 从未被当作目录 extension 同步。旧 global settings 中的 `./packages/subagent-dispatch` 只是一行 JSON 字符串，非目录。下次 sync 时白名单过滤会移除该条目。stale cleanup 会清理不再在 `global.extensions` 中的 extension。

### Risk 3: `node_modules/` 状态不一致

- **影响**：目录移动后 `node_modules/` 中的绝对路径符号链接可能失效
- **缓解**：`pi-subagents` 不依赖符号链接。移动后若 `node_modules/pi-subagents` 缺失，通用 npm install 逻辑会自动补充。

### Risk 4: `.pi/settings.json` 的 `lastChangelogVersion` 等 key 被误删

- **影响**：不再需要 render `./packages/subagent-dispatch` 为绝对路径，但其他 settings 逻辑不应受影响
- **缓解**：只移除 `./packages/subagent-dispatch` 相关的渲染逻辑，settings 的完整 JSON 结构和 `lastChangelogVersion` 保留不变
