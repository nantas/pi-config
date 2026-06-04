# Verification

## 验证方法

本 change 的验证基于代码审查和结构验证（非运行时测试，因扩展在 Pi 运行时内执行）。

---

## MODIFIED Requirements 验证

### ✅ Vault Resolution — File-system Only

**Spec 要求**: `resolveVault()` 仅使用文件系统遍历，不启动 CLI 子进程。`session_start` 不可调用外部子进程。

**验证结果**:
- `vault-resolver.ts` 已重写，仅使用 `accessSync`/`realpathSync`/`resolve` 进行 vault 检测
- `index.ts` 中 `session_start` 钩子已完全删除，不再注册任何启动回调
- 无 CLI 相关 import（`runCli` 已删除，`cli-runner.ts` 已删除）
- `isInsideVault()` 保留，纯文件系统实现

### ✅ Vault Path Returned Directly by Resolver

**Spec 要求**: `resolveVault()` 直接返回绝对路径，消除中间 name → path 反向查找。

**验证结果**:
- `resolveVault()` 签名改为 `(explicitVault?: string, cwd?: string): string`
- 返回值为绝对路径（`resolve(explicitVault)` 或 `realpathSync(current)`）
- 无中间 `resolveVaultPath()` 调用步骤
- `search-tool.ts` 中 `const vaultPath = resolveVault(params.vault)` 直接获取路径

### ✅ Vault Display Name Uses Basename

**Spec 要求**: 输出中的 vault 名称从 `path.basename(vaultPath)` 推导。

**验证结果**:
- `search-tool.ts` 新增 `import { basename } from "node:path"`
- 输出调用改为 `vault: basename(vaultPath)`
- 效果与之前使用 `knownVaults` 映射表时一致（名称来源于目录名）

### ✅ Search Functionality Unchanged

**Spec 要求**: 搜索行为完全保持不变。

**验证结果**:
- `search-tool.ts` 中所有搜索逻辑（`sanitizeQuery`, `tokenizeQuery`, `runRgSearch`, `mergeRgResults`, `rankResults`, `generateSnippet`, `buildOutput`）未做任何修改
- `search-config.ts` 未修改
- rg 调用路径、参数、输出格式完全保持原样
- 唯一变更限于 vault 解析调用链的简化

---

## REMOVED Requirements 验证

### ✅ CLI-based Vault Preloading

**验证结果**:
- `preloadKnownVaults()` 函数已删除
- `session_start` 中不再调用任何预加载逻辑
- 无 `ensurePreloaded()` 调用（已从 `search-tool.ts` 删除）

### ✅ Known Vaults Map

**验证结果**:
- `knownVaults` Map、`_preloaded`、`_cliAvailable` 状态变量已删除
- `getKnownVaults()`、`hasPreloaded()`、`isCliAvailable()` 导出函数已删除
- `ensurePreloaded()`、`matchPathToKnownVaults()`、`parseVaultListTable()`、`resolveExplicitVault()`、`resolveVaultPath()` 已删除
- `METADATA_FIELDS` 常量和 `isMetadataField()` 辅助函数已删除
- `grep` 验证确认无残留引用

### ✅ CLI Runner Module

**验证结果**:
- `cli-runner.ts` 文件已删除（`ls` 确认不存在）
- `import { runCli } from "./cli-runner"` 已从 `vault-resolver.ts` 删除

---

## 结构验证

| 检查项 | 结果 |
|--------|------|
| `cli-runner.ts` 不存在 | ✅ |
| `vault-resolver.ts` 仅导出 `resolveVault`, `isInsideVault` | ✅ |
| `search-tool.ts` 不引用已删除函数 | ✅ |
| `index.ts` 无 `session_start` 注册 | ✅ |
| `index.ts` 无 `preloadKnownVaults`/`isInsideVault` import | ✅ |
| TypeScript 无新增编译错误 | ✅（仅原有缺失类型声明） |
| `capabilities.yaml` 无需变更 | ✅ |

## 结论

所有 spec 中的 MODIFIED 和 REMOVED requirements 均已满足。实现范围严格限定在 `.pi/extensions/obsidian-tools/` 内，净删除 ~300 行代码（`cli-runner.ts` ~200 行 + `vault-resolver.ts` 精简 ~100 行 + `index.ts` 精简 ~10 行）。
