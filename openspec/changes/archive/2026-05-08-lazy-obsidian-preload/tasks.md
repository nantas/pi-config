# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界（`obsidian-tools-lazy-preload`：三个 modified requirements）
- [x] 1.2 确认依赖前置条件与外部协作项（无外部依赖，仅修改 `.pi/extensions/obsidian-tools/` 内 3 个文件）

## 2. 核心实现任务

- [x] 2.1 在 `vault-resolver.ts` 中新增 `isInsideVault(cwd: string): boolean` 函数
  - Spec 覆盖: `conditional-preload-on-session-start`
  - 实现: 复用 resolveVaultFromCwd 的 `.obsidian/` walk-up 逻辑，仅返回 boolean
  - 验证: 传入 vault 路径返回 true，传入非 vault 路径返回 false

- [x] 2.2 在 `vault-resolver.ts` 中新增 `ensurePreloaded()` 函数
  - Spec 覆盖: `lazy-preload-on-first-tool-call`
  - 实现: 检查 `_preloaded` 标志，未加载时调用 `preloadKnownVaults()`
  - 验证: 首次调用触发 preload，后续调用跳过

- [x] 2.3 修改 `index.ts` 中 `session_start` handler，添加 vault 检测条件
  - Spec 覆盖: `conditional-preload-on-session-start`
  - 实现: `if (isInsideVault(process.cwd())) { await preloadKnownVaults(); }`
  - 验证: 非 vault 项目启动 pi 时不触发 Obsidian CLI

- [x] 2.4 在 `search-tool.ts` 工具 handler 中集成 `ensurePreloaded()`
  - Spec 覆盖: `lazy-preload-on-first-tool-call`
  - 实现: 在执行搜索前调用 `await ensurePreloaded()`
  - 验证: 非 vault 环境首次调用 obsidian_search 时能正确加载 vault 列表

- [x] 2.5 在 `raw-tool.ts` 工具 handler 中集成 `ensurePreloaded()`
  - Spec 覆盖: `lazy-preload-on-first-tool-call`
  - 实现: 在执行 CLI 命令前调用 `await ensurePreloaded()`
  - 验证: 非 vault 环境首次调用 obsidian_cli 时能正确加载 vault 列表

## 3. 收敛与验证准备

- [x] 3.1 验证 scenario 覆盖：确认每个 spec scenario 都有对应验证手段
  - `session starts inside vault` → `isInsideVault()` 返回 true → session_start 触发 preload ✓
  - `session starts outside vault` → `isInsideVault()` 返回 false → session_start 跳过 preload ✓
  - `first tool call triggers lazy preload` → `ensurePreloaded()` 检查 `_preloaded`，首次调用触发 preload ✓
  - `subsequent tool calls skip preload` → `_preloaded=true` 守卫跳过 ✓
  - `preload fails + explicit vault` → `resolveExplicitVault` 兜底 accept vault as-is ✓
  - `preload fails + CWD in vault` → `resolveVaultFromCwd` 的 `.obsidian/` walk-up 检测 ✓
  - `preload fails + outside vault` → `resolveVaultFromCwd` 抛出错误 ✓

- [x] 3.2 标记需要进入 writeback 的摘要与状态变更（本 change 无外部回写目标，此步骤为 N/A）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md
- [x] 4.2 确认无外部回写目标，记录验证结论即可
