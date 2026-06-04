# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/obsidian-tools/spec.md` 覆盖范围：MODIFIED × 4（Vault Resolution File-system Only, Direct Path Return, Basename Display, Search Unchanged）+ REMOVED × 3（CLI Preloading, KnownVaults Map, CLI Runner Module）
- [x] 1.2 确认依赖：无外部依赖，变更限定在 `.pi/extensions/obsidian-tools/` 内

## 2. 核心实现任务

### 2.1 删除 `cli-runner.ts`

- [x] 2.1.1 删除 `.pi/extensions/obsidian-tools/cli-runner.ts`
- 验证：文件不存在

### 2.2 重构 `vault-resolver.ts`

- [x] 2.2.1 删除 `import { runCli } from "./cli-runner"` 语句
- [x] 2.2.2 删除 `knownVaults` Map、`_preloaded`、`_cliAvailable` 状态变量
- [x] 2.2.3 删除 `isCliAvailable()`、`getKnownVaults()`、`hasPreloaded()` 导出函数
- [x] 2.2.4 删除 `preloadKnownVaults()` 函数
- [x] 2.2.5 删除 `ensurePreloaded()` 函数
- [x] 2.2.6 删除 `matchPathToKnownVaults()` 函数
- [x] 2.2.7 删除 `parseVaultListTable()` 函数
- [x] 2.2.8 删除 `resolveExplicitVault()` 函数
- [x] 2.2.9 删除 `resolveVaultPath()` 函数
- [x] 2.2.10 重写 `resolveVault()`：签名改为 `(explicitVault?: string, cwd?: string): string`，直接返回绝对路径；内部集成 `resolveVaultFromCwd()` 逻辑
- [x] 2.2.11 删除 `METADATA_FIELDS` 常量与 `isMetadataField()` 辅助函数（仅被 `parseVaultListTable` 使用）
- 验证：`resolveVault()` 在 vault 内调用时返回绝对路径，不在 vault 内时 throw Error

### 2.3 更新 `search-tool.ts`

- [x] 2.3.1 删除 import 中的 `ensurePreloaded` 和 `resolveVaultPath`
- [x] 2.3.2 删除 `await ensurePreloaded()` 调用（第 2 行 of execute 函数）
- [x] 2.3.3 将 `let vaultName: string` + `resolveVault(params.vault)` 改为 `const vaultPath = resolveVault(params.vault)`（直接获取路径）
- [x] 2.3.4 删除 `const vaultPath = resolveVaultPath(vaultName)` 行
- [x] 2.3.5 将输出中的 `vault: vaultName` 改为 `vault: path.basename(vaultPath)`
- 验证：TypeScript 编译无错误，`obsidian_search` 工具正常执行

### 2.4 简化 `index.ts`

- [x] 2.4.1 删除 `import { preloadKnownVaults, isInsideVault } from "./vault-resolver"` 中的 `preloadKnownVaults` 和 `isInsideVault`
- [x] 2.4.2 删除 `session_start` 回调中的整个 `if (isInsideVault(...))` 块（保留注释说明不再需要预加载）
- [x] 2.4.3 删除 `pi.on("session_start", ...)` 整个注册（如果无其他逻辑）
- 验证：TypeScript 编译无错误

### 2.5 清理 `vault-resolver.ts` 导出

- [x] 2.5.1 确认仅导出：`resolveVault`、`resolveVaultPath`（如果需要保留向后兼容）或仅 `resolveVault`
- 验证：`search-tool.ts` 和 `index.ts` 的 import 全部正确

## 3. 收敛与验证准备

- [x] 3.1 验证清单：
  - 在 vault 内启动 Pi → 确认无 Obsidian CLI 进程 (`ps aux | grep -i obsidian`)
  - 执行 `obsidian_search("test")` → 确认返回正常结果
  - 在非 vault 目录启动 Pi → 确认无报错
- [x] 3.2 如有 `capabilities.yaml` 检查需确认扩展条目无需变更

## 4. 验证与回写收敛

- [x] 4.1 基于实现结果生成 `verification.md`（覆盖 spec 逐条验证）
- [x] 4.2 基于验证结论生成 `writeback.md`（本次为轻量回写：确认全局同步后无新增异常）
- [x] 4.3 执行确认：运行 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`
