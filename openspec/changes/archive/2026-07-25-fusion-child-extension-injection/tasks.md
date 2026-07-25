# Tasks

## 1. Spec 覆盖与实现准备

- [x]1.1 确认 `specs/fusion-harness-integration/spec.md` 的 ADDED（Child Extension Injection，5 scenario）与 MODIFIED（Settings Configuration Block，+2 scenario）有对应实现落点
- [x]1.2 确认 fork clone 在 `feat/merge-existing` 分支（与 merge-existing 累积），working tree 状态可继续叠加改动

## 2. 核心实现任务

实现目标：`repo://fusion-harness extensions/fusion-harness/fusion-harness.ts` 的 runChild + fusionSettings。

- [x]2.1 **扩展 fusionSettings 类型**：`_fusionSettingsCache` 类型加 `childExtensions?: string[]`；读取时透传该字段。
- [x]2.2 **新增扩展路径解析函数**：`resolveChildExtensionEntries(childExts, agentHome): string[]`——合并读项目级 `.pi/settings.json` + 全局 `~/.pi/agent/settings.json` 的 packages；对每个 childExt 取 source 最后一段匹配；解析 git/npm 安装目录；读 package.json 的 `pi.extensions[0]` 或 `main`；返回 existsSync 校验过的绝对入口路径列表。未匹配/不存在/不可读的静默跳过。验证：输入 `["pi-xai"]` → 返回 `["<abs>/index.ts"]`。
- [x]2.3 **进程级缓存**：`_childExtEntriesCache: string[] | null`，首次解析后缓存，避免每次 spawn 重算。
- [x]2.4 **runChild args 注入**：在 args 数组的 `--no-extensions` 之后，遍历 `resolveChildExtensionEntries()` 结果追加 `args.push("-e", entryPath)`。验证：childExtensions 配置 `["pi-xai"]` 时，spawn 命令含 `-e <abs>/pi-xai/index.ts`。
- [x]2.5 **纯函数单元测试**：为 `resolveChildExtensionEntries` 写合成夹具测试（临时 settings.json + 临时扩展目录 + package.json），验证匹配/解析/跳过/入口优先级。

## 3. 配置回写

- [x]3.1 pi-config `.pi/capabilities.yaml`：`global.settings.fusionHarness` 追加 `childExtensions: ["pi-xai"]`
- [x]3.2 pi-config `.pi/settings.json`：`fusionHarness` 块追加 `childExtensions: ["pi-xai"]`（项目级）
- [x]3.3 全局 `~/.pi/agent/settings.json`：若 fusionHarness 块存在，追加 `childExtensions: ["pi-xai"]`（交用户确认后执行，遵循 global sync 约定）

## 4. 验证与回写收敛

- [x]4.1 生成 verification.md：覆盖 5 个 ADDED scenario + 2 个 MODIFIED scenario（含对照实验：`--no-extensions` 无注入 vs 有注入 vs 未安装跳过）
- [x]4.2 生成 writeback.md：回写目标 = fork 代码 + manifest v0.2.1 + capabilities.yaml + settings.json
- [x]4.3 执行 writeback：fork commit（与 merge-existing 同分支或紧邻 commit）→ manifest 更新 → capabilities.yaml/settings.json 更新 → 全局 sync 交用户确认
