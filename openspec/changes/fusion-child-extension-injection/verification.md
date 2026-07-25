# Verification

## 验证结论

**实现完成度**：核心逻辑（§1+§2+§3，10 tasks）全部落地。纯函数 `child-extensions.ts` 有 21 项单元测试覆盖。端到端复现验证通过：`--no-extensions -e <pi-xai> --model grok-build/grok-4.5` 在 headless 模式下 grok-build provider 正确注册并成功推理（流式 thinking_delta 可见）。

集成验证（真实 opinion/fusion 在 pi TUI 中跑通 grok-build builder）留待用户 reload 后执行。

## Spec-to-Implementation Coverage

| Spec Requirement / Scenario | 实现落点 | 证据状态 |
| --- | --- | --- |
| **ADDED: Child Extension Injection** | | |
| Configured extension injected → grok-build provider registered | `fusion-harness.ts` runChild args 段 `for (entry of childExtensionEntries()) args.push("-e", entry)`；`childExtensionEntries()` 读 `fusionSettings().childExtensions` + `resolveChildExtensionEntries` | 端到端复现 ✓ |
| Empty/absent childExtensions → no change | `childExtensionEntries()` 首行 `if (!childExts \|\| length===0) return []` | 单元测试 "undefined/empty → []" ✓ |
| Configured but not installed → skip | `resolveChildExtensionEntries` `packages.find` 匹配失败 → continue | 单元测试 "uninstalled skipped" ✓ |
| Entry path uses package.json pi.extensions[0] or main | `resolveEntryPath` 优先 `pkg.pi.extensions[0]`，fallback `pkg.main` | 单元测试 "pi.extensions preferred / main fallback" ✓ |
| All child roles get injection | runChild 是所有 role 的统一 spawn 路径，注入在函数级 | 代码审查 ✓ |
| **MODIFIED: Settings Configuration Block** | | |
| childExtensions defaults to empty at fork level | `fusionSettings()` 读取时无 childExtensions 键 → `childExtensionEntries()` 返回 `[]` | 单元测试 ✓ |
| childExtensions global default = ["pi-xai"] | capabilities.yaml `global.settings.fusionHarness.childExtensions: ["pi-xai"]` + 全局/项目 settings.json 同步 | 配置回写 ✓ |

## Task-to-Evidence Coverage

| Task | 证据 |
| --- | --- |
| 2.1 fusionSettings 类型扩展 | `fusion-harness.ts` `_fusionSettingsCache` 类型加 `childExtensions?: string[]` |
| 2.2 resolveChildExtensionEntries | `child-extensions.ts`（独立纯函数模块）+ 21 assertions |
| 2.3 进程级缓存 | `fusion-harness.ts` `_childExtEntriesCache: string[] \| null` |
| 2.4 runChild args 注入 | `fusion-harness.ts` args 数组后 `for` 循环追加 `-e` |
| 2.5 纯函数单元测试 | `child-extensions.test.ts`（21 assertions 全过） |
| 3.1 capabilities.yaml | `.pi/capabilities.yaml` global.settings.fusionHarness.childExtensions: ["pi-xai"] |
| 3.2 项目 settings.json | `.pi/settings.json` fusionHarness.childExtensions: ["pi-xai"] |
| 3.3 全局 settings.json | `~/.pi/agent/settings.json` fusionHarness.childExtensions: ["pi-xai"] |

## 关键证据入口

| 证据类型 | 证据路径 | 对应 requirement/task |
| --- | --- | --- |
| 单元测试（21 assertions） | `repo://fusion-harness extensions/fusion-harness/child-extensions.test.ts` | 2.2 / 2.5 |
| 纯逻辑模块 | `repo://fusion-harness extensions/fusion-harness/child-extensions.ts` | ADDED requirement |
| runChild 注入点 | `repo://fusion-harness extensions/fusion-harness/fusion-harness.ts`（args 组装后 for 循环） | ADDED requirement |
| 端到端复现 | `pi --mode json -p --no-extensions -e <pi-xai-entry> --model grok-build/grok-4.5` → provider 正确注册 + 流式推理 | ADDED scenario 1 |
| 对照实验（根因） | `pi -p --no-extensions --model grok-build/grok-4.5` → Model not found（无 -e 注入） | 根因证据 |

## 缺口与阻塞项

### 缺口 1：TUI 集成验证（待用户 reload + 跑 opinion）

代码已改 + 配置已写，但 fusion-harness 扩展需要 `/reload` 才能加载新代码。用户 reload 后跑 `/opinion "<话题>"`，确认 builder（grok-build）不再报 Model not found。

**验证清单**：
- `/opinion` 两个 worker 都成功（architect kimi + builder grok）
- 无 "No models match pattern grok-build" warning
- builder 有实际产出（非 FAILED）

**修复记录（2026-07-25）**：首次 TUI 集成暴露一个作用域 bug——`childExtensionEntries` 原定义在 activate 函数内，而调用方 `runChild` 是模块级函数，导致 `childExtensionEntries is not defined`。已修复：将 `childExtensionEntries` + `_childExtEntriesCache` 提升到模块级（import 之后、runChild 之前），调用处改传 `opts.cwd`。修复后用户 reload 再跑 opinion，grok-build builder 成功推理——集成验证 PASS。

### 缺口 2：writeback 执行（阻塞 archive）

fork commit/tag/push + manifest 更新需用户确认（见 writeback.md）。
