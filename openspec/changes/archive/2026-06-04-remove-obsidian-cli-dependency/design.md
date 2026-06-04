# Design

## Context

`obsidian-tools` 扩展的 `search-tool.ts` 已全面使用 `rg` 后端完成搜索，不再依赖 Obsidian CLI。但 `vault-resolver.ts` 在 `session_start` 时仍通过 `preloadKnownVaults()` 启动 Obsidian CLI 获取 vault 名称映射。这一设计残余导致每次 Pi 打开 `.obsidian/` 仓库时都触发不必要的 CLI 进程启动。

移除 CLI 依赖后，vault 解析简化为纯文件系统操作，代码量大幅缩减，启动行为更干净。

## Goals / Non-Goals

**Goals:**
- 消除 `session_start` 中的所有 Obsidian CLI 子进程启动
- 删除 `cli-runner.ts` 整文件
- 简化 `vault-resolver.ts`：`resolveVault()` 直接返回绝对路径
- 保持 `obsidian_search` 工具全部行为不变

**Non-Goals:**
- 不改动 `search-tool.ts` 的搜索/排序/输出逻辑
- 不改动 `search-config.ts` 的配置加载
- 不改动 `capabilities.yaml`
- 不改动 `package.json`

## Decisions

### D1: `resolveVault()` 直接返回绝对路径

```
Before:  resolveVault() → name → resolveVaultPath(name) → path
After:   resolveVault() → path
```

`resolveVault()` 改为返回 `string`（绝对路径），去掉中间的 name 跳板。调用方 `search-tool.ts` 不再需要 `resolveVaultPath()`。

### D2: Vault 显示名从 basename 推导

`search-tool.ts` 中的输出消息原本使用 `vaultName` 变量展示 vault 名称。改为 `path.basename(vaultPath)`。

```
Before:  Vault: my-wiki    (来自 knownVaults map)
After:   Vault: my-wiki    (path.basename(vaultPath))
```

效果一致。

### D3: 保留 `isInsideVault()`，删除其余

`isInsideVault()` 是纯文件系统函数，仍在 `resolveVaultFromCwd()` 内部使用（via `search-tool.ts` 调用链），保留。

删除的函数/状态：
| 删除项 | 文件 | 原因 |
|--------|------|------|
| `knownVaults` Map | vault-resolver.ts | 不再需要 name→path 映射 |
| `_preloaded` / `_cliAvailable` | vault-resolver.ts | 不再需要 CLI 状态 |
| `preloadKnownVaults()` | vault-resolver.ts | CLI 调用入口 |
| `ensurePreloaded()` | vault-resolver.ts | 不再需要 lazy preload |
| `matchPathToKnownVaults()` | vault-resolver.ts | 不再需要路径→名称匹配 |
| `parseVaultListTable()` | vault-resolver.ts | CLI 输出解析 |
| `resolveExplicitVault()` | vault-resolver.ts | 短名称匹配不再需要 |
| `resolveVaultPath()` | vault-resolver.ts | 改为直接返回值 |
| `getKnownVaults()` / `hasPreloaded()` / `isCliAvailable()` | vault-resolver.ts | 不再暴露 |
| `import { runCli }` | vault-resolver.ts | 删除导入 |
| `cli-runner.ts` (全文件) | — | 删除 |

### D4: `session_start` 钩子简化为空或仅检查

```
Before:
  pi.on("session_start", async () => {
    if (isInsideVault(process.cwd())) {
      await preloadKnownVaults();
    }
  });

After:
  // session_start: no preload needed — vault detection is lazy
  // (triggered on first tool invocation via resolveVaultFromCwd)
```

直接在 `index.ts` 中删除整个 `session_start` 回调体（仅保留注释说明），或完全移除 `session_start` 注册。

## Risks / Migration

- **Risk**: 用户此前通过显式指定 vault 短名称使用工具（如 `vault="my-wiki"`），而 `knownVaults` 映射表已删除。
  - **Mitigation**: 从 exploration 阶段确认，当前实际使用场景中 vault 参数未传递或为路径；`resolveVaultFromCwd()` 作为主要路径不受影响。若未来需要短名称支持，可从 `.obsidian/obsidian.json` 读取。
- **Risk**: 删除后的代码路径未充分测试覆盖。
  - **Mitigation**: 验证阶段手动测试：在 vault 内启动 Pi → 确认无 CLI 进程 → 执行 `obsidian_search` → 确认结果正确。
